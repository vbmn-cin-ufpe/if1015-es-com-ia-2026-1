"""Repository indexing API endpoints."""

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.dependencies import get_repo_service, get_user_repository_instance
from app.domain.enums import PlanAction
from app.middleware.auth_middleware import AuthenticatedUser, require_auth, require_plan
from app.services.models import RepositoryIndexRequest, RepositoryIndexResponse, RepositoryStatusResponse
from app.services.repo_service import RepoService

router = APIRouter(prefix="/api/repos", tags=["repos"])
logger = logging.getLogger(__name__)


@router.post("/index", response_model=RepositoryIndexResponse)
async def index_repository(
    payload: RepositoryIndexRequest,
    background_tasks: BackgroundTasks,
    repo_service: RepoService = Depends(get_repo_service),
    user: AuthenticatedUser = Depends(require_plan(PlanAction.INDEX_REPO)),
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
        # Increment quota counter (non-blocking)
        if not user.is_admin:
            get_user_repository_instance().increment_repos_count(user.user_id)
        logger.info("index job scheduled | id=%s | user=%s", result.repository_id, user.user_id)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{repository_id}/status", response_model=RepositoryStatusResponse)
def repository_status(
    repository_id: str,
    repo_service: RepoService = Depends(get_repo_service),
    user: AuthenticatedUser = Depends(require_auth),
) -> RepositoryStatusResponse:
    """Get current indexing status and stats for a repository."""
    try:
        return repo_service.get_status(repository_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
