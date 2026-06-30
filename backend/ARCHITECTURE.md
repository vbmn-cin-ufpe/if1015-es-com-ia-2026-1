# Backend Architecture - CodeCompass

## 🏗️ Arquitetura Aplicada

Este backend segue **Arquitetura Hexagonal** (Ports & Adapters) com **Dependency Injection** adequada, respeitando princípios **SOLID**, **KISS**, **DRY** e **YAGNI**.

## 📁 Estrutura de Camadas

```
app/
├── ports.py                         # Interfaces (Protocol) — Dependency Inversion
├── dependencies.py                  # Container DI — FastAPI Depends
├── main.py                          # Entry point, CORS, middlewares, seed admin
├── controllers/                     # HTTP handlers — apenas orquestração (16 routers)
│   ├── health_controller.py        # GET /api/health
│   ├── repo_controller.py          # POST/GET /api/repos — indexação e status
│   ├── chat_controller.py          # POST /api/chat/ask
│   ├── tour_controller.py          # POST/GET /api/tours
│   ├── dependency_graph_controller.py  # GET /api/repos/{id}/graph + snapshots + diff + interpret
│   ├── history_controller.py       # GET /api/repos/{id}/history + /why
│   ├── metrics_controller.py       # GET/POST /api/repos/{id}/metrics
│   ├── ops_controller.py           # GET /api/ops/liveness, /readiness
│   ├── auth_controller.py          # POST /api/auth/signup, /signin
│   ├── admin_controller.py         # GET/PATCH /api/admin/* (users, plans, audit-log, usage)
│   ├── hotspot_controller.py       # GET /api/repos/{id}/hotspots
│   ├── tech_debt_controller.py     # GET /api/repos/{id}/tech-debt + POST /tech-debt/analyse
│   ├── branch_controller.py        # POST /api/repos/{id}/analyze-branch
│   ├── doc_controller.py           # POST /api/repos/{id}/generate-doc
│   ├── report_controller.py        # GET /api/repos/{id}/report
│   ├── search_controller.py        # GET /api/repos/{id}/search
│   ├── watchlist_controller.py     # POST/DELETE /api/repos/{id}/watch, GET /api/me/watchlist
│   └── webhook_controller.py       # CRUD /api/admin/webhooks + POST /api/webhooks/github/{id}
├── middleware/
│   └── auth_middleware.py          # require_auth, get_current_user
├── services/                        # Lógica de negócio (24+ serviços)
│   ├── models.py                   # Domain models e DTOs
│   ├── repo_service.py             # Orquestra pipeline de indexação
│   ├── chat_service.py             # Orquestra chat/RAG
│   ├── retrieval_service.py        # Busca semântica no ChromaDB
│   ├── embedding_service.py        # Embeddings local (sentence-transformers) ou OpenAI
│   ├── chunking_service.py         # Divisão de código via tree-sitter (15 linguagens)
│   ├── ingestion_service.py        # Coleta de arquivos + pipeline de indexação completo
│   ├── auth_service.py             # Autenticação, hashing de senha, sessões de onboarding
│   ├── tour_service.py             # Tour guiado (score = complexidade × churn × acoplamento)
│   ├── hotspot_service.py          # Identifica top-N arquivos de maior risco (churn × CC)
│   ├── tech_debt_service.py        # Análise multidimensional + PROMPT-010 (LLM opcional)
│   ├── dependency_graph_service.py # Análise de imports e construção do grafo
│   ├── architecture_drift_service.py  # Compara snapshots → drift_score + added/removed nodes/edges
│   ├── commit_history_service.py   # Ingere e classifica commits, timeline, Why explanations
│   ├── analyzers.py                # ChurnAnalyzer, ComplexityAnalyzer, CouplingAnalyzer
│   ├── notification_service.py     # Detecta módulos alterados → e-mail para watchlist subscribers
│   └── ... (outros)
└── infrastructure/                  # Adaptadores externos
    ├── settings.py                 # Pydantic BaseSettings — todas as env vars
    ├── postgres_adapter.py         # Implementa RepositoryMetadataPort
    ├── chroma_adapter.py           # Implementa VectorStorePort
    ├── git_client.py               # Implementa GitClientPort
    ├── llm_client.py               # Implementa LLMPort (Abacus AI / OpenAI / Anthropic)
    ├── tech_debt_repository.py     # TechDebtSnapshot + PostgreSQL + migração automática v2
    ├── audit_repository.py         # Tabela audit_log + fallback in-memory
    ├── webhook_repository.py       # Tabela webhooks + segredos HMAC-SHA256
    └── watchlist_repository.py     # Tabela watchlist com UNIQUE(user_id, repo_id, module_path)
```

