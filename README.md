# IF1015 — TASI 6 · Engenharia de Software com IA · 2026-1

Repositório dedicado à disciplina do Centro de Informática da UFPE — **IF1015 Engenharia de Software com IA** (Tópicos Avançados em SI 6), turma de Sistemas de Informação, professor **Vinicius Cardoso Garcia**.

---

## CodeCompass — Onboarding Inteligente em Codebases Legados

**Equipe:** CodeCompass

| Membro                            | E-mail           |
| --------------------------------- | ---------------- |
| Victor Barros de Miranda Neves    | vbmn@cin.ufpe.br |
| Vinicius Henrique Silva           | vhs@cin.ufpe.br  |
| Alexandre de Souza Cabral         | asc5@cin.ufpe.br |
| Arthur Luis de Farias Alves       | alfa@cin.ufpe.br |
| Getulio Junqueira de Queiroz Lima | gjql@cin.ufpe.br |
| Carlos Henrique da Silva Frey     | chsf@cin.ufpe.br |

---

## Sobre o projeto

**CodeCompass** é um assistente conversacional de onboarding que ajuda desenvolvedores novos a entender uma codebase legada de forma guiada e contextualizada. O sistema indexa repositórios Git, extrai embeddings semânticos do código-fonte e do histórico de commits, e fornece uma interface web para chat, tours guiados, grafo de dependências e análise de métricas.

Captura de tela fase MVP

<img width="1402" height="697" alt="image" src="https://github.com/user-attachments/assets/37b86ac0-b3a1-43fc-a00c-914fb198ae99" />

Captura de tela da fase Atual

<img width="1714" height="949" alt="image" src="https://github.com/user-attachments/assets/3c985d74-a82c-47b1-b06f-60f48b6305d6" />





---

## Funcionalidades implementadas

| Funcionalidade                    | Fase | Descrição                                                                                                                                               |
| --------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Indexação de repositório**      | 1    | Clona repositórios Git (URL remota ou path local), faz chunking do código-fonte com tree-sitter (15 linguagens), gera embeddings e armazena no ChromaDB |
| **Chat RAG**                      | 1    | Interface conversacional com RAG, respostas via LLM, renderização Markdown com blocos de código estilo VS Code                                          |
| **Tour guiado**                   | 1    | Gera automaticamente walkthroughs dos módulos mais importantes ranqueados por complexidade ciclomática, churn e acoplamento                             |
| **Grafo de dependências**         | 1    | Analisa imports/dependências entre módulos e expõe grafo interativo com métricas de grau por nó                                                         |
| **Análise de Impacto**            | 1    | Identifica módulos afetados por uma mudança num arquivo específico, propagando o impacto no grafo                                                       |
| **Busca Semântica**               | 1    | Busca por similaridade semântica em código indexado, retornando chunks ranqueados por relevância                                                        |
| **Histórico de commits**          | 1    | Timeline de commits por módulo com explicações geradas por IA e endpoint "Por que?" para decisões arquiteturais                                         |
| **Métricas de qualidade**         | 1    | Coleta métricas de complexidade, churn e acoplamento; gera relatório de qualidade com feedback via LLM                                                  |
| **Autenticação e sessões**        | 1    | Signup/signin com hashing seguro de senha, tokens JWT, checkpoints de progresso de onboarding, verificação de e-mail, reset de senha                    |
| **Observabilidade**               | 1    | Logging estruturado, rastreamento por correlation ID, coleta de latência/erros, endpoints de liveness e readiness                                       |
| **Dark mode**                     | 1    | Tema claro/escuro persistido em localStorage, ativado via Tailwind CSS `dark:` classes                                                                  |
| **Sidebar colapsável**            | 1    | Navegação lateral retrátil (estilo ChatLLM) com ícones + labels, botão de recolher/expandir                                                             |
| **Mapa de Hotspots**              | 2    | Identifica arquivos de maior risco (combinação de churn alto + complexidade alta), exibe heatmap visual                                                 |
| **Saúde do Repositório**          | 2    | Dashboard admin com status de indexação, métricas e alertas por repositório                                                                             |
| **Avaliação LLM**                 | 2    | Sistema de feedback por resposta do chat (👍/👎), painel admin com análise de qualidade das respostas                                                   |
| **Dashboard de Uso**              | 2    | Métricas de utilização por usuário, repositório e período; gráficos de tendência                                                                        |
| **Análise de Branch**             | 2    | Compara uma feature branch com a base, lista arquivos alterados, calcula risk score e gera resumo por LLM                                               |
| **Gerador de Documentação**       | 2    | Gera README.md detalhado para um módulo usando chunks indexados + histórico de commits, via LLM                                                         |
| **Score de Dívida Técnica**       | 3    | Registra snapshots históricos de hotspot médio por re-indexação, exibe curva de evolução da dívida técnica                                              |
| **Monitor de Custo LLM**          | 3    | Rastreia tokens consumidos e custo estimado por chamada ao LLM, com agrupamento por provedor e dia                                                      |
| **Fila de Ingestão**              | 3    | Painel em tempo real do progresso de indexação de repositórios, com auto-refresh e barra de progresso                                                   |
| **Gerenciamento de Planos**       | 3    | CRUD de limites de plano (free/paid/enterprise): max repos, max perguntas, permissão de deleção                                                         |
| **Exportar Relatório**            | 3    | Gera e baixa relatório PDF/JSON do repositório com métricas, dívida técnica e hotspots                                                                  |
| **Detecção de Drift Arquitetural**| 4    | Compara dois snapshots do grafo de dependências e mede o percentual de mudança estrutural (drift score), com interpretação via LLM e seleção por data   |
| **Audit Log**                     | 4    | Registra automaticamente todas as ações POST/PATCH/DELETE com user, IP e recurso; painel admin com filtros                                              |
| **Webhooks GitHub**               | 4    | Recebe push events do GitHub via HMAC-SHA256, dispara re-indexação automática do repositório                                                            |
| **Watchlist / Notificações**      | 4    | Usuários subscrevem módulos; recebem e-mail ao detectar mudança estrutural durante re-indexação                                                         |

---

## Arquitetura

O backend segue **Arquitetura Hexagonal** (Ports & Adapters) com injeção de dependência via `FastAPI.Depends`, respeitando princípios SOLID, KISS, DRY e YAGNI.

```
[Usuário] → [Frontend React/Vite :5173]
                      ↓
          [API Backend FastAPI :8000]
                ↓         ↓         ↓
       [GitPython]   [ChromaDB]  [LLM Client]
            ↓         [RAG]      [OpenAI API]
      [Repositório]      ↑
                  [sentence-transformers]
                         ↓
                    [PostgreSQL :5432]
```

### Backend — camadas

```
app/
├── ports.py            # Interfaces (Protocol) — Dependency Inversion
├── dependencies.py     # Container DI — FastAPI Depends
├── controllers/        # Handlers HTTP (9 routers)
├── services/           # Lógica de negócio
└── infrastructure/     # Adaptadores externos (Postgres, Chroma, Git, LLM)
```

### Controllers (endpoints)

| Router                          | Prefixo                 | Responsabilidade                                          |
| ------------------------------- | ----------------------- | --------------------------------------------------------- |
| `health_controller`             | `/api/health`           | Status da aplicação                                       |
| `auth_controller`               | `/api/auth`             | Signup, signin, sessões de onboarding, reset de senha     |
| `repo_controller`               | `/api/repos`            | Indexação e status de repositórios                        |
| `chat_controller`               | `/api/chat`             | Perguntas RAG sobre o repositório                         |
| `tour_controller`               | `/api/tours`            | Geração e listagem de tours guiados                       |
| `dependency_graph_controller`   | `/api/repos/{id}/graph` | Grafo de dependências, snapshots e diff arquitetural      |
| `history_controller`            | `/api/repos/{id}/history` | Timeline de commits e explicações "Por quê?"            |
| `metrics_controller`            | `/api/repos/{id}/metrics` | Coleta de métricas e relatório de qualidade             |
| `ops_controller`                | `/api/ops`              | Liveness, readiness e resumo operacional                  |
| `admin_controller`              | `/api/admin`            | Gestão de usuários, planos, saúde, custos LLM, audit log  |
| `watchlist_controller`          | `/api/repos/{id}/watch` | Subscrição a módulos para notificações por e-mail         |
| `webhook_controller`            | `/api/admin/webhooks`   | CRUD de webhooks e receiver de push events GitHub         |
| `tour_controller`             | `/api/tours`   | Geração e listagem de tours guiados          |
| `dependency_graph_controller` | `/api/graph`   | Grafo de dependências e detalhes de módulo   |
| `history_controller`          | `/api/history` | Timeline de commits e explicações "Por quê?" |
| `metrics_controller`          | `/api/metrics` | Coleta de métricas e relatório de qualidade  |
| `ops_controller`              | `/api/ops`     | Liveness, readiness e resumo operacional     |

