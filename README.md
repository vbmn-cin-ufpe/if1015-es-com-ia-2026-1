**🇺🇸 English** · [🇧🇷 Português](README.pt-BR.md)

---

# IF1015 — TASI 6 · Software Engineering with AI · 2026-1

Repository dedicated to the course at Centro de Informática, UFPE (Federal University of Pernambuco) — **IF1015 Software Engineering with AI** (Advanced Topics in SI 6), Information Systems class, professor **Vinicius Cardoso Garcia**.

🎨 **Canva Presentation:** https://www.canva.com/design/DAHMrRH85cQ/rpHYQHauYtlc1Tw1F2Js6w/edit

🎬 **YouTube Demo Video:** https://youtu.be/63nNUSE4aY8

🚀 **Production system:** https://codecompass.bravegrass-34034b2f.brazilsouth.azurecontainerapps.io/


---

## CodeCompass — Intelligent Onboarding for Legacy Codebases

**Team:** CodeCompass

| Member                            | E-mail           | Photo |
| --------------------------------- | ---------------- | ---- |
| Victor Barros de Miranda Neves    | vbmn@cin.ufpe.br | <img width="105" height="100" alt="Victor" src="https://github.com/user-attachments/assets/61023d27-5828-4078-a39f-b4ae1e46f357" /> |
| Vinicius Henrique Silva           | vhs@cin.ufpe.br  | <img width="105" height="100" alt="Vinicius" src="https://github.com/user-attachments/assets/50b24635-ea17-430f-a4e8-a2cdfddc9b64" /> |
| Alexandre de Souza Cabral         | asc5@cin.ufpe.br | <img width="105" height="100" alt="Alexandre" src="https://github.com/user-attachments/assets/7a200cf8-20e3-4296-abaa-eb65b43fc571" /> |
| Arthur Luis de Farias Alves       | alfa@cin.ufpe.br | <img width="105" height="100" alt="Arthur" src="https://github.com/user-attachments/assets/ffa35d68-713f-4f16-8928-7392eef53191" /> |
| Getulio Junqueira de Queiroz Lima | gjql@cin.ufpe.br | <img width="105" height="100" alt="Getulio" src="https://github.com/user-attachments/assets/b4c8552f-4614-46f5-b4df-1a78c393bab3" /> |
| Carlos Henrique da Silva Frey     | chsf@cin.ufpe.br | <img width="105" height="100" alt="Carlos" src="https://github.com/user-attachments/assets/e3b04e42-d6e1-403c-9ece-54ac31a6ca79" /> |
---

## About the project

**CodeCompass** is a conversational onboarding assistant that helps new developers understand a legacy codebase in a guided and contextualized way. The system indexes Git repositories, extracts semantic embeddings from source code and commit history, and provides a web interface for chat, guided tours, a dependency graph, and quality metrics analysis.

<img width="667" height="372" alt="image" src="https://github.com/user-attachments/assets/dab435b0-3e2c-41f1-a6fb-771fc131a5b5" />

MVP phase screenshot

<img width="1402" height="697" alt="image" src="https://github.com/user-attachments/assets/37b86ac0-b3a1-43fc-a00c-914fb198ae99" />

Current phase screenshot

<img width="1994" height="940" alt="image" src="https://github.com/user-attachments/assets/407bbe18-f7c3-4aca-a6e8-f996c396e857" />




---

## Implemented features

