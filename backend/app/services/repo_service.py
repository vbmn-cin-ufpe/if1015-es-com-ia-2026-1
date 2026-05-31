from uuid import uuid4

from app.infrastructure.chroma_adapter import ChromaAdapter
from app.infrastructure.git_client import GitClient
from app.infrastructure.postgres_adapter import PostgresAdapter
from app.infrastructure.settings import get_settings
from app.services.chunking_service import ChunkingService
from app.services.embedding_service import EmbeddingService
from app.services.ingestion_service import IngestionService
from app.services.models import RepositoryIndexResponse, RepositoryStatusResponse


class RepoService:
    def __init__(
        self,
        metadata_adapter: PostgresAdapter,
        git_client: GitClient,
        ingestion_service: IngestionService,
        chunking_service: ChunkingService,
        embedding_service: EmbeddingService,
        chroma_adapter: ChromaAdapter,
    ) -> None:
        self._settings = get_settings()
        self._metadata = metadata_adapter
        self._git = git_client
        self._ingestion = ingestion_service
        self._chunking = chunking_service
        self._embedding = embedding_service
        self._chroma = chroma_adapter

    def start_index(self, repository_url: str) -> RepositoryIndexResponse:
        self._validate_repository_ref(repository_url)
        repository_id = str(uuid4())
        self._metadata.create_repository(repository_id=repository_id, repository_url=repository_url, status="queued")
        self._metadata.update_repository_status(repository_id=repository_id, status="running", stats={})
        try:
            repo_path = self._git.prepare_repository(repository_url, repository_id)
            python_files = self._ingestion.collect_python_files(repo_path)
            chunks = self._chunking.build_chunks(repo_path, python_files)
            vectors = self._embedding.embed_chunks(chunks)
            self._chroma.upsert_chunks(repository_id=repository_id, vectors=vectors)
            stats = {
                "python_files": len(python_files),
                "chunks": len(chunks),
                "vectors": len(vectors),
            }
            self._metadata.update_repository_status(repository_id=repository_id, status="completed", stats=stats)
            return RepositoryIndexResponse(repository_id=repository_id, job_status="completed")
        except Exception as exc:
            self._metadata.update_repository_status(
                repository_id=repository_id,
                status="failed",
                stats={},
                error_message=str(exc),
            )
            return RepositoryIndexResponse(repository_id=repository_id, job_status="failed")

    def get_status(self, repository_id: str) -> RepositoryStatusResponse:
        record = self._metadata.get_repository(repository_id)
        if record is None:
            raise ValueError("repository not found")
        return RepositoryStatusResponse(
            repository_id=record.repository_id,
            index_status=record.status,
            stats=record.stats,
            error_message=record.error_message,
        )

    def _validate_repository_ref(self, repository_ref: str) -> None:
        value = repository_ref.strip()
        if value.startswith("http://") or value.startswith("https://"):
            return
        if self._settings.allow_local_repos:
            return
        raise ValueError("repository_url must be a valid http(s) URL")