---

## Stack tecnológica

### Backend

- **Python 3.11+** · **FastAPI 0.115** · **Uvicorn**
- **ChromaDB 0.5** — vector store para embeddings
- **PostgreSQL 16** — metadados de repositórios, usuários e sessões
- **OpenAI `text-embedding-3-small`** (1536 dim) via `OPENAI_API_KEY` — padrão de produção
- **sentence-transformers `all-MiniLM-L6-v2`** (384 dim) — fallback local sem chave
- **tree-sitter** — parsing AST de 15 linguagens (Python, JS, TS, Java, Go, Rust, C, C++, C#, Ruby, PHP, Kotlin, Scala, Shell/Bash + Swift fallback texto)
- **GitPython 3.1** — clone e análise de repositórios
- **radon 6.0** — métricas de complexidade ciclomática
- **Abacus AI SDK / OpenAI SDK 1.59** — integração multi-provider com LLM

### Frontend

- **React 18** · **TypeScript 5.8** · **Vite 6**
- **Tailwind CSS** (CDN Play) com `dark:` classes e `darkMode: 'class'`
- **react-syntax-highlighter** — blocos de código com tema `vscDarkPlus` estilo VS Code
- **Vitest 3** · **@testing-library/react**
- Sidebar lateral colapsável + dark mode persistido em `localStorage`

### Infraestrutura

- **Docker Compose** — orquestra todos os serviços
- Serviços: `postgres`, `chroma`, `backend`, `frontend`

---

## Como executar

### Com Docker Compose (recomendado)

```bash
# 1. Copie o arquivo de exemplo e configure suas credenciais
cp .env.example .env
# Edite .env com suas chaves (LLM_API_KEY, OPENAI_API_KEY, POSTGRES_PASSWORD, ADMIN_PASSWORD)

# 2. Suba todos os serviços
docker compose up --build
```

| Serviço                    | URL                        |
| -------------------------- | -------------------------- |
| Frontend                   | http://localhost:5173      |
| Backend API                | http://localhost:8000      |
| Docs interativos (Swagger) | http://localhost:8000/docs |
| ChromaDB                   | http://localhost:8001      |

### Desenvolvimento local

```bash
# Backend
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

### Variáveis de ambiente

| Variável                | Descrição                                         | Padrão             |
| ----------------------- | ------------------------------------------------- | ------------------ |
| `POSTGRES_PASSWORD`     | Senha do PostgreSQL (**obrigatória**)             | —                  |
| `ADMIN_EMAIL`           | E-mail do usuário admin seed                      | `admin`            |
| `ADMIN_PASSWORD`        | Senha do admin (**obrigatória**)                  | —                  |
| `LLM_PROVIDER`          | Provider do LLM (`abacus`\|`openai`\|`anthropic`) | `abacus`           |
| `LLM_API_KEY`           | Chave de API do LLM                               | —                  |
| `LLM_MODEL`             | Modelo LLM (ex: `CLAUDE_V3_5_SONNET`)             | —                  |
| `OPENAI_API_KEY`        | Chave OpenAI para embeddings                      | —                  |
| `EMBEDDING_PROVIDER`    | Provider de embeddings (`local`\|`openai`)        | `local`            |
| `EMBEDDING_MODEL`       | Modelo de embeddings                              | `all-MiniLM-L6-v2` |
| `EMBEDDING_DIM`         | Dimensão dos embeddings                           | `384`              |
| `EMBEDDING_MAX_WORKERS` | Workers paralelos (OpenAI)                        | `4`                |
| `ALLOW_LOCAL_REPOS`     | Permite clonar paths locais                       | `true`             |

> Veja [.env.example](.env.example) para a lista completa com comentários.

---

## Testes

```bash
# Todos os testes (unit + integration + e2e + frontend)
python scripts/run_tests.py

# Apenas unit tests
pytest backend/tests/unit

# Apenas integration tests
pytest backend/tests/integration

# Apenas e2e tests
pytest backend/tests/e2e

# Frontend
npm --prefix frontend test
```

### Cobertura de testes

| Camada          | Arquivos                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Unit**        | `auth_service`, `repo_service`, `tour_service`, `dependency_graph`, `commit_history`, `health_service`, `metrics_service`, `observability` |
| **Integration** | `auth_api`, `repo_api`, `tour_api`, `dependency_graph_api`, `history_api`, `metrics_api`, `ops_api`, `health`                              |
| **E2E**         | `index_chat`, `tour`, `dependency_graph`, `history`                                                                                        |
| **Frontend**    | `App.test.tsx` (Vitest)                                                                                                                    |

---

## Fases de desenvolvimento

| Fase | Período | Features entregues |
|------|---------|-------------------|
| **Fase 1** — Exposição | Aulas 14-20 | Foundation, RAG/Chat, Tour, Grafo, Impacto, Busca Semântica, Histórico, Métricas, Auth, Observabilidade |
| **Fase 2** — Composição | Aulas 21-24 | Hotspots, Saúde do Repo, Avaliação LLM, Dashboard de Uso, Análise de Branch, Gerador de Docs; otimização de embeddings (18.7x) |
| **Fase 3** — Ensaio | Aulas 25-29 | Score de Dívida Técnica, Monitor de Custo LLM, Fila de Ingestão, Planos, Exportar Relatório; dark mode, sidebar, VS Code code blocks |
| **Fase 4** — Ressonância | Aulas 30-32 | Drift Arquitetural + IA, Audit Log, Webhooks GitHub, Watchlist/Notificações |

---

## Uso de IA no desenvolvimento

O projeto foi desenvolvido com assistência extensiva do **GitHub Copilot Agent Mode** (modelo **Claude Sonnet 4.6**) via VS Code, complementado por **ChatLLM** (Claude Opus 4) nas fases iniciais.

| Fase | Tokens entrada (est.) | Tokens saída (est.) | Custo IA (USD) | Razão economicidade |
|------|----------------------|--------------------|-----------------|--------------------|
| Pré-proposta | ~30.000 | ~57.000 | ~$1.08 | 7.1x |
| Fase 1 (Exposição) | ~186.000 | ~266.000 | ~$22.74 | 14.2x |
| Fase 2 (Composição) | ~88.000 | ~65.000 | ~$1.11 | 6.2x |
| Fase 3 (Ensaio) | ~92.000 | ~84.000 | ~$1.56 | 8.4x |
| Fase 4 (Ressonância) | ~310.000 | ~180.000 | ~$5.25 | 11.8x |
| **Total** | **~706.000** | **~652.000** | **~$31.74** | **~10.4x** |

> Custo contrafactual total estimado (sem IA): **~R$ 27.000+** · Saving estimado: **>92%**

---

## Estrutura do repositório

```
.
├── docker-compose.yml
├── README.md
├── PROPOSTA_v1.md           # Proposta inicial do projeto
├── WORKFLOW_DOCUMENT.md     # Registro de uso de IA no desenvolvimento
├── backend/
│   ├── ARCHITECTURE.md      # Decisões arquiteturais detalhadas
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py          # Entry point FastAPI (versão 0.3.0)
│   │   ├── ports.py         # Interfaces / contratos
│   │   ├── dependencies.py  # Container de injeção de dependência
│   │   ├── controllers/     # 9 routers HTTP
│   │   ├── services/        # 20 serviços de negócio
│   │   └── infrastructure/  # Adaptadores externos
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # SPA com 7 abas
│   │   ├── services/        # Clientes HTTP por domínio
│   │   └── infrastructure/  # Config HTTP e env
│   └── package.json
└── scripts/
    └── run_tests.py         # Runner de testes completo
```

---

## Documentos do projeto

| Documento                                              | Descrição                                                             |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| [README.md](README.md)                                 | Visão geral, stack e instruções rápidas (este arquivo)                |
| [COMO_FUNCIONA.md](COMO_FUNCIONA.md)                   | Como o sistema funciona por dentro — arquitetura, fluxos e decisões   |
| [COMO_RODAR.md](COMO_RODAR.md)                         | Guia passo a passo para rodar do zero                                 |
| [CATALOGO_PROMPTS.md](CATALOGO_PROMPTS.md)             | Catálogo formal de todos os prompts usados na aplicação (6 registros) |
| [backend/ARQUITETURA_C4.md](backend/ARQUITETURA_C4.md) | Documento de arquitetura C4 Model (Níveis 1, 2 e 3) + 6 ADRs          |
| [PROPOSTA_v1.md](PROPOSTA_v1.md)                       | Proposta inicial, problema, solução e arquitetura preliminar          |
| [WORKFLOW_DOCUMENT.md](WORKFLOW_DOCUMENT.md)           | Registro de uso de IA, economicidade e prompts notáveis               |
| [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md)     | Decisões arquiteturais, padrões SOLID e exemplos de código            |
