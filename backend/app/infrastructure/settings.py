import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    api_title: str
    postgres_dsn: str | None
    chroma_host: str
    chroma_port: int
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
    # LLM settings
    llm_provider: str  # "abacus", "anthropic", "openai", etc.
    llm_api_key: str | None
    llm_api_base_url: str | None  # For Abacus AI or custom endpoints
    llm_model: str
    llm_max_tokens: int
    llm_temperature: float


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
        # LLM
        llm_provider=os.getenv("LLM_PROVIDER", "abacus"),
        llm_api_key=os.getenv("LLM_API_KEY"),
        llm_api_base_url=os.getenv("LLM_API_BASE_URL"),
        llm_model=os.getenv("LLM_MODEL", "claude-3-5-sonnet-20240620"),
        llm_max_tokens=int(os.getenv("LLM_MAX_TOKENS", "4096")),
        llm_temperature=float(os.getenv("LLM_TEMPERATURE", "0.7")),
    )