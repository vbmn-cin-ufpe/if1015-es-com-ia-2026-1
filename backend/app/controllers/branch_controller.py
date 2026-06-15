"""Branch analysis API endpoints — diffs a branch against a base and summarises via LLM."""

import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.middleware.auth_middleware import require_auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/repos", tags=["branch-analysis"])


# ── Request / response models ─────────────────────────────────────────────────

class BranchAnalysisRequest(BaseModel):
    branch: str
    base: str = "main"


class BranchAnalysisResponse(BaseModel):
    branch: str
    base: str
    changed_files: list[str]
    added_lines: int
    removed_lines: int
    touched_modules: list[str]
    diff_stat: str
    risk_score: float
    llm_summary: str
    llm_risk_notes: str


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post(
    "/{repository_id}/analyze-branch",
    response_model=BranchAnalysisResponse,
    dependencies=[Depends(require_auth)],
)
def analyse_branch(
    repository_id: str,
    body: BranchAnalysisRequest,
) -> BranchAnalysisResponse:
    """Diff *branch* against *base* inside the indexed repository and return an LLM summary."""
    from app.dependencies import get_llm_client, get_metadata_adapter
    from app.infrastructure.settings import get_settings
    from app.services.branch_analysis_service import BranchAnalysisService

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

    llm = get_llm_client(settings)
    service = BranchAnalysisService(llm_port=llm)

    try:
        result = service.analyse(repo_root, branch=body.branch, base=body.base)
    except Exception as exc:
        logger.error("Branch analysis failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return BranchAnalysisResponse(
        branch=result.branch,
        base=result.base,
        changed_files=result.changed_files,
        added_lines=result.added_lines,
        removed_lines=result.removed_lines,
        touched_modules=result.touched_modules,
        diff_stat=result.diff_stat,
        risk_score=result.risk_score,
        llm_summary=result.llm_summary,
        llm_risk_notes=result.llm_risk_notes,
    )
