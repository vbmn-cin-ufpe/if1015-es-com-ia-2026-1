"""Dependency injection container using FastAPI Depends pattern."""

from functools import lru_cache

from app.infrastructure.chroma_adapter import ChromaAdapter
from app.infrastructure.git_client import GitClient
from app.infrastructure.graph_repository_adapter import GraphRepositoryAdapter
from app.infrastructure.llm_client import LlmClient
from app.infrastructure.llm_usage_repository import LlmUsageRepository
from app.infrastructure.postgres_adapter import PostgresAdapter
from app.infrastructure.tour_repository_adapter import TourRepositoryAdapter
from app.infrastructure.settings import Settings, get_settings
from app.ports import (
    EmbeddingPort,
    GitClientPort,
    GraphRepositoryPort,
    LLMPort,
    RepositoryMetadataPort,
    TourRepositoryPort,
    VectorStorePort,
)
from app.services.chat_service import ChatService
from app.services.chunking_service import ChunkingService
from app.services.embedding_service import EmbeddingService
from app.services.ingestion_service import IngestionService
from app.services.repo_service import RepoService
from app.services.retrieval_service import RetrievalService


# ── Auth singletons ───────────────────────────────────────────────────────────

@lru_cache
def get_auth_service_instance():
    """Lazily creates and caches the AuthService singleton."""
    from app.infrastructure.email_gateway import EmailGateway
    from app.infrastructure.user_repository import UserRepository
    from app.services.auth_service import AuthService
    from app.services.token_service import TokenService

    settings = get_settings_cached()
    user_repo = UserRepository(settings)
    token_svc = TokenService(settings.jwt_secret, settings.jwt_expiry_hours)
    email_gw = EmailGateway(settings.azure_email_conn_str, settings.azure_email_from)
    return AuthService(
        user_repo=user_repo,
        token_service=token_svc,
        email_gateway=email_gw,
        app_base_url=settings.app_base_url,
        admin_email=settings.admin_email,
        admin_password=settings.admin_password,
    )


@lru_cache
def get_user_repository_instance():
    """Returns the SAME UserRepository instance used by AuthService."""
    # Reuse the repo already created inside get_auth_service_instance()
    # to avoid two separate in-memory dicts / connection pools.
    svc = get_auth_service_instance()
    return svc._repo



def get_tour_repository(settings: Settings | None = None) -> TourRepositoryPort:
    """Factory for tour repository adapter."""
    if settings is None:
        settings = get_settings_cached()
    return TourRepositoryAdapter(settings)


def get_graph_repository(settings: Settings | None = None) -> GraphRepositoryPort:
    """Factory for graph repository adapter."""
    if settings is None:
        settings = get_settings_cached()
    return GraphRepositoryAdapter(settings)


def get_graph_service() -> "GraphService":
    """Factory for graph orchestration service."""
    from app.services.graph_orchestration_service import GraphService

    return GraphService(
        metadata_adapter=get_metadata_adapter(),
        graph_repository=get_graph_repository(),
    )


def get_history_service() -> "HistoryService":
    """Factory for history orchestration service."""
    from app.infrastructure.decision_repository_adapter import DecisionRepositoryAdapter
    from app.services.history_orchestration_service import HistoryService

    settings = get_settings_cached()
    decision_repo = DecisionRepositoryAdapter(settings)
    llm = get_llm_client(settings)
    return HistoryService(decision_repository=decision_repo, llm_port=llm)


def get_tour_service() -> "TourGenerationService":
    """Factory for tour generation service."""
    from app.services.tour_service import ModuleScoringService, TourGenerationService

    return TourGenerationService(
        scoring_service=ModuleScoringService(),
        metadata_adapter=get_metadata_adapter(),
        tour_repository=get_tour_repository(),
        llm_client=get_llm_client(),
    )


# Settings (singleton)
@lru_cache
def get_settings_cached() -> Settings:
    """Get cached settings instance."""
    return get_settings()


# Infrastructure layer (adapters)
def get_metadata_adapter(settings: Settings | None = None) -> RepositoryMetadataPort:
    """Factory for repository metadata adapter."""
    if settings is None:
        settings = get_settings_cached()
    return PostgresAdapter(settings)


def get_vector_store(settings: Settings | None = None) -> VectorStorePort:
    """Factory for vector store adapter."""
    if settings is None:
        settings = get_settings_cached()
    return ChromaAdapter(settings)


def get_git_client(settings: Settings | None = None) -> GitClientPort:
    """Factory for git client."""
    if settings is None:
        settings = get_settings_cached()
    return GitClient(settings)


@lru_cache
def get_llm_usage_repository() -> LlmUsageRepository:
    """Cached singleton for LLM usage/cost tracking."""
    return LlmUsageRepository(get_settings_cached())


def get_llm_client(settings: Settings | None = None) -> LLMPort:
    """Factory for LLM client with token-usage tracking."""
    if settings is None:
        settings = get_settings_cached()
    usage_repo = get_llm_usage_repository()

    def _usage_callback(tokens_in: int, tokens_out: int) -> None:
        usage_repo.record(
            user_id="",
            endpoint="llm",
            repository_id="",
            provider=settings.llm_provider,
            model=settings.llm_model,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
        )

    return LlmClient(settings, usage_callback=_usage_callback)


def get_embedding_service(settings: Settings | None = None) -> EmbeddingPort:
    """Factory for embedding service."""
    if settings is None:
        settings = get_settings_cached()
    return EmbeddingService(settings)


# Service layer
def get_ingestion_service() -> IngestionService:
    """Factory for ingestion service."""
    return IngestionService()


def get_chunking_service(settings: Settings | None = None) -> ChunkingService:
    """Factory for chunking service."""
    if settings is None:
        settings = get_settings_cached()
    return ChunkingService(
        chunk_size=settings.chunk_size,
        overlap=settings.chunk_overlap,
    )


def get_retrieval_service(
    vector_store: VectorStorePort | None = None,
    embedding_service: EmbeddingPort | None = None,
) -> RetrievalService:
    """Factory for retrieval service."""
    if vector_store is None:
        vector_store = get_vector_store()
    if embedding_service is None:
        embedding_service = get_embedding_service()
    return RetrievalService(chroma_adapter=vector_store, embedding_service=embedding_service)


def get_repo_service() -> RepoService:
    """Factory for repository service."""
    return RepoService(
        metadata_adapter=get_metadata_adapter(),
        git_client=get_git_client(),
        ingestion_service=get_ingestion_service(),
        chunking_service=get_chunking_service(),
        embedding_service=get_embedding_service(),
        chroma_adapter=get_vector_store(),
    )


def get_chat_service() -> ChatService:
    """Factory for chat service."""
    return ChatService(
        metadata_adapter=get_metadata_adapter(),
        retrieval_service=get_retrieval_service(),
        llm_client=get_llm_client(),
    )