| Feature                            | Phase | Description                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Repository indexing**            | 1    | Clones Git repositories (remote URL or local path), chunks source code with tree-sitter (15 languages), generates embeddings, and stores them in ChromaDB                                                                                                                                                                                            |
| **RAG Chat**                       | 1    | Conversational interface with RAG, LLM-generated answers, Markdown rendering with VS Code-style code blocks                                                                                                                                                                                                                                          |
| **Guided tour**                    | 1    | Automatically generates walkthroughs of the most important modules, ranked by cyclomatic complexity, churn, and coupling                                                                                                                                                                                                                             |
| **Dependency graph**               | 1    | Analyzes imports/dependencies between modules and exposes an interactive graph with per-node degree metrics                                                                                                                                                                                                                                          |
| **Impact analysis**                | 1    | Identifies modules affected by a change in a specific file, propagating the impact through the graph                                                                                                                                                                                                                                                 |
| **Semantic search**                | 1    | Semantic similarity search over indexed code, returning chunks ranked by relevance                                                                                                                                                                                                                                                                    |
| **Commit history**                 | 1    | Per-module commit timeline with AI-generated explanations and a "Why?" endpoint for architectural decisions                                                                                                                                                                                                                                          |
| **Quality metrics**                | 1    | Collects complexity, churn, and coupling metrics; generates an LLM-powered quality report                                                                                                                                                                                                                                                             |
| **Auth & sessions**                | 1    | Signup/signin with secure password hashing, JWT tokens, onboarding progress checkpoints, email verification, password reset                                                                                                                                                                                                                          |
| **Observability**                  | 1    | Structured logging, correlation-ID tracing, latency/error collection, liveness and readiness endpoints                                                                                                                                                                                                                                                |
| **Dark mode**                      | 1    | Light/dark theme persisted to localStorage, enabled via Tailwind CSS `dark:` classes                                                                                                                                                                                                                                                                  |
| **Collapsible sidebar**            | 1    | Retractable side navigation (ChatLLM-style) with icons + labels, collapse/expand button                                                                                                                                                                                                                                                               |
| **Hotspot map**                    | 2    | Identifies highest-risk files (churn × complexity), interactive BubbleChart (X=churn, Y=complexity, size=LOC), highlighted RISK ZONE, filters by language and risk level, draggable visual threshold                                                                                                                                                |
| **Repository health**              | 2    | Admin dashboard with indexing status, metrics, and alerts per repository                                                                                                                                                                                                                                                                              |
| **LLM evaluation**                 | 2    | Per-chat-response feedback system (👍/👎), admin panel with answer-quality analysis                                                                                                                                                                                                                                                                  |
| **Usage dashboard**                | 2    | Usage metrics per user, repository, and period; trend charts                                                                                                                                                                                                                                                                                          |
| **Branch analysis**                | 2    | Compares a feature branch against its base, lists changed files, computes a risk score, and generates an LLM summary                                                                                                                                                                                                                                 |
| **Documentation generator**        | 2    | Generates a detailed README.md for a module using indexed chunks + commit history, via LLM                                                                                                                                                                                                                                                           |
| **Technical debt score**           | 3    | Multidimensional analysis across 5 categories (complexity, churn, size, coupling, documentation), AI-generated quality summary (PROMPT-010 — evaluates Clean Code · SOLID · DRY · KISS · YAGNI · Clean Architecture), on-demand analysis endpoint, trend indicator (↓ Improving / → Stable / ↑ Degrading), and visual per-category breakdown       |
| **LLM cost monitor**               | 3    | Tracks tokens consumed and estimated cost per LLM call, grouped by provider and day                                                                                                                                                                                                                                                                   |
| **Ingestion queue**                | 3    | Real-time panel of repository indexing progress, with auto-refresh and progress bar                                                                                                                                                                                                                                                                   |
| **Plan management**                | 3    | CRUD for plan limits (free/paid/enterprise): max repos, max questions, deletion permission                                                                                                                                                                                                                                                            |
| **Export report**                  | 3    | Generates and downloads a PDF/JSON repository report with metrics, technical debt, and hotspots                                                                                                                                                                                                                                                       |
| **Architectural drift detection**  | 4    | Compares two dependency-graph snapshots and measures the percentage of structural change (drift score), with LLM interpretation and date selection                                                                                                                                                                                                   |
| **Audit log**                      | 4    | Automatically records all POST/PATCH/DELETE actions with user, IP, and resource; admin panel with filters                                                                                                                                                                                                                                             |
| **GitHub webhooks**                | 4    | Receives GitHub push events via HMAC-SHA256, triggers automatic repository re-indexing                                                                                                                                                                                                                                                                |
| **Watchlist / Notifications**      | 4    | Users subscribe to modules; receive an email when a structural change is detected during re-indexing                                                                                                                                                                                                                                                 |

