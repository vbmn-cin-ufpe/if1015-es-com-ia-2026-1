# Backend Architecture - CodeCompass

## 🏗️ Arquitetura Aplicada

Este backend segue **Arquitetura Hexagonal** (Ports & Adapters) com **Dependency Injection** adequada, respeitando princípios **SOLID**, **KISS**, **DRY** e **YAGNI**.

## 📁 Estrutura de Camadas

```
app/
├── ports.py                    # Interfaces (Protocol) - Dependency Inversion
├── dependencies.py             # Container DI - FastAPI Depends
├── controllers/                # HTTP handlers - apenas orquestração
│   ├── health_controller.py
│   ├── repo_controller.py
│   └── chat_controller.py
├── services/                   # Lógica de negócio
│   ├── models.py              # Domain models e DTOs
│   ├── repo_service.py        # Orquestra indexação
│   ├── chat_service.py        # Orquestra chat/RAG
│   ├── retrieval_service.py   # Busca semântica
│   ├── embedding_service.py   # Geração de embeddings
│   ├── chunking_service.py    # Divisão de código
│   └── ingestion_service.py   # Coleta de arquivos
└── infrastructure/             # Adaptadores externos
    ├── settings.py            # Configurações
    ├── postgres_adapter.py    # Implementa RepositoryMetadataPort
    ├── chroma_adapter.py      # Implementa VectorStorePort
    ├── git_client.py          # Implementa GitClientPort
    └── llm_client.py          # Implementa LLMPort
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

## 🔄 Próximos Passos Recomendados

1. **Adicionar logging estruturado** (observability)
2. **Implementar retry logic** para chamadas LLM
3. **Cache de embeddings** para não reprocessar
4. **Batch processing** para indexação de repos grandes
5. **Health checks** com verificação de dependências

## 📚 Referências

- [FastAPI Dependency Injection](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [SOLID Principles](https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design)
- [Python Protocol](https://peps.python.org/pep-0544/)