## 🎯 Princípios SOLID Aplicados

### **S - Single Responsibility Principle**
- ✅ Controllers apenas lidam com HTTP
- ✅ Services contêm lógica de negócio isolada
- ✅ Adapters gerenciam apenas comunicação externa

### **O - Open/Closed Principle**
- ✅ Portas (Protocols) permitem estender sem modificar
- ✅ Pode trocar PostgreSQL por outra DB sem mudar services

### **L - Liskov Substitution Principle**
- ✅ Qualquer implementação de Port pode substituir outra

### **I - Interface Segregation Principle**
- ✅ Portas específicas e focadas (RepositoryMetadataPort, VectorStorePort, etc.)

### **D - Dependency Inversion Principle** ⭐ **PRINCIPAL CORREÇÃO**
- ✅ Services dependem de **abstrações** (Ports), não implementações
- ✅ Infrastructure implementa Ports
- ✅ Nenhuma dependência de módulos concretos

## 🔌 Dependency Injection

### **Antes (❌ Errado):**
```python
# Controller instanciava tudo
_repo_service = RepoService(
    metadata_adapter=PostgresAdapter(),  # ❌ Acoplamento forte
    git_client=GitClient(),              # ❌ Singleton global
    ...
)
```

### **Agora (✅ Correto):**
```python
# Controller recebe via Depends
@router.post("/index")
def index_repository(
    payload: RepositoryIndexRequest,
    repo_service: RepoService = Depends(get_repo_service),  # ✅ Injeção
) -> RepositoryIndexResponse:
    return repo_service.start_index(payload.repository_url)
```

### **Vantagens:**
- ✅ **Testável**: Pode injetar mocks
- ✅ **Flexível**: Troca implementações facilmente
- ✅ **Limpo**: Controllers não sabem como construir dependências
- ✅ **Centralizado**: Toda configuração em `dependencies.py`

## 🚀 Implementações Reais

### **1. Embeddings Semânticos** (sentence-transformers)
```python
# Antes: Hash SHA256 (❌ sem semântica)
# Agora: Sentence-BERT (✅ similaridade semântica real)
```

**Modelos disponíveis:**
- `all-MiniLM-L6-v2` (padrão): 384 dim, rápido, 80MB
- `all-mpnet-base-v2`: 768 dim, melhor qualidade, 420MB

### **2. LLM com Claude API** (Anthropic)
```python
# Antes: Retornava apenas preview do contexto
# Agora: Gera respostas reais via Claude com prompt engineering
```

**Features:**
- ✅ System prompt especializado em onboarding
- ✅ Formatação de contexto com fontes
- ✅ Fallback gracioso quando API não configurada
- ✅ Error handling robusto

## ⚙️ Configuração

### **1. Instalar Dependências**
```bash
cd backend
pip install -e ".[dev]"
```

### **2. Configurar Ambiente**
```bash
cp .env.example .env
# Editar .env com suas credenciais
```

**Variáveis críticas:**
```bash
ANTHROPIC_API_KEY=sk-ant-...  # Obter em console.anthropic.com
EMBEDDING_MODEL=all-MiniLM-L6-v2
```

### **3. Executar**
```bash
uvicorn app.main:app --reload
```

