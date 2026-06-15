"""Tech Debt controller — snapshot + history endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_settings_cached
from app.infrastructure.settings import Settings
from app.infrastructure.tech_debt_repository import TechDebtRepository
from app.middleware.auth_middleware import get_current_user
from app.services.tech_debt_service import TechDebtService

router = APIRouter(prefix="/api/repos", tags=["tech-debt"])


def _get_tech_debt_service(settings: Settings = Depends(get_settings_cached)) -> TechDebtService:
    repo = TechDebtRepository(settings)
    return TechDebtService(repo)


class SnapshotOut(BaseModel):
    id: str
    repository_id: str
    snapshot_ts: str
    avg_score: float
    total_files: int
    critical_count: int
    high_count: int
    top_files: list[dict]


@router.get("/{repository_id}/tech-debt", summary="Tech-debt score history")
async def get_tech_debt_history(
    repository_id: str,
    limit: int = 30,
    _: dict = Depends(get_current_user),
    svc: TechDebtService = Depends(_get_tech_debt_service),
) -> list[SnapshotOut]:
    history = svc.get_history(repository_id, limit=limit)
    return [
        SnapshotOut(
            id=s.id,
            repository_id=s.repository_id,
            snapshot_ts=s.snapshot_ts,
            avg_score=s.avg_score,
            total_files=s.total_files,
            critical_count=s.critical_count,
            high_count=s.high_count,
            top_files=s.top_files,
        )
        for s in history
    ]
