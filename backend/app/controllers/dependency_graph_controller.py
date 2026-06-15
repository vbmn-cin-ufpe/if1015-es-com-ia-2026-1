"""Dependency graph API endpoints."""

from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_graph_service
from app.middleware.auth_middleware import get_current_user, require_auth, AuthenticatedUser
from app.services.graph_orchestration_service import GraphService
from app.services.models import GraphPayloadResponse, ModuleDetailsResponse

router = APIRouter(prefix="/api/repos", tags=["dependency-graph"])


class ImpactEntry(BaseModel):
    module_path: str
    label: str
    distance: int
    direct: bool


class ImpactAnalysisResponse(BaseModel):
    module_path: str
    label: str
    affected_count: int
    max_depth_reached: int
    affected: list[ImpactEntry]


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


@router.get(
    "/{repository_id}/graph/impact",
    response_model=ImpactAnalysisResponse,
)
def get_impact_analysis(
    repository_id: str,
    module: str,
    max_depth: int = 5,
    graph_service: GraphService = Depends(get_graph_service),
) -> ImpactAnalysisResponse:
    """Return all modules that (directly or transitively) depend on *module*.

    Useful for answering: "if I change this file, what else might break?"
    """
    from app.dependencies import get_metadata_adapter
    from app.infrastructure.settings import get_settings

    metadata = get_metadata_adapter()
    repo_record = metadata.get_repository(repository_id)
    if not repo_record:
        raise HTTPException(status_code=404, detail="Repository not found")
    if repo_record.status != "completed":
        raise HTTPException(status_code=400, detail="Repository must be indexed first")

    # Ensure the graph exists (generate on-the-fly if needed)
    settings = get_settings()
    repo_url = repo_record.repository_url
    if repo_url.startswith("http://") or repo_url.startswith("https://"):
        repo_path = Path(settings.repo_workspace) / repository_id
    else:
        repo_path = Path(repo_url).expanduser().resolve()

    graph_service.get_graph(repository_id=repository_id, repo_root=repo_path)

    result = graph_service.get_impact_analysis(
        repository_id=repository_id,
        module_path=module,
        max_depth=max(1, min(max_depth, 10)),
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Graph not available for this repository")

    return ImpactAnalysisResponse(**result)


# ── Graph snapshots list ──────────────────────────────────────────────────────

class SnapshotMeta(BaseModel):
    snapshot_id: str
    created_at: str
    node_count: int = 0
    edge_count: int = 0


@router.get("/{repository_id}/graph/snapshots", response_model=list[SnapshotMeta])
def list_graph_snapshots(
    repository_id: str,
    graph_service: GraphService = Depends(get_graph_service),
    _: AuthenticatedUser = Depends(require_auth),
) -> list[SnapshotMeta]:
    """List all saved graph snapshots for a repository."""
    from app.dependencies import get_graph_repository

    graph_repo = get_graph_repository()
    raw = graph_repo.list_snapshots(repository_id)
    # list_snapshots returns basic dicts; try to enrich with counts
    enriched: list[SnapshotMeta] = []
    for s in raw:
        sid = s.get("snapshot_id", "")
        snap = graph_repo.get_graph(repository_id, sid) or {}
        enriched.append(SnapshotMeta(
            snapshot_id=sid,
            created_at=s.get("created_at", ""),
            node_count=snap.get("node_count", 0),
            edge_count=snap.get("edge_count", 0),
        ))
    return enriched


# ── Architecture Drift ────────────────────────────────────────────────────────

class NodeChangeOut(BaseModel):
    node_id: str
    label: str
    change: str


class EdgeChangeOut(BaseModel):
    source: str
    target: str
    change: str


class DriftReportOut(BaseModel):
    repository_id: str
    snapshot_a_id: str
    snapshot_b_id: str
    snapshot_a_ts: str
    snapshot_b_ts: str
    nodes_added: list[NodeChangeOut]
    nodes_removed: list[NodeChangeOut]
    nodes_unchanged: int
    edges_added: list[EdgeChangeOut]
    edges_removed: list[EdgeChangeOut]
    edges_unchanged: int
    drift_score: float


@router.get("/{repository_id}/graph/diff", response_model=DriftReportOut)
def graph_diff(
    repository_id: str,
    snapshot_a: str,
    snapshot_b: str,
    _: AuthenticatedUser = Depends(require_auth),
) -> DriftReportOut:
    """Compare two graph snapshots and return the architecture diff."""
    from app.dependencies import get_graph_repository
    from app.services.architecture_drift_service import ArchitectureDriftService

    graph_repo = get_graph_repository()
    snap_a = graph_repo.get_graph(repository_id, snapshot_a)
    snap_b = graph_repo.get_graph(repository_id, snapshot_b)

    if snap_a is None:
        raise HTTPException(status_code=404, detail=f"Snapshot {snapshot_a} not found")
    if snap_b is None:
        raise HTTPException(status_code=404, detail=f"Snapshot {snapshot_b} not found")

    svc = ArchitectureDriftService()
    report = svc.compare(repository_id, snap_a, snap_b)

    return DriftReportOut(
        repository_id=report.repository_id,
        snapshot_a_id=report.snapshot_a_id,
        snapshot_b_id=report.snapshot_b_id,
        snapshot_a_ts=report.snapshot_a_ts,
        snapshot_b_ts=report.snapshot_b_ts,
        nodes_added=[NodeChangeOut(**vars(n)) for n in report.nodes_added],
        nodes_removed=[NodeChangeOut(**vars(n)) for n in report.nodes_removed],
        nodes_unchanged=report.nodes_unchanged,
        edges_added=[EdgeChangeOut(**vars(e)) for e in report.edges_added],
        edges_removed=[EdgeChangeOut(**vars(e)) for e in report.edges_removed],
        edges_unchanged=report.edges_unchanged,
        drift_score=report.drift_score,
    )


# ── Drift LLM Interpretation ─────────────────────────────────────────────────

class DriftInterpretRequest(BaseModel):
    snapshot_a: str
    snapshot_b: str


class DriftInterpretResponse(BaseModel):
    interpretation: str


@router.post("/{repository_id}/graph/diff/interpret", response_model=DriftInterpretResponse)
def interpret_graph_diff(
    repository_id: str,
    body: DriftInterpretRequest,
    _: AuthenticatedUser = Depends(require_auth),
) -> DriftInterpretResponse:
    """Ask the LLM to interpret architectural changes between two graph snapshots."""
    from app.dependencies import get_graph_repository, get_llm_client
    from app.services.architecture_drift_service import ArchitectureDriftService

    graph_repo = get_graph_repository()
    snap_a = graph_repo.get_graph(repository_id, body.snapshot_a)
    snap_b = graph_repo.get_graph(repository_id, body.snapshot_b)

    if snap_a is None:
        raise HTTPException(status_code=404, detail=f"Snapshot {body.snapshot_a} not found")
    if snap_b is None:
        raise HTTPException(status_code=404, detail=f"Snapshot {body.snapshot_b} not found")

    svc = ArchitectureDriftService()
    report = svc.compare(repository_id, snap_a, snap_b)

    llm = get_llm_client()
    total_elements = (
        len(report.nodes_added) + len(report.nodes_removed) + report.nodes_unchanged +
        len(report.edges_added) + len(report.edges_removed) + report.edges_unchanged
    )
    added_nodes = ", ".join(n.label for n in report.nodes_added[:20]) or "nenhum"
    removed_nodes = ", ".join(n.label for n in report.nodes_removed[:20]) or "nenhum"
    added_edges = "; ".join(f"{e.source}→{e.target}" for e in report.edges_added[:15]) or "nenhuma"
    removed_edges = "; ".join(f"{e.source}→{e.target}" for e in report.edges_removed[:15]) or "nenhuma"

    context_chunk = {
        "chunk_id": "drift-report",
        "text": (
            f"Repositório: {repository_id}\n"
            f"Snapshot A (base): {report.snapshot_a_ts}\n"
            f"Snapshot B (atual): {report.snapshot_b_ts}\n"
            f"Score de drift: {report.drift_score:.1f}% ({total_elements} elementos no total)\n\n"
            f"Módulos adicionados ({len(report.nodes_added)}): {added_nodes}\n"
            f"Módulos removidos ({len(report.nodes_removed)}): {removed_nodes}\n"
            f"Módulos inalterados: {report.nodes_unchanged}\n\n"
            f"Dependências adicionadas ({len(report.edges_added)}): {added_edges}\n"
            f"Dependências removidas ({len(report.edges_removed)}): {removed_edges}\n"
            f"Dependências inalteradas: {report.edges_unchanged}\n"
        ),
        "metadata": {"file_path": "architecture-drift", "start_line": 0, "end_line": 0},
        "score": 1.0,
    }

    interpretation = llm.generate_answer(
        question=(
            "Analise este relatório de drift arquitetural entre dois snapshots do grafo de dependências. "
            "Explique: (1) o que mudou na arquitetura, (2) o impacto das mudanças nos módulos e dependências, "
            "(3) se o drift é preocupante ou esperado, (4) recomendações para a equipe. "
            "Seja objetivo e use bullet points. Escreva em Português do Brasil."
        ),
        context_chunks=[context_chunk],
    )

    return DriftInterpretResponse(interpretation=interpretation)

