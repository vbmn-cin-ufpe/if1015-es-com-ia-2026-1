"""Domain ports (interfaces) following Hexagonal Architecture and Dependency Inversion Principle."""

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol


@dataclass
class RepositoryRecord:
    """Domain model for repository metadata.
    
    This is a domain entity that represents repository state across
    the persistence boundary. Defined here to avoid coupling infrastructure
    to service models.
    """

    repository_id: str
    repository_url: str
    status: str
    stats: dict[str, Any]
    error_message: str | None
    created_at: str
    updated_at: str


class RepositoryMetadataPort(Protocol):
    """Interface for repository metadata persistence."""

    def create_repository(self, repository_id: str, repository_url: str, status: str) -> RepositoryRecord:
        """Create a new repository record."""
        ...

    def get_repository(self, repository_id: str) -> RepositoryRecord | None:
        """Retrieve a repository record by ID."""
        ...

    def update_repository_status(
        self,
        repository_id: str,
        status: str,
        stats: dict[str, Any] | None = None,
        error_message: str | None = None,
    ) -> None:
        """Update repository indexing status."""
        ...


class VectorStorePort(Protocol):
    """Interface for vector database operations."""

    def upsert_chunks(self, repository_id: str, vectors: list[dict[str, Any]]) -> None:
        """Store or update vector embeddings for a repository."""
        ...

    def query(self, repository_id: str, embedding: list[float], top_k: int) -> list[dict[str, Any]]:
        """Query similar vectors by embedding."""
        ...


class GitClientPort(Protocol):
    """Interface for Git operations."""

    def prepare_repository(self, repository_ref: str, repository_id: str) -> Path:
        """Clone or prepare a repository for indexing.
        
        Args:
            repository_ref: Git URL or local path
            repository_id: Unique identifier for this repository
            
        Returns:
            Path object pointing to the prepared repository directory
        """
        ...


class EmbeddingPort(Protocol):
    """Interface for text embedding generation."""

    def embed_text(self, text: str) -> list[float]:
        """Generate embedding vector for text."""
        ...

    def embed_chunks(self, chunks: list[dict]) -> list[dict]:
        """Generate embeddings for a batch of chunks."""
        ...


class LLMPort(Protocol):
    """Interface for LLM text generation."""

    def generate_answer(self, question: str, context_chunks: list[dict[str, Any]]) -> str:
        """Generate answer based on question and retrieved context."""
        ...


@dataclass
class TourStepRecord:
    """Domain model for a single guided tour step."""

    step_id: str
    tour_id: str
    position: int
    module_path: str
    title: str
    score: float
    rationale: str
    recommendations: list[str]
    metrics: dict[str, Any]


@dataclass
class TourRecord:
    """Domain model for a generated guided tour."""

    tour_id: str
    repository_id: str
    title: str
    description: str
    step_count: int
    config: dict[str, Any]
    created_at: str
    steps: list[TourStepRecord]


class TourRepositoryPort(Protocol):
    """Interface for tour persistence."""

    def save_tour(self, tour: "TourRecord") -> None:
        """Persist a tour and its steps."""
        ...

    def get_tour(self, tour_id: str) -> "TourRecord | None":
        """Retrieve a tour by ID including steps."""
        ...

    def list_tours(self, repository_id: str) -> "list[TourRecord]":
        """List all tours for a repository (without steps)."""
        ...


class GraphRepositoryPort(Protocol):
    """Interface for dependency graph snapshot persistence."""

    def save_graph(self, repository_id: str, graph_payload: dict[str, Any]) -> None:
        """Persist a graph snapshot."""
        ...

    def get_graph(self, repository_id: str, snapshot_id: str | None = None) -> dict[str, Any] | None:
        """Retrieve graph snapshot (latest if snapshot_id is None)."""
        ...

    def list_snapshots(self, repository_id: str) -> list[dict[str, str]]:
        """List available graph snapshots for a repository."""
        ...
