"""History API endpoints — timeline and why-explanation."""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_history_service
from app.services.models import (
    TimelineEntry,
    TimelineResponse,
    WhyRequest,
    WhyResponse,
)

router = APIRouter(prefix="/api/repos", tags=["history"])


@router.get("/{repository_id}/history/timeline", response_model=TimelineResponse)
def get_timeline(
    repository_id: str,
    module_path: str | None = None,
    category: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
    history_service=Depends(get_history_service),
) -> TimelineResponse:
    """Retrieve the decision timeline for a repository.

    Optional filters: module_path, category, search (text). Results ordered newest-first.
    """
    from app.dependencies import get_metadata_adapter
    from app.infrastructure.settings import get_settings

    metadata = get_metadata_adapter()
    settings = get_settings()

    repo_record = metadata.get_repository(repository_id)
    if not repo_record:
        raise HTTPException(status_code=404, detail="Repository not found")

    if repo_record.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Repository must be indexed (status: {repo_record.status})",
        )

    # Resolve repo path for ingestion if needed
    repo_url = repo_record.repository_url
    if repo_url.startswith("http://") or repo_url.startswith("https://"):
        repo_path = Path(settings.repo_workspace) / repository_id
    else:
        repo_path = Path(repo_url).expanduser().resolve()

    entries, total = history_service.get_timeline(
        repository_id=repository_id,
        repo_root=repo_path,
        module_path=module_path,
        category=category,
        search=search,
        limit=limit,
        offset=offset,
    )

    return TimelineResponse(
        repository_id=repository_id,
        module_path=module_path,
        category=category,
        total=total,
        offset=offset,
        entries=[TimelineEntry(**e) for e in entries],
    )


@router.delete("/{repository_id}/history/cache")
def clear_history_cache(
    repository_id: str,
    history_service=Depends(get_history_service),
) -> dict:
    """Delete cached commit decisions so the next timeline call re-ingests from git (full history)."""
    deleted = history_service.clear_cache(repository_id)
    return {"deleted": deleted, "message": f"Cache cleared ({deleted} decisions). Next request will re-ingest full history."}


@router.post("/{repository_id}/history/why", response_model=WhyResponse)
def get_why_explanation(
    repository_id: str,
    payload: WhyRequest,
    history_service=Depends(get_history_service),
) -> WhyResponse:
    """Get a why-explanation for a module based on commit history."""
    from app.dependencies import get_metadata_adapter
    from app.infrastructure.settings import get_settings

    metadata = get_metadata_adapter()
    settings = get_settings()

    repo_record = metadata.get_repository(repository_id)
    if not repo_record:
        raise HTTPException(status_code=404, detail="Repository not found")

    if repo_record.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Repository must be indexed (status: {repo_record.status})",
        )

    repo_url = repo_record.repository_url
    if repo_url.startswith("http://") or repo_url.startswith("https://"):
        repo_path = Path(settings.repo_workspace) / repository_id
    else:
        repo_path = Path(repo_url).expanduser().resolve()

    result = history_service.explain_why(
        repository_id=repository_id,
        repo_root=repo_path,
        module_path=payload.module_path,
        question=payload.question,
    )

    return WhyResponse(**result)
