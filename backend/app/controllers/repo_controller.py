"""Repository indexing API endpoints."""

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.dependencies import get_repo_service
from app.services.models import RepositoryIndexRequest, RepositoryIndexResponse, RepositoryStatusResponse
from app.services.repo_service import RepoService

router = APIRouter(prefix="/api/repos", tags=["repos"])
logger = logging.getLogger(__name__)


@router.post("/index", response_model=RepositoryIndexResponse)
async def index_repository(
    payload: RepositoryIndexRequest,
    background_tasks: BackgroundTasks,
    repo_service: RepoService = Depends(get_repo_service),
) -> RepositoryIndexResponse:
    """Queue a repository for indexing and return immediately.

    The actual work (clone → detect → chunk → embed → store) runs as a
    background task.  Clients should poll ``GET /api/repos/{id}/status``
    to track progress.
    """
    try:
        result = repo_service.queue_index(payload.repository_url)
        background_tasks.add_task(
            repo_service.run_index, result.repository_id, payload.repository_url
        )
        logger.info("index job scheduled | id=%s", result.repository_id)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{repository_id}/status", response_model=RepositoryStatusResponse)
def repository_status(
    repository_id: str,
    repo_service: RepoService = Depends(get_repo_service),
) -> RepositoryStatusResponse:
    """Get current indexing status and stats for a repository."""
    try:
        return repo_service.get_status(repository_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
