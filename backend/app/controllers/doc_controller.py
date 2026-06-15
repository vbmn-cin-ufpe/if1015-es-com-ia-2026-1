"""Documentation generation API endpoints — produces module README via LLM."""

import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.domain.enums import PlanAction
from app.middleware.auth_middleware import require_plan

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/repos", tags=["doc-generator"])


# ── Request / response models ─────────────────────────────────────────────────

class DocGenerateRequest(BaseModel):
    module_path: str      # e.g. "app/services/auth_service.py" or "services"


class DocGenerateResponse(BaseModel):
    repository_id: str
    module_path: str
    documentation: str    # raw Markdown


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post(
    "/{repository_id}/generate-doc",
    response_model=DocGenerateResponse,
    dependencies=[Depends(require_plan(PlanAction.ASK_QUESTION))],  # same plan gate as chat
)
def generate_doc(
    repository_id: str,
    body: DocGenerateRequest,
) -> DocGenerateResponse:
    """Generate Markdown documentation for a module using code chunks + commit history."""
    from app.dependencies import (
        get_embedding_service,
        get_llm_client,
        get_metadata_adapter,
        get_vector_store,
    )
    from app.infrastructure.settings import get_settings
    from app.services.doc_generator_service import DocGeneratorService

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
    vector_store = get_vector_store(settings)
    llm = get_llm_client(settings)
    embedding = get_embedding_service(settings)

    service = DocGeneratorService(
        vector_store=vector_store,
        llm_port=llm,
        embedding_port=embedding,
    )

    # Optionally provide the repo root for git log context
    repo_root = Path(settings.repo_workspace) / repository_id
    if not repo_root.exists():
        repo_root = None  # graceful degradation: skip commit history

    try:
        documentation = service.generate_module_doc(
            repository_id=repository_id,
            module_path=body.module_path,
            repo_root=repo_root,
        )
    except Exception as exc:
        logger.error("Doc generation failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return DocGenerateResponse(
        repository_id=repository_id,
        module_path=body.module_path,
        documentation=documentation,
    )
