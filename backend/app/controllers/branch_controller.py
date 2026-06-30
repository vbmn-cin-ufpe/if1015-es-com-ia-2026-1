"""Branch analysis API endpoints — diffs a branch against a base and summarises via LLM."""

import logging
import subprocess
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.middleware.auth_middleware import require_auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/repos", tags=["branch-analysis"])


# ── Request / response models ─────────────────────────────────────────────────

class BranchListResponse(BaseModel):
    branches: list[str]
    current: str | None


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


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/{repository_id}/branches",
    response_model=BranchListResponse,
    dependencies=[Depends(require_auth)],
)
def list_branches(repository_id: str) -> BranchListResponse:
    """Return all local + remote branches for the indexed repository."""
    from app.dependencies import get_metadata_adapter
    from app.infrastructure.settings import get_settings

    metadata = get_metadata_adapter()
    record = metadata.get_repository(repository_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Repository not found")

    settings = get_settings()
    repo_root = Path(settings.repo_workspace) / repository_id
    if not repo_root.exists():
        raise HTTPException(status_code=404, detail="Repository workspace not found on disk")

    def _git(*args: str) -> str:
        r = subprocess.run(["git"] + list(args), cwd=repo_root, capture_output=True, text=True, check=False)
        return r.stdout if r.returncode == 0 else ""

    # Local branches
    raw = _git("branch", "--format=%(refname:short)")
    local = [b.strip() for b in raw.splitlines() if b.strip()]

    # Remote branches (deduplicated, strip "origin/")
    raw_remote = _git("branch", "-r", "--format=%(refname:short)")
    remote = []
    for b in raw_remote.splitlines():
        b = b.strip().removeprefix("origin/")
        if b and b not in local and "HEAD" not in b:
            remote.append(b)

    all_branches = local + remote

    # Current branch
    current_raw = _git("rev-parse", "--abbrev-ref", "HEAD").strip()
    current = current_raw if current_raw and current_raw != "HEAD" else None

    return BranchListResponse(branches=all_branches, current=current)


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
