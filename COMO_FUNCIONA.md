# Como o CodeCompass funciona

Este documento explica a arquitetura interna, os fluxos de dados e as decisões técnicas do CodeCompass para quem quer entender o sistema por dentro — não apenas usá-lo.

---

## Visão geral

O CodeCompass é um sistema de **onboarding assistido por IA** que responde perguntas sobre codebases desconhecidas. O fluxo central é:

```
Repositório Git
      ↓ (1) clone + parse
  Chunks de código
      ↓ (2) embeddings
  Vetores semânticos (ChromaDB)
      ↓ (3) busca por similaridade
  Contexto relevante
      ↓ (4) RAG prompt
  LLM (Abacus / OpenAI / Anthropic)
      ↓ (5) resposta
  Usuário
```

---

## Arquitetura: Hexagonal (Ports & Adapters)

O backend segue a **Arquitetura Hexagonal** — o núcleo de negócio não conhece frameworks ou bancos de dados. A comunicação com o exterior acontece exclusivamente por interfaces (Ports).

```
┌─────────────────────────────────────────────┐
│                BACKEND                      │
│  ┌─────────────────────────────────────┐   │
│  │         DOMÍNIO (Services)          │   │
│  │  chat_service, repo_service,        │   │
│  │  tour_service, metrics_service...   │   │
│  └──────────────┬──────────────────────┘   │
│                 │ usa Ports (Protocol)       │
│  ┌──────────────▼──────────────────────┐   │
│  │       INFRASTRUCTURE (Adapters)     │   │
│  │  postgres_adapter, chroma_adapter,  │   │
│  │  llm_client, git_client,            │   │
│  │  embedding_service...               │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Controllers (FastAPI routers)              │
│  → recebem HTTP, chamam Services            │
└─────────────────────────────────────────────┘
```

**Por que Hexagonal?**
- Troca o banco de dados sem tocar na lógica de negócio (PostgreSQL ↔ in-memory)
- Testa serviços com mocks sem iniciar Docker
- Cada dependência externa pode falhar graciosamente com um adapter de fallback

---

## Fluxo 1 — Indexação de repositório

```
POST /api/repos/index
    │
    ├─ FastAPI retorna 202 imediatamente (BackgroundTasks)
    │
    └─ Em background:
         ↓
    git clone <url>            (GitPython)
         ↓
    walk de arquivos           (filtro por extensão: 15 linguagens)
         ↓
    parse AST (tree-sitter)   ─── fallback: texto bruto
         ↓
    chunking semântico         (funções/classes como chunks, ~80 linhas, overlap 20)
         ↓
    embedding em batch         (OpenAI text-embedding-3-small ou local)
         ↓ (ThreadPoolExecutor, 4 workers paralelos)
    upsert no ChromaDB         (coleção: codecompass_<repo_id>_code)
         ↓
    salva metadados            (PostgreSQL: repo_id, status, chunks_count, etc.)
```

**Por que BackgroundTasks?** A indexação de um repositório grande leva dezenas de segundos. Retornar 202 imediatamente permite que o cliente faça polling em `GET /api/repos/{id}` e acompanhe o progresso sem timeout.

**Por que ThreadPoolExecutor?** As chamadas à OpenAI Embeddings API são I/O-bound — o GIL do Python não impede concorrência real em operações de rede. Com 4 workers, o throughput foi de 220s → 11.8s para 2825 chunks (18.7x mais rápido).

---

## Fluxo 2 — Chat RAG

```
POST /api/chat/ask
    │
    ├─ Recebe: { repository_id, question }
    │
    ├─ EmbeddingService.embed([question])
    │       → vetor semântico da pergunta (1536 dim)
    │
    ├─ ChromaDB.query(vetor, n_results=5)
    │       → 5 chunks de código mais similares
    │
    ├─ Monta prompt:
    │       SYSTEM: "Você é um assistente de onboarding..."
    │       USER:   "Pergunta: {question}\n\nContexto:\n{chunks}"
    │
    ├─ LlmClient.generate_answer(question, chunks)
    │       → Abacus AI / OpenAI / Anthropic
    │
    └─ Retorna: { answer, sources: [{ file_path, start_line, chunk_id }] }
```

