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
    )