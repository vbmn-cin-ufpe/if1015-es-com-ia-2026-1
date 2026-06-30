"""Tech Debt controller — snapshot + history endpoints."""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_llm_client, get_metadata_adapter, get_settings_cached
from app.infrastructure.settings import Settings
from app.infrastructure.tech_debt_repository import TechDebtRepository, TechDebtSnapshot
from app.middleware.auth_middleware import get_current_user
from app.services.tech_debt_service import TechDebtService

router = APIRouter(prefix="/api/repos", tags=["tech-debt"])


def _get_tech_debt_service(settings: Settings = Depends(get_settings_cached)) -> TechDebtService:
    repo = TechDebtRepository(settings)
    llm = get_llm_client(settings)
    return TechDebtService(repo, llm_client=llm)


class SnapshotOut(BaseModel):
    id: str
    repository_id: str
    snapshot_ts: str
    avg_score: float
    total_files: int
    critical_count: int
    high_count: int
    top_files: list[dict]
    avg_complexity: float = 0.0
    avg_churn: float = 0.0
    avg_loc: float = 0.0
    comment_ratio: float = 0.0
    coupling_score: float = 0.0
    debt_trend: str = "stable"
    llm_summary: str = ""
    debt_breakdown: dict = {}


def _to_out(s: TechDebtSnapshot) -> SnapshotOut:
    return SnapshotOut(
        id=s.id,
        repository_id=s.repository_id,
        snapshot_ts=s.snapshot_ts,
        avg_score=s.avg_score,
        total_files=s.total_files,
        critical_count=s.critical_count,
        high_count=s.high_count,
        top_files=s.top_files,
        avg_complexity=s.avg_complexity,
        avg_churn=s.avg_churn,
        avg_loc=s.avg_loc,
        comment_ratio=s.comment_ratio,
        coupling_score=s.coupling_score,
        debt_trend=s.debt_trend,
        llm_summary=s.llm_summary,
        debt_breakdown=s.debt_breakdown,
    )


@router.get("/{repository_id}/tech-debt", summary="Tech-debt score history")
async def get_tech_debt_history(
    repository_id: str,
    limit: int = 30,
    _: dict = Depends(get_current_user),
    svc: TechDebtService = Depends(_get_tech_debt_service),
) -> list[SnapshotOut]:
    history = svc.get_history(repository_id, limit=limit)
    return [_to_out(s) for s in history]


@router.post("/{repository_id}/tech-debt/analyse", summary="Trigger full tech-debt analysis with AI summary")
async def analyse_tech_debt(
    repository_id: str,
    _: dict = Depends(get_current_user),
    settings: Settings = Depends(get_settings_cached),
    svc: TechDebtService = Depends(_get_tech_debt_service),
) -> SnapshotOut:
    """Run a full tech-debt analysis for the repository and persist a new snapshot.

    Calculates complexity, churn, coupling, documentation ratio, debt breakdown
    by category, trend direction, and generates an AI summary (PROMPT-007).
    """
    metadata = get_metadata_adapter(settings)
    record = metadata.get_repository(repository_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Repositorio nao encontrado")
    if record.status != "completed":
        raise HTTPException(
            status_code=409,
            detail=f"O repositorio precisa estar indexado para analise (status={record.status})",
        )

    repo_root = Path(settings.repo_workspace) / repository_id
    if not repo_root.exists():
        raise HTTPException(status_code=404, detail="Arquivos do repositorio nao encontrados no disco")

    try:
        snapshot = svc.analyse_and_save(repository_id, repo_root)
        return _to_out(snapshot)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro na analise: {exc}") from exc
