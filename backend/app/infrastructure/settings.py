import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    api_title: str
    postgres_dsn: str | None
    chroma_host: str
    chroma_port: int
    chroma_ssl: bool        # True para Azure Container Apps (HTTPS interno); False para Docker local
    chroma_collection_prefix: str
    supabase_url: str | None
    supabase_anon_key: str | None
    allow_local_repos: bool
    repo_workspace: str
    # Chunking settings
    chunk_size: int
    chunk_overlap: int
    # Embedding settings
    embedding_model: str
    embedding_dim: int
    embedding_provider: str   # "local" | "openai" | "abacus"
    # LLM settings
    llm_provider: str  # "abacus", "anthropic", "openai", etc.
    llm_api_key: str | None
    llm_api_base_url: str | None  # For Abacus AI or custom endpoints
    openai_api_key: str | None   # Chave dedicada para embeddings OpenAI (separada do LLM)
    llm_model: str
    llm_max_tokens: int
    llm_temperature: float
    # Performance
    max_file_size_kb: int       # skip files larger than this (minified/generated)
    embedding_batch_size: int   # chunks per encode() call (OpenAI max: 2048)
    embedding_max_workers: int  # concurrent batch threads for OpenAI (ignored for local)
    upsert_batch_size: int      # vectors per ChromaDB upsert call
    # Logging
    log_level: str
    # Admin seed
    admin_email: str
    admin_password: str
    # JWT
    jwt_secret: str
    jwt_expiry_hours: int
    # App public URL (used in email links)
    app_base_url: str
    # Azure Communication Services email
    azure_email_conn_str: str | None
    azure_email_from: str


def _as_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def get_settings() -> Settings:
    return Settings(
        api_title=os.getenv("API_TITLE", "CodeCompass API"),
        postgres_dsn=os.getenv("POSTGRES_DSN"),
        chroma_host=os.getenv("CHROMA_HOST", "localhost"),
        chroma_port=int(os.getenv("CHROMA_PORT", "8001")),
        chroma_ssl=_as_bool(os.getenv("CHROMA_SSL"), False),
        chroma_collection_prefix=os.getenv("CHROMA_COLLECTION_PREFIX", "codecompass"),
        supabase_url=os.getenv("SUPABASE_URL"),
        supabase_anon_key=os.getenv("SUPABASE_ANON_KEY"),
        allow_local_repos=_as_bool(os.getenv("ALLOW_LOCAL_REPOS"), True),
        repo_workspace=os.getenv("REPO_WORKSPACE", "/tmp/codecompass/repos"),
        # Chunking
        chunk_size=int(os.getenv("CHUNK_SIZE", "80")),
        chunk_overlap=int(os.getenv("CHUNK_OVERLAP", "20")),
        # Embeddings
        embedding_model=os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2"),
        embedding_dim=int(os.getenv("EMBEDDING_DIM", "384")),
        embedding_provider=os.getenv("EMBEDDING_PROVIDER", "local"),
        # LLM
        llm_provider=os.getenv("LLM_PROVIDER", "abacus"),
        llm_api_key=os.getenv("LLM_API_KEY"),
        llm_api_base_url=os.getenv("LLM_API_BASE_URL"),
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        llm_model=os.getenv("LLM_MODEL", "claude-3-5-sonnet-20240620"),
        llm_max_tokens=int(os.getenv("LLM_MAX_TOKENS", "4096")),
        llm_temperature=float(os.getenv("LLM_TEMPERATURE", "0.7")),
        # Performance
        max_file_size_kb=int(os.getenv("MAX_FILE_SIZE_KB", "200")),
        embedding_batch_size=int(os.getenv("EMBEDDING_BATCH_SIZE", "64")),
        embedding_max_workers=int(os.getenv("EMBEDDING_MAX_WORKERS", "4")),
        upsert_batch_size=int(os.getenv("UPSERT_BATCH_SIZE", "500")),
        # Logging
        log_level=os.getenv("LOG_LEVEL", "INFO"),
        # Admin seed
        admin_email=os.getenv("ADMIN_EMAIL", "admin"),
        admin_password=os.getenv("ADMIN_PASSWORD", ""),
        # JWT
        jwt_secret=os.getenv("JWT_SECRET", "change-me-in-production-use-a-long-random-string"),
        jwt_expiry_hours=int(os.getenv("JWT_EXPIRY_HOURS", "24")),
        # App public URL
        app_base_url=os.getenv("APP_BASE_URL", "http://localhost:5173"),
        # Azure Communication Services
        azure_email_conn_str=os.getenv("AZURE_EMAIL_CONNECTION_STRING"),
        azure_email_from=os.getenv("AZURE_EMAIL_FROM", "donotreply@codecompass.dev"),
    )