**RAG (Retrieval-Augmented Generation):** Em vez de enviar o repositório inteiro para o LLM (impossível — janela de contexto limitada), recuperamos apenas os 5 chunks mais relevantes para a pergunta. O modelo responde com base nesse contexto injetado.

---

## Fluxo 3 — Tour Guiado

O tour identifica automaticamente os arquivos mais importantes para um novo desenvolvedor entender:

```
POST /api/tours/generate
    │
    ├─ Analisa todos os arquivos do repositório:
    │       - complexidade ciclomática (radon)
    │       - churn (frequência de commits)
    │       - acoplamento (número de imports recebidos)
    │
    ├─ Ranqueia módulos por score combinado
    │
    ├─ Para os Top-N módulos:
    │       - Gera explicação via LLM (RAG com o próprio arquivo)
    │       - Cria step do tour: { title, file, explanation, why_important }
    │
    └─ Salva tour no PostgreSQL e retorna passos
```

---

## Fluxo 4 — Grafo de Dependências

```
GET /api/graph/{repository_id}
    │
    ├─ DependencyGraphService analisa imports de cada arquivo
    │       Python: import x, from x import y
    │       TypeScript: import { } from '...'
    │       etc.
    │
    ├─ Constrói grafo: nós = módulos, arestas = dependências
    │
    └─ Retorna: { nodes: [{ id, label, metrics }], edges: [{ source, target }] }
```

---

## Providers de LLM

O `LlmClient` suporta múltiplos providers sem alterar a interface:

| Provider | Env var | Modelos exemplo |
|---|---|---|
| **Abacus AI** | `LLM_PROVIDER=abacus` | `CLAUDE_V3_5_SONNET`, `CLAUDE_V4_5_SONNET`, `GPT4_O` |
| **OpenAI** | `LLM_PROVIDER=openai` | `gpt-4o`, `gpt-4-turbo` |
| **Anthropic** | `LLM_PROVIDER=anthropic` | `claude-3-5-sonnet-20241022` |

O provider é selecionado via `LLM_PROVIDER` no `.env` — nenhuma mudança de código necessária.

---

## Providers de Embeddings

| Modo | Env var | Modelo | Dimensão | Velocidade |
|---|---|---|---|---|
| **Local (CPU)** | `EMBEDDING_PROVIDER=local` | `all-MiniLM-L6-v2` | 384 | ~220s / 2800 chunks |
| **OpenAI** | `EMBEDDING_PROVIDER=openai` | `text-embedding-3-small` | 1536 | ~11.8s / 2800 chunks |

A diferença de velocidade (18.7x) se deve ao processamento paralelo com `ThreadPoolExecutor` nas chamadas à API OpenAI.

---

## Linguagens suportadas

O `language_registry.py` registra parsers tree-sitter para 15 linguagens:

| Grupo | Linguagens |
|---|---|
| Web / Scripts | JavaScript, TypeScript, Python, PHP, Shell/Bash |
| Systems | C, C++, Rust, Go |
| Enterprise | Java, C#, Kotlin, Scala |
| Mobile | Swift (fallback texto — sem tree-sitter no PyPI) |
| Outros | Ruby |

---

## Estrutura de diretórios