## 🧪 Testabilidade

### **Exemplo de Teste com Mock:**
```python
from app.dependencies import get_repo_service
from app.tests.mocks import MockMetadataAdapter

def test_index_with_mock():
    # Override dependency
    app.dependency_overrides[get_metadata_adapter] = lambda: MockMetadataAdapter()
    
    client = TestClient(app)
    response = client.post("/api/repos/index", json={"repository_url": "..."})
    
    assert response.status_code == 200
```

## 📊 Comparação Antes/Depois

| Aspecto | Antes ❌ | Agora ✅ |
|---------|----------|----------|
| **Dependency Injection** | Nenhuma (instanciação direta) | FastAPI Depends + Factory |
| **Interfaces** | Classes concretas | Protocol (Ports) |
| **Testabilidade** | Difícil (dependências reais) | Fácil (injeção de mocks) |
| **Embeddings** | Hash SHA256 (fake) | sentence-transformers (real) |
| **LLM** | Stub (preview) | Claude API (real) |
| **Settings** | `get_settings()` global | Injetada no construtor |
| **SOLID-D** | Viola | Respeita ✅ |

## 🎓 Boas Práticas Seguidas

1. ✅ **Ports & Adapters**: Núcleo independente de frameworks
2. ✅ **Dependency Injection**: Inversão de controle explícita
3. ✅ **Factory Pattern**: `dependencies.py` centraliza construção
4. ✅ **Protocol (Interface)**: Contratos sem herança
5. ✅ **Graceful Degradation**: Fallbacks quando dependências não disponíveis
6. ✅ **Configuration as Code**: Settings injetadas, não globais
7. ✅ **Separation of Concerns**: Cada camada com responsabilidade clara

## ✅ Evolução Implementada (Fases 1–4)

| Feature | Fase | Status |
|---|---|---|
| Logging estruturado + correlation ID | 1 | ✅ Implementado (`observability_service.py`) |
| Health checks + liveness/readiness | 1 | ✅ Implementado (`ops_controller.py`) |
| Background tasks (indexação não-bloqueante) | 2 | ✅ `FastAPI BackgroundTasks` em `repo_controller.py` |
| Batch processing com `ThreadPoolExecutor` | 2 | ✅ `EmbeddingService` — 18.7x mais rápido com OpenAI |
| Autenticação JWT + sessões | 1 | ✅ `auth_service.py` + `auth_controller.py` |
| Drift arquitetural entre snapshots | 4 | ✅ `architecture_drift_service.py` + endpoints |
| Audit log automático (middleware) | 4 | ✅ Middleware em `main.py` → `AuditRepository` |
| Webhooks GitHub com HMAC-SHA256 | 4 | ✅ `webhook_controller.py` + `webhook_repository.py` |
| Watchlist + notificações por e-mail | 4 | ✅ `watchlist_controller.py` + `notification_service.py` || Mapa de Hotspots (BubbleChart) | 2 | ✅ `hotspot_service.py` + `hotspot_controller.py` + `HotspotsTab.tsx` |
| Dívida Técnica multidimensional + IA | 3 | ✅ `tech_debt_service.py` v2 + PROMPT-010 + `TechDebtTab.tsx` |
| Testes unitários adicionais | 3 | ✅ `test_hotspot_service`, `test_chat_service`, `test_plan_enforcer`, `test_token_service` |
## 🔄 Próximos Passos Sugeridos

1. **Streaming de respostas LLM** — reduzir percepção de latência para perguntas complexas
2. **Cache de embeddings** — evitar re-embed de chunks inalterados entre re-indexações
3. **Retry logic com backoff** — para chamadas LLM e Embeddings API
4. **Horizontal scaling** — Celery + Redis como alternativa ao `BackgroundTasks` para filas grandes

## 📚 Referências

- [FastAPI Dependency Injection](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [SOLID Principles](https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design)
- [Python Protocol](https://peps.python.org/pep-0544/)
