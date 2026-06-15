"""Report controller — generates and serves an HTML report for a repository."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse

from app.dependencies import get_metadata_adapter
from app.middleware.auth_middleware import get_current_user
from app.ports import RepositoryMetadataPort
from app.services.report_service import ReportService

router = APIRouter(prefix="/api/repos", tags=["report"])


@router.get("/{repository_id}/report", response_class=HTMLResponse, summary="Export HTML report")
async def export_report(
    repository_id: str,
    _: dict = Depends(get_current_user),
    metadata: RepositoryMetadataPort = Depends(get_metadata_adapter),
) -> HTMLResponse:
    record = metadata.get_repository(repository_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Optional: include hotspot data if analysis was run
    hotspots: list[dict] | None = None
    try:
        from app.dependencies import get_settings_cached
        from app.infrastructure.tech_debt_repository import TechDebtRepository

        settings = get_settings_cached()
        debt_repo = TechDebtRepository(settings)
        latest = debt_repo.latest(repository_id)
        if latest:
            hotspots = latest.top_files
    except Exception:
        pass

    svc = ReportService()
    html = svc.generate(
        repository_id=repository_id,
        stats=record.stats or {},
        status=record.status,
        repository_url=record.repository_url,
        hotspots=hotspots,
    )
    return HTMLResponse(content=html, status_code=200)
