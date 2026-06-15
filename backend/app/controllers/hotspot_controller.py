"""Hotspot analysis API endpoints — top files ranked by churn × complexity."""

import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.middleware.auth_middleware import require_auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/repos", tags=["hotspots"])


# ── Response models ────────────────────────────────────────────────────────────

class FileHotspotResponse(BaseModel):
    file_path: str
    churn: int
    complexity: float
    loc: int
    hotspot_score: float
    language: str


class HotspotAnalysisResponse(BaseModel):
    repository_id: str
    repo_root: str
    churn_months: int
    total_files_scanned: int
    hotspots: list[FileHotspotResponse]


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.get(
    "/{repository_id}/hotspots",
    response_model=HotspotAnalysisResponse,
    dependencies=[Depends(require_auth)],
)
def get_hotspots(
    repository_id: str,
    top_n: int = 30,
    churn_months: int = 6,
) -> HotspotAnalysisResponse:
    """Return the top-N hotspot files (highest churn × complexity) for a repository."""
    from app.dependencies import get_metadata_adapter
    from app.infrastructure.settings import get_settings
    from app.services.hotspot_service import HotspotService

    metadata = get_metadata_adapter()
    record = metadata.get_repository(repository_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Repository not found")
    if record.status != "completed":
        raise HTTPException(
            status_code=409,
            detail=f"Repository not fully indexed (status={record.status})",
        )

    settings = get_settings()
    repo_root = Path(settings.repo_workspace) / repository_id
    if not repo_root.exists():
        raise HTTPException(status_code=404, detail="Repository workspace not found on disk")

    service = HotspotService(churn_months=churn_months, top_n=top_n)
    hotspots = service.analyse(repo_root)

    return HotspotAnalysisResponse(
        repository_id=repository_id,
        repo_root=str(repo_root),
        churn_months=churn_months,
        total_files_scanned=len(hotspots),
        hotspots=[
            FileHotspotResponse(
                file_path=h.relative_path,
                churn=h.churn,
                complexity=h.complexity,
                loc=h.loc,
                hotspot_score=h.hotspot_score,
                language=h.language,
            )
            for h in hotspots
        ],
    )
