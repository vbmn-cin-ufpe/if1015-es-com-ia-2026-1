# ── Identificação do ambiente ─────────────────────────────────────────────────

variable "prefix" {
  description = "Prefixo para todos os nomes de recursos Azure (letras minúsculas, sem espaços)"
  type        = string
  default     = "codecompass"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,15}$", var.prefix))
    error_message = "O prefixo deve ter 3-16 chars, iniciar com letra e conter apenas letras minúsculas, números e hífens."
  }
}

variable "environment" {
  description = "Nome do ambiente: prod | staging | dev"
  type        = string
  default     = "prod"
  validation {
    condition     = contains(["prod", "staging", "dev"], var.environment)
    error_message = "Environment deve ser prod, staging ou dev."
  }
}

variable "location" {
  description = "Região Azure para os recursos (ex: brazilsouth, eastus, westeurope)"
  type        = string
  default     = "brazilsouth"
}

# ── Banco de dados PostgreSQL ────────────────────────────────────────────────

variable "postgres_admin_login" {
  description = "Login do administrador do PostgreSQL Flexible Server"
  type        = string
  default     = "pgadmin"
}

variable "postgres_admin_password" {
  description = "Senha do administrador do PostgreSQL (min 8 chars, maiúsculas + minúsculas + números + símbolos)"
  type        = string
  sensitive   = true
}

variable "postgres_sku" {
  description = "SKU do PostgreSQL Flexible Server. B_Standard_B1ms (~$14/mês) para dev/staging; B_Standard_B2ms para prod"
  type        = string
  default     = "B_Standard_B1ms"
}

variable "postgres_storage_mb" {
  description = "Armazenamento em MB para o PostgreSQL (32768 = 32 GB)"
  type        = number
  default     = 32768
}

# ── Aplicação — credenciais ───────────────────────────────────────────────────

variable "admin_email" {
  description = "E-mail do usuário admin inicial do CodeCompass"
  type        = string
  default     = "admin@codecompass.com"
}

variable "admin_password" {
  description = "Senha do usuário admin inicial do CodeCompass"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Segredo JWT para assinar tokens de autenticação (mínimo 32 caracteres)"
  type        = string
  sensitive   = true
}

# ── LLM Provider ────────────────────────────────────────────────────────────

variable "llm_provider" {
  description = "Provider do LLM: abacus | openai | anthropic"
  type        = string
  default     = "abacus"
}

variable "llm_api_key" {
  description = "Chave da API do LLM provider (Abacus AI, OpenAI ou Anthropic)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "llm_model" {
  description = "Identificador do modelo LLM (depende do provider)"
  type        = string
  default     = "CLAUDE_V3_5_SONNET"
}

# ── Embeddings ────────────────────────────────────────────────────────────────

variable "embedding_provider" {
  description = "Provider de embeddings: local (sentence-transformers) | openai (recomendado para produção)"
  type        = string
  default     = "openai"
}

variable "openai_api_key" {
  description = "Chave da API OpenAI (para embeddings com text-embedding-3-small)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "embedding_model" {
  description = "Modelo de embeddings"
  type        = string
  default     = "text-embedding-3-small"
}

variable "embedding_dim" {
  description = "Dimensão dos vetores de embedding (384 para local, 1536 para text-embedding-3-small)"
  type        = string
  default     = "1536"
}

variable "embedding_max_workers" {
  description = "Workers paralelos para batch de embeddings OpenAI"
  type        = string
  default     = "4"
}

# ── Escalonamento do backend ───────────────────────────────────────────────────

variable "backend_cpu" {
  description = "CPUs alocadas para o container do backend (0.25 | 0.5 | 1.0 | 2.0)"
  type        = number
  default     = 1.0
}

variable "backend_memory" {
  description = "Memória alocada para o container do backend (ex: 2Gi)"
  type        = string
  default     = "2Gi"
}

variable "backend_min_replicas" {
  description = "Número mínimo de réplicas do backend (0 = scale-to-zero, economiza custo)"
  type        = number
  default     = 1
}

variable "backend_max_replicas" {
  description = "Número máximo de réplicas do backend"
  type        = number
  default     = 3
}

# ── ChromaDB ──────────────────────────────────────────────────────────────────

variable "chroma_storage_gb" {
  description = "Quota em GB do Azure Files share para dados do ChromaDB"
  type        = number
  default     = 50
}
