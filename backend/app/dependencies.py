"""Dependency injection container using FastAPI Depends pattern."""

from functools import lru_cache

from app.infrastructure.chroma_adapter import ChromaAdapter
from app.infrastructure.git_client import GitClient
from app.infrastructure.graph_repository_adapter import GraphRepositoryAdapter
from app.infrastructure.llm_client import LlmClient
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


def get_llm_client(settings: Settings | None = None) -> LLMPort:
    """Factory for LLM client."""
    if settings is None:
        settings = get_settings_cached()
    return LlmClient(settings)


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
