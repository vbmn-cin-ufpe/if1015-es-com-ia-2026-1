from fastapi import APIRouter, HTTPException

from app.infrastructure.chroma_adapter import ChromaAdapter
from app.infrastructure.git_client import GitClient
from app.infrastructure.postgres_adapter import PostgresAdapter
from app.services.chunking_service import ChunkingService
from app.services.embedding_service import EmbeddingService
from app.services.ingestion_service import IngestionService
from app.services.models import RepositoryIndexRequest, RepositoryIndexResponse, RepositoryStatusResponse
from app.services.repo_service import RepoService

router = APIRouter(prefix="/api/repos", tags=["repos"])

_repo_service = RepoService(
    metadata_adapter=PostgresAdapter(),
    git_client=GitClient(),
    ingestion_service=IngestionService(),
    chunking_service=ChunkingService(),
    embedding_service=EmbeddingService(),
    chroma_adapter=ChromaAdapter(),
)


@router.post("/index", response_model=RepositoryIndexResponse)
def index_repository(payload: RepositoryIndexRequest) -> RepositoryIndexResponse:
    try:
        return _repo_service.start_index(payload.repository_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{repository_id}/status", response_model=RepositoryStatusResponse)
def repository_status(repository_id: str) -> RepositoryStatusResponse:
    try:
        return _repo_service.get_status(repository_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc