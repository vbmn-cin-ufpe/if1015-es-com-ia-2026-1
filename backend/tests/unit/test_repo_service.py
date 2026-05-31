from app.infrastructure.chroma_adapter import ChromaAdapter
from app.infrastructure.git_client import GitClient
from app.infrastructure.postgres_adapter import PostgresAdapter
from app.services.chunking_service import ChunkingService
from app.services.embedding_service import EmbeddingService
from app.services.ingestion_service import IngestionService
from app.services.repo_service import RepoService


def test_start_index_local_path() -> None:
    service = RepoService(
        metadata_adapter=PostgresAdapter(),
        git_client=GitClient(),
        ingestion_service=IngestionService(),
        chunking_service=ChunkingService(),
        embedding_service=EmbeddingService(),
        chroma_adapter=ChromaAdapter(),
    )
    result = service.start_index("app")
    assert result.repository_id
    assert result.job_status in {"completed", "failed"}