---

## Architecture

The backend follows **Hexagonal Architecture** (Ports & Adapters) with dependency injection via `FastAPI.Depends`, respecting the SOLID, KISS, DRY, and YAGNI principles.

```
[User] → [React/Vite Frontend :5173]
                      ↓
          [FastAPI Backend API :8000]
                ↓         ↓         ↓
       [GitPython]   [ChromaDB]  [LLM Client]
            ↓         [RAG]      [OpenAI API]
      [Repository]      ↑
                  [sentence-transformers]
                         ↓
                    [PostgreSQL :5432]
```

### Backend — layers

```
app/
├── ports.py            # Interfaces (Protocol) — Dependency Inversion
├── dependencies.py     # DI container — FastAPI Depends
├── controllers/        # HTTP handlers (9 routers)
├── services/           # Business logic
└── infrastructure/     # External adapters (Postgres, Chroma, Git, LLM)
```

### Controllers (endpoints)

| Router                        | Prefix                    | Responsibility                                            |
| ----------------------------- | ------------------------- | ----------------------------------------------------------- |
| `health_controller`           | `/api/health`             | Application status                                         |
| `auth_controller`             | `/api/auth`               | Signup, signin, onboarding sessions, password reset        |
| `repo_controller`             | `/api/repos`              | Repository indexing and status                              |
| `chat_controller`             | `/api/chat`               | RAG questions about the repository                          |
| `tour_controller`             | `/api/tours`              | Guided tour generation and listing                          |
| `dependency_graph_controller` | `/api/repos/{id}/graph`   | Dependency graph, snapshots, and architectural diff          |
| `history_controller`          | `/api/repos/{id}/history` | Commit timeline and "Why?" explanations                     |
| `metrics_controller`          | `/api/repos/{id}/metrics` | Metrics collection and quality report                       |
| `ops_controller`              | `/api/ops`                | Liveness, readiness, and operational summary                |
| `admin_controller`            | `/api/admin`              | User/plan management, health, LLM costs, audit log          |
| `watchlist_controller`        | `/api/repos/{id}/watch`   | Module subscription for email notifications                 |
| `webhook_controller`          | `/api/admin/webhooks`     | Webhook CRUD and GitHub push-event receiver                  |
| `tour_controller`             | `/api/tours`              | Guided tour generation and listing                           |
| `dependency_graph_controller` | `/api/graph`              | Dependency graph and module details                          |
| `history_controller`          | `/api/history`            | Commit timeline and "Why?" explanations                      |
| `metrics_controller`          | `/api/metrics`            | Metrics collection and quality report                        |
| `ops_controller`              | `/api/ops`                | Liveness, readiness, and operational summary                 |

---

## Tech stack

### Backend