```
if1015-es-com-ia-2026-1/
├── .env.example              ← Variáveis de ambiente (sem valores reais)
├── docker-compose.yml        ← Orquestra 4 containers
├── backend/
│   ├── app/
│   │   ├── main.py           ← Entry point FastAPI
│   │   ├── ports.py          ← Interfaces (Protocol) — Dependency Inversion
│   │   ├── dependencies.py   ← Container DI via FastAPI Depends
│   │   ├── controllers/      ← 11 routers HTTP
│   │   │   ├── auth_controller.py
│   │   │   ├── chat_controller.py
│   │   │   ├── repo_controller.py
│   │   │   ├── tour_controller.py
│   │   │   ├── dependency_graph_controller.py
│   │   │   ├── history_controller.py
│   │   │   ├── metrics_controller.py
│   │   │   ├── ops_controller.py
│   │   │   ├── health_controller.py
│   │   │   ├── admin_controller.py
│   │   │   ├── watchlist_controller.py
│   │   │   └── webhook_controller.py
│   │   ├── services/         ← 22 serviços de negócio (sem deps externas)
│   │   │   ├── chat_service.py
│   │   │   ├── repo_service.py
│   │   │   ├── ingestion_service.py
│   │   │   ├── embedding_service.py
│   │   │   ├── retrieval_service.py
│   │   │   ├── chunking_service.py
│   │   │   ├── tour_service.py
│   │   │   ├── dependency_graph_service.py
│   │   │   ├── architecture_drift_service.py
│   │   │   ├── commit_history_service.py
│   │   │   ├── metrics_aggregation_service.py
│   │   │   ├── notification_service.py
│   │   │   └── ... (outros)
│   │   └── infrastructure/   ← Adaptadores externos
│   │       ├── settings.py
│   │       ├── llm_client.py
│   │       ├── postgres_adapter.py
│   │       ├── chroma_adapter.py
│   │       ├── git_client.py
│   │       ├── audit_repository.py
│   │       ├── webhook_repository.py
│   │       ├── watchlist_repository.py
│   │       └── ... (outros)
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
├── frontend/
│   └── src/
│       ├── App.tsx           ← Layout: header + sidebar + main
│       ├── components/
│       │   ├── tabs/         ← Uma aba por funcionalidade
│       │   └── ui/           ← Primitivos (Card, Badge, Spinner...)
│       └── services/         ← Clientes HTTP
└── scripts/
    └── run_tests.py          ← Runner completo de testes
```

---

## Frontend — arquitetura

O frontend é uma **SPA React** com navegação por sidebar lateral:

```
App.tsx
├── <header>         ← Logo, badge de repo, toggle dark mode, auth
├── <aside>          ← Sidebar colapsável (w-52 ↔ w-14)
│   └── TABS.map()  ← Cada aba: ícone + label
└── <main>           ← Conteúdo da aba ativa
    ├── RepoTab      → indexação + status
    ├── ChatTab      → chat RAG com Markdown + VS Code blocks
    ├── TourTab      → tour guiado passo a passo
    ├── GraphTab     → grafo de dependências
    ├── HistoryTab   → timeline de commits
    ├── MetricsTab   → dashboard de qualidade
    ├── OpsTab       → health + operacional
    ├── DriftTab     → detecção de drift arquitetural + interpretação IA
    ├── WatchlistTab → subscrição a módulos para notificações
    └── AdminTab     → painel admin (usuários, planos, uso, auditoria, webhooks)
```

**Dark mode:** Tailwind `darkMode: 'class'` — ao ativar, adiciona `dark` ao `<html>`. Todos os componentes usam pares de classes como `bg-white dark:bg-gray-800`.

---

## Fluxo 5 — Detecção de Drift Arquitetural

```
GET /api/repos/{id}/graph/snapshots
    → lista de SnapshotMeta: { id, created_at, nodes_count, edges_count }

GET /api/repos/{id}/graph/diff?snapshot_a=X&snapshot_b=Y
    │
    ├─ ArchitectureDriftService.compare(snapshot_a, snapshot_b)
    │       → calcula set difference de nós e arestas
    │       → drift_score = (added + removed) / total_elements * 100
    │
    └─ Retorna: DriftReport {
           drift_score, added_nodes, removed_nodes,
           added_edges, removed_edges, node_changes[], edge_changes[]
       }

POST /api/repos/{id}/graph/diff/interpret
    │
    ├─ Computa diff (mesma lógica acima)
    ├─ Monta pseudo-chunk com estatísticas do diff
    ├─ LlmClient.generate_answer(prompt de interpretação)
    └─ Retorna: { interpretation: string } — em português
```

**Como os snapshots são criados:** A cada re-indexação bem-sucedida, `ingestion_service.py` salva o estado atual do grafo no PostgreSQL com timestamp. Snapshots podem ser selecionados por data no `DriftTab.tsx` via `closestSnapshot(dateStr)`.

---

## Fluxo 6 — Webhooks GitHub

