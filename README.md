# IF1015 — TASI 6 · Engenharia de Software com IA · 2026-1

Repositório dedicado à disciplina do Centro de Informática da UFPE — **IF1015 Engenharia de Software com IA** (Tópicos Avançados em SI 6), turma de Sistemas de Informação, professor **Vinicius Cardoso Garcia**.

---

## CodeCompass — Onboarding Inteligente em Codebases Legados

**Equipe:** CodeCompass

| Membro | E-mail |
|---|---|
| Victor Barros de Miranda Neves | vbmn@cin.ufpe.br |
| Vinicius Henrique Silva | vhs@cin.ufpe.br |
| Alexandre de Souza Cabral | asc5@cin.ufpe.br |
| Arthur Luis de Farias Alves | alfa@cin.ufpe.br |
| Getulio Junqueira de Queiroz Lima | gjql@cin.ufpe.br |
| Carlos Henrique da Silva Frey | chsf@cin.ufpe.br |

---

## Sobre o projeto

**CodeCompass** é um assistente conversacional de onboarding que ajuda desenvolvedores novos a entender uma codebase legada de forma guiada e contextualizada. O sistema indexa repositórios Git, extrai embeddings semânticos do código-fonte e do histórico de commits, e fornece uma interface web para chat, tours guiados, grafo de dependências e análise de métricas.

Captura de tela fase MVP
<img width="1402" height="697" alt="image" src="https://github.com/user-attachments/assets/37b86ac0-b3a1-43fc-a00c-914fb198ae99" />


---

## Funcionalidades implementadas

| Funcionalidade | Descrição |
|---|---|
| **Indexação de repositório** | Clona repositórios Git (URL remota ou path local), faz chunking do código-fonte, gera embeddings com `sentence-transformers` e armazena no ChromaDB |
| **Chat RAG** | Interface conversacional com recuperação semântica de contexto (RAG) e geração de respostas via LLM (compatível com OpenAI API / Abacus AI) |
| **Tour guiado** | Gera automaticamente walkthroughs dos módulos mais importantes ranqueados por complexidade ciclomática, churn e acoplamento |
| **Grafo de dependências** | Analisa imports/dependências entre módulos e expõe grafo interativo com métricas de grau por nó |
| **Histórico de commits** | Timeline de commits por módulo com explicações geradas por IA e endpoint "Por que?" para decisões arquiteturais |
| **Métricas de qualidade** | Coleta métricas de complexidade, churn e acoplamento; gera relatório de qualidade com feedback via LLM |
| **Autenticação e sessões** | Signup/signin com hashing seguro de senha, tokens de sessão, checkpoints de progresso de onboarding |
| **Observabilidade** | Logging estruturado, rastreamento por correlation ID, coleta de latência/erros, endpoints de liveness e readiness |

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

| Router | Prefixo | Responsabilidade |
|---|---|---|
| `health_controller` | `/health` | Status da aplicação |
| `auth_controller` | `/api/auth` | Signup, signin, sessões de onboarding |
| `repo_controller` | `/api/repos` | Indexação e status de repositórios |
| `chat_controller` | `/api/chat` | Perguntas RAG sobre o repositório |
| `tour_controller` | `/api/tours` | Geração e listagem de tours guiados |
| `dependency_graph_controller` | `/api/graph` | Grafo de dependências e detalhes de módulo |
| `history_controller` | `/api/history` | Timeline de commits e explicações "Por quê?" |
| `metrics_controller` | `/api/metrics` | Coleta de métricas e relatório de qualidade |
| `ops_controller` | `/api/ops` | Liveness, readiness e resumo operacional |

---

## Stack tecnológica

### Backend
- **Python 3.11+** · **FastAPI 0.115** · **Uvicorn**
- **ChromaDB 0.5** — vector store para embeddings
- **PostgreSQL 16** — metadados de repositórios, usuários e sessões
- **sentence-transformers 3.3** — modelo `all-MiniLM-L6-v2` (384 dim) por padrão
- **GitPython 3.1** — clone e análise de repositórios
- **radon 6.0** — métricas de complexidade ciclomática
- **OpenAI SDK 1.59** — integração com LLM (Abacus AI / OpenAI-compatible)

### Frontend
- **React 18** · **TypeScript 5.8** · **Vite 6**
- **Vitest 3** · **@testing-library/react**
- 7 abas: Repositório, Chat, Tour Guiado, Grafo, Histórico, Métricas, Operacional

### Infraestrutura
- **Docker Compose** — orquestra todos os serviços
- Serviços: `postgres`, `chroma`, `backend`, `frontend`

---

## Como executar

### Com Docker Compose (recomendado)

```bash
# Copie e configure as variáveis de ambiente
cp backend/.env.example backend/.env
# Edite backend/.env com suas credenciais (LLM_API_KEY, etc.)

docker compose up --build
```

| Serviço | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Docs interativos | http://localhost:8000/docs |
| ChromaDB | http://localhost:8001 |

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

### Variáveis de ambiente relevantes

| Variável | Descrição | Padrão |
|---|---|---|
| `POSTGRES_DSN` | URI de conexão PostgreSQL | — |
| `CHROMA_HOST` | Host do ChromaDB | `localhost` |
| `CHROMA_PORT` | Porta do ChromaDB | `8000` |
| `LLM_API_KEY` | Chave da API do LLM | — |
| `LLM_API_BASE_URL` | URL base do LLM (Abacus AI, etc.) | — |
| `LLM_MODEL` | Modelo a usar | — |
| `EMBEDDING_MODEL` | Modelo de embeddings | `all-MiniLM-L6-v2` |
| `ALLOW_LOCAL_REPOS` | Permite clonar paths locais | `false` |

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

| Camada | Arquivos |
|---|---|
| **Unit** | `auth_service`, `repo_service`, `tour_service`, `dependency_graph`, `commit_history`, `health_service`, `metrics_service`, `observability` |
| **Integration** | `auth_api`, `repo_api`, `tour_api`, `dependency_graph_api`, `history_api`, `metrics_api`, `ops_api`, `health` |
| **E2E** | `index_chat`, `tour`, `dependency_graph`, `history` |
| **Frontend** | `App.test.tsx` (Vitest) |

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

- [PROPOSTA_v1.md](PROPOSTA_v1.md) — Proposta inicial, problema, solução e arquitetura preliminar
- [WORKFLOW_DOCUMENT.md](WORKFLOW_DOCUMENT.md) — Registro de uso de IA, economicidade e prompts notáveis
- [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md) — Decisões arquiteturais, padrões SOLID e exemplos de código