- **Python 3.11+** · **FastAPI 0.115** · **Uvicorn**
- **ChromaDB 0.5** — vector store for embeddings
- **PostgreSQL 16** — repository, user, and session metadata
- **OpenAI `text-embedding-3-small`** (1536 dim) via `OPENAI_API_KEY` — production default
- **sentence-transformers `all-MiniLM-L6-v2`** (384 dim) — local fallback, no API key required
- **tree-sitter** — AST parsing for 15 languages (Python, JS, TS, Java, Go, Rust, C, C++, C#, Ruby, PHP, Kotlin, Scala, Shell/Bash + Swift text fallback)
- **GitPython 3.1** — repository cloning and analysis
- **radon 6.0** — cyclomatic complexity metrics
- **Abacus AI SDK / OpenAI SDK 1.59** — multi-provider LLM integration

### Frontend

- **React 18** · **TypeScript 5.8** · **Vite 6**
- **Tailwind CSS** (CDN Play) with `dark:` classes and `darkMode: 'class'`
- **react-syntax-highlighter** — code blocks with the `vscDarkPlus` VS Code-style theme
- **Vitest 3** · **@testing-library/react**
- Collapsible side navigation + dark mode persisted in `localStorage`

### Infrastructure

- **Docker Compose** — orchestrates all services
- Services: `postgres`, `chroma`, `backend`, `frontend`

---

## How to run

### With Docker Compose (recommended)

```bash
# 1. Copy the example file and set your credentials
cp .env.example .env
# Edit .env with your keys (LLM_API_KEY, OPENAI_API_KEY, POSTGRES_PASSWORD, ADMIN_PASSWORD)

# 2. Start all services
docker compose up --build
```

| Service                    | URL                         |
| --------------------------- | --------------------------- |
| Frontend                   | http://localhost:5173      |
| Backend API                | http://localhost:8000      |
| Interactive docs (Swagger) | http://localhost:8000/docs |
| ChromaDB                   | http://localhost:8001      |

### Local development

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

### Environment variables

| Variable                | Description                                        | Default             |
| ------------------------ | --------------------------------------------------- | ------------------- |
| `POSTGRES_PASSWORD`     | PostgreSQL password (**required**)                 | —                  |
| `ADMIN_EMAIL`           | Seed admin user e-mail                             | `admin`            |
| `ADMIN_PASSWORD`        | Admin password (**required**)                       | —                  |
| `LLM_PROVIDER`          | LLM provider (`abacus`\|`openai`\|`anthropic`)      | `abacus`           |
| `LLM_API_KEY`           | LLM API key                                         | —                  |
| `LLM_MODEL`             | LLM model (e.g. `CLAUDE_V3_5_SONNET`)              | —                  |
| `OPENAI_API_KEY`        | OpenAI key for embeddings                          | —                  |
| `EMBEDDING_PROVIDER`    | Embedding provider (`local`\|`openai`)             | `local`            |
| `EMBEDDING_MODEL`       | Embedding model                                    | `all-MiniLM-L6-v2` |
| `EMBEDDING_DIM`         | Embedding dimension                                | `384`              |
| `EMBEDDING_MAX_WORKERS` | Parallel workers (OpenAI)                          | `4`                |
| `ALLOW_LOCAL_REPOS`     | Allow cloning local paths                          | `true`             |

> See [.env.example](.env.example) for the full list with comments.

---

## Tests

```bash
# All tests (unit + integration + e2e + frontend)
python scripts/run_tests.py

# Unit tests only
pytest backend/tests/unit

# Integration tests only
pytest backend/tests/integration

# E2E tests only
pytest backend/tests/e2e

# Frontend
npm --prefix frontend test
```

### Test coverage

| Layer           | Files                                                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**        | `auth_service`, `repo_service`, `tour_service`, `dependency_graph`, `commit_history`, `health_service`, `metrics_service`, `observability`, `hotspot_service`, `chat_service`, `plan_enforcer`, `token_service` |
| **Integration** | `auth_api`, `repo_api`, `tour_api`, `dependency_graph_api`, `history_api`, `metrics_api`, `ops_api`, `health`                                                                                                   |
| **E2E**         | `index_chat`, `tour`, `dependency_graph`, `history`                                                                                                                                                             |
| **Frontend**    | `App.test.tsx` (Vitest)                                                                                                                                                                                         |

---

## Development phases

| Phase                     | Period      | Delivered features                                                                                                                                          |
| -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Phase 1** — Exposition   | Classes 14-20 | Foundation, RAG/Chat, Tour, Graph, Impact, Semantic Search, History, Metrics, Auth, Observability                                                          |
| **Phase 2** — Composition  | Classes 21-24 | Hotspots, Repo Health, LLM Evaluation, Usage Dashboard, Branch Analysis, Docs Generator; embedding optimization (18.7x)                                    |
| **Phase 3** — Rehearsal    | Classes 25-29 | Technical Debt Score (multidimensional + AI), LLM Cost Monitor, Ingestion Queue, Plans, Export Report; dark mode, sidebar, VS Code code blocks              |
| **Phase 4** — Resonance    | Classes 30-32 | Architectural Drift + AI, Audit Log, GitHub Webhooks, Watchlist/Notifications                                                                              |

---

## AI usage in development

The project was developed with extensive assistance from **GitHub Copilot Agent Mode** (**Claude Sonnet 4.6** model) via VS Code, complemented by **ChatLLM** (Claude Opus 4) in the early phases.

| Phase                | Input tokens (est.) | Output tokens (est.) | AI cost (USD) | Cost-efficiency ratio |
| --------------------- | --------------------- | ---------------------- | --------------- | ----------------------- |
| Pre-proposal         | ~30,000               | ~57,000                | ~$1.08          | 7.1x                    |
| Phase 1 (Exposition) | ~186,000              | ~266,000               | ~$22.74         | 14.2x                   |
| Phase 2 (Composition)| ~88,000               | ~65,000                | ~$1.11          | 6.2x                    |
| Phase 3 (Rehearsal)  | ~92,000               | ~84,000                | ~$1.56          | 8.4x                    |
| Phase 4 (Resonance)  | ~310,000              | ~180,000               | ~$5.25          | 11.8x                   |
| **Total**            | **~706,000**          | **~652,000**            | **~$31.74**     | **~10.4x**              |

> Estimated total counterfactual cost (without AI): **~R$27,000+** · Estimated savings: **>92%**

---

## Repository structure

```
.
├── docker-compose.yml
├── README.md
├── PROPOSTA_v1.md           # Initial project proposal
├── WORKFLOW_DOCUMENT.md     # Record of AI usage during development
├── ARCHITECTURE.md          # Detailed architectural decisions
├── C4_MODEL.md              # C4 model (Levels 1, 2, and 3)
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py          # FastAPI entry point (version 0.3.0)
│   │   ├── ports.py         # Interfaces / contracts
│   │   ├── dependencies.py  # Dependency injection container
│   │   ├── controllers/     # 9 HTTP routers
│   │   ├── services/        # 20 business services
│   │   └── infrastructure/  # External adapters
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # SPA with 7 tabs
│   │   ├── services/        # HTTP clients per domain
│   │   └── infrastructure/  # HTTP config and env
│   └── package.json
└── scripts/
    └── run_tests.py         # Full test runner
```

---

## Project documents

| Document                                    | Description                                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [README.md](README.md)                       | Overview, stack, and quick instructions (this file)                                              |
| [COMO_FUNCIONA.md](COMO_FUNCIONA.md)         | How the system works internally — architecture, flows, and decisions                             |
| [COMO_RODAR.md](COMO_RODAR.md)               | Step-by-step guide to running the project from scratch                                            |
| [CATALOGO_PROMPTS.md](CATALOGO_PROMPTS.md)   | Formal catalog of every prompt used in the application (10 entries: PROMPT-001 to PROMPT-010)     |
| [C4_MODEL.md](C4_MODEL.md)                   | C4 Model architecture document (Levels 1, 2, and 3) + 6 ADRs                                       |
| [ARCHITECTURE.md](ARCHITECTURE.md)           | Architectural decisions, SOLID patterns, and code examples                                        |
| [PROPOSTA_v1.md](PROPOSTA_v1.md)             | Initial proposal, problem, solution, and preliminary architecture                                 |
| [WORKFLOW_DOCUMENT.md](WORKFLOW_DOCUMENT.md) | Record of AI usage, cost-efficiency, and notable prompts                                          |