```
POST /api/webhooks/github/{webhook_id}
    │
    ├─ Recebe: headers X-Hub-Signature-256 + body JSON
    │
    ├─ WebhookRepository.get(webhook_id)
    │       → recupera record com secret HMAC
    │
    ├─ Verificação HMAC-SHA256:
    │       hmac.new(secret.encode(), body, sha256).hexdigest()
    │       hmac.compare_digest(expected, received)  ← timing-safe
    │       → 401 se inválido
    │
    ├─ Filtra eventos: apenas "push" com ref matching branch configurada
    │
    ├─ WebhookRepository.touch(webhook_id) → atualiza last_triggered_at
    │
    └─ RepoService.trigger_reindex(repository_id) → dispara indexação em background
```

**Segurança:** O segredo HMAC é gerado com `secrets.token_hex(32)` (256 bits) e retornado **apenas na criação** — não é possível recuperá-lo depois. O `hmac.compare_digest()` evita timing attacks.

---

## Fluxo 7 — Watchlist e Notificações

```
POST /api/repos/{id}/watch  { module_path: "app/services" }
    │
    └─ WatchlistRepository.watch(user_id, repo_id, module_path)
           → INSERT com UNIQUE constraint (evita duplicatas)

# Durante re-indexação:
NotificationService.notify_on_reindex(repo_id, old_graph, new_graph)
    │
    ├─ Detecta módulos com mudanças (set difference de nós/arestas)
    │
    ├─ WatchlistRepository.list_for_repo(repo_id)
    │       → todos os subscribers do repositório
    │
    ├─ Para cada módulo alterado, filtra subscribers do módulo
    │
    └─ EmailGateway.send(subscriber_email, "Mudança detectada em {module_path}")
```

---

## Fluxo 8 — Audit Log Automático

```
# Middleware em main.py — executa após CADA resposta bem-sucedida
async def audit_middleware(request, call_next):
    │
    ├─ response = await call_next(request)
    │
    ├─ Se método em {POST, PATCH, PUT, DELETE}
    │   AND response.status_code < 400
    │   AND path NÃO em {/health, /api/chat/ask, /api/webhooks}:
    │
    │       AuditRepository.record(
    │           user_id   = JWT claim "sub"
    │           user_email = JWT claim "email"
    │           action    = "{METHOD} {path}"
    │           resource_type = primeiro segmento do path
    │           ip        = request.client.host
    │           timestamp = datetime.utcnow()
    │       )
    │
    └─ return response (sem modificar)
```

**Por que excluir `/api/chat/ask`?** Perguntas do chat são volume alto e não representam mutações de recurso — incluí-las inflaria o audit log desnecessariamente.

---

---

## Segurança

| Aspecto | Implementação |
|---|---|
| Senhas de usuário | Hashing bcrypt via `auth_service.py` — nunca armazenadas em texto plano |
| Chaves de API | Exclusivamente via variáveis de ambiente (nunca hardcoded) |
| Autenticação JWT | Bearer token em todas as chamadas HTTP — injetado globalmente via `bearerHeaders()` no `http.ts` |
| Verificação de webhooks | HMAC-SHA256 com `hmac.compare_digest()` (timing-safe) — segredo retornado apenas na criação |
| Segredos HMAC | Gerados com `secrets.token_hex(32)` (256 bits de entropia) |
| Admin seed | `ADMIN_PASSWORD` obrigatória no `.env` — sem senha padrão |
| PostgreSQL | `POSTGRES_PASSWORD` obrigatória — sem senha padrão |
| `.env` no git | Protegido por `.gitignore` (linha 69) |
| Tokens de sessão | UUID v4 gerados pelo servidor, sem informação no cliente |

---

## Decisões arquiteturais notáveis

| Decisão | Motivo |
|---|---|
| In-memory fallback em todos os adapters | Desenvolvimento e testes sem Docker |
| BackgroundTasks para indexação | Evita timeout HTTP em repos grandes |
| ThreadPoolExecutor para embeddings | I/O-bound paralelo sem Celery |
| `OPENAI_API_KEY` separada de `LLM_API_KEY` | Permite usar Abacus para LLM e OpenAI para embeddings simultaneamente |
| Sem `tree-sitter-swift` no PyPI | Versão compatível (>=0.23.0) não existe — mantido como fallback texto no registry |
