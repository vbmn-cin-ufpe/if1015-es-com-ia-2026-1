"""Repository indexing API endpoints."""

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_repo_service
from app.services.models import RepositoryIndexRequest, RepositoryIndexResponse, RepositoryStatusResponse
from app.services.repo_service import RepoService

router = APIRouter(prefix="/api/repos", tags=["repos"])


@router.post("/index", response_model=RepositoryIndexResponse)
def index_repository(
    payload: RepositoryIndexRequest,
    repo_service: RepoService = Depends(get_repo_service),
) -> RepositoryIndexResponse:
    """Start indexing a repository."""
    try:
        return repo_service.start_index(payload.repository_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{repository_id}/status", response_model=RepositoryStatusResponse)
def repository_status(
    repository_id: str,
    repo_service: RepoService = Depends(get_repo_service),
) -> RepositoryStatusResponse:
    """Get repository indexing status."""
    try:
        return repo_service.get_status(repository_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc