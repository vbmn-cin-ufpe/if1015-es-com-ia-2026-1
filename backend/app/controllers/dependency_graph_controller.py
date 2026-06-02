"""Dependency graph API endpoints."""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_graph_service
from app.services.graph_orchestration_service import GraphService
from app.services.models import GraphPayloadResponse, ModuleDetailsResponse

router = APIRouter(prefix="/api/repos", tags=["dependency-graph"])


@router.get("/{repository_id}/dependency-graph", response_model=GraphPayloadResponse)
def get_dependency_graph(
    repository_id: str,
    snapshot_id: str | None = None,
    graph_service: GraphService = Depends(get_graph_service),
) -> GraphPayloadResponse:
    """Retrieve the dependency graph for a repository.

    If no snapshot exists, generates one on-the-fly.
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
            detail=f"Repository must be indexed before generating graph (status: {repo_record.status})",
        )

    # Resolve repo path
    repo_url = repo_record.repository_url
    if repo_url.startswith("http://") or repo_url.startswith("https://"):
        repo_path = Path(settings.repo_workspace) / repository_id
    else:
        repo_path = Path(repo_url).expanduser().resolve()

    graph = graph_service.get_graph(
        repository_id=repository_id,
        snapshot_id=snapshot_id,
        repo_root=repo_path,
    )
    if not graph:
        raise HTTPException(status_code=404, detail="Dependency graph not available")

    return GraphPayloadResponse(**graph)


@router.get(
    "/{repository_id}/modules/{module_path:path}/dependencies",
    response_model=ModuleDetailsResponse,
)
def get_module_dependencies(
    repository_id: str,
    module_path: str,
    snapshot_id: str | None = None,
    graph_service: GraphService = Depends(get_graph_service),
) -> ModuleDetailsResponse:
    """Retrieve dependency details for a specific module."""
    from app.dependencies import get_metadata_adapter

    metadata = get_metadata_adapter()
    repo_record = metadata.get_repository(repository_id)
    if not repo_record:
        raise HTTPException(status_code=404, detail="Repository not found")

    details = graph_service.get_module_details(
        repository_id=repository_id,
        module_path=module_path,
        snapshot_id=snapshot_id,
    )
    if not details:
        raise HTTPException(status_code=404, detail="Module not found in graph")

    return ModuleDetailsResponse(**details)
