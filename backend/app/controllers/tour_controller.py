"""Tour generation API endpoints."""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_tour_service
from app.services.models import (
    GenerateTourRequest,
    TourListResponse,
    TourResponse,
    TourSummary,
)
from app.services.tour_service import TourGenerationService

router = APIRouter(tags=["tours"])

_tours_router = APIRouter(prefix="/api/tours")
_repos_router = APIRouter(prefix="/api/repos")


def _resolve_repo_path(payload_repository_id: str, repo_url: str, repo_workspace: str) -> Path:
    """Resolve the filesystem path for a repository."""
    if repo_url.startswith("http://") or repo_url.startswith("https://"):
        return Path(repo_workspace) / payload_repository_id
    return Path(repo_url).expanduser().resolve()


@_tours_router.post("/generate", response_model=TourResponse)
def generate_tour(
    payload: GenerateTourRequest,
    tour_service: TourGenerationService = Depends(get_tour_service),
) -> TourResponse:
    """Generate a guided tour for an indexed repository.

    The tour identifies the most critical modules based on:
    - Complexity (cyclomatic complexity, LOC)
    - Churn (change frequency from git history)
    - Coupling (number of dependencies)
    """
    from app.dependencies import get_metadata_adapter
    from app.infrastructure.settings import get_settings

    try:
        metadata = get_metadata_adapter()
        settings = get_settings()

        repo_record = metadata.get_repository(payload.repository_id)
        if not repo_record:
            raise HTTPException(status_code=404, detail="Repository not found")

        if repo_record.status != "completed":
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Repository must be indexed before generating tour "
                    f"(current status: {repo_record.status})"
                ),
            )

        repo_path = _resolve_repo_path(
            payload.repository_id, repo_record.repository_url, settings.repo_workspace
        )
        if not repo_path.exists():
            raise HTTPException(status_code=404, detail="Repository files not found on disk")

        tour_data = tour_service.generate_tour(
            repository_id=payload.repository_id,
            repo_root=repo_path,
            top_k=payload.top_k,
            complexity_weight=payload.complexity_weight,
            churn_weight=payload.churn_weight,
            coupling_weight=payload.coupling_weight,
        )

        return TourResponse(**tour_data)

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@_tours_router.get("/{tour_id}", response_model=TourResponse)
def get_tour(
    tour_id: str,
    tour_service: TourGenerationService = Depends(get_tour_service),
) -> TourResponse:
    """Retrieve a previously generated tour by ID."""
    tour_data = tour_service.get_tour(tour_id)
    if tour_data is None:
        raise HTTPException(status_code=404, detail="Tour not found")
    return TourResponse(**tour_data)


@_repos_router.get("/{repository_id}/tours", response_model=TourListResponse)
def list_tours(
    repository_id: str,
    tour_service: TourGenerationService = Depends(get_tour_service),
) -> TourListResponse:
    """List all tours generated for a repository."""
    from app.dependencies import get_metadata_adapter

    metadata = get_metadata_adapter()
    repo_record = metadata.get_repository(repository_id)
    if not repo_record:
        raise HTTPException(status_code=404, detail="Repository not found")

    summaries_data = tour_service.list_tours(repository_id)
    summaries = [TourSummary(**s) for s in summaries_data]
    return TourListResponse(repository_id=repository_id, tours=summaries)


# Merge both sub-routers into the main router
router.include_router(_tours_router)
router.include_router(_repos_router)


# ── Novice tour ────────────────────────────────────────────────────────────────

_novice_router = APIRouter(prefix="/api/tours")


@_novice_router.post("/generate/novice", response_model=TourResponse)
def generate_novice_tour(
    payload: GenerateTourRequest,
    tour_service: TourGenerationService = Depends(get_tour_service),
) -> TourResponse:
    """Generate a tour optimised for someone new to the project.

    Uses low complexity_weight and high coupling_weight so that well-connected
    but simple entry-point modules come first — easier to read, yet central.
    The description and title reflect the novice framing.
    """
    from app.dependencies import get_metadata_adapter
    from app.infrastructure.settings import get_settings

    try:
        metadata = get_metadata_adapter()
        settings = get_settings()

        repo_record = metadata.get_repository(payload.repository_id)
        if not repo_record:
            raise HTTPException(status_code=404, detail="Repository not found")
        if repo_record.status != "completed":
            raise HTTPException(status_code=400, detail="Repository must be indexed first")

        repo_path = _resolve_repo_path(
            payload.repository_id, repo_record.repository_url, settings.repo_workspace
        )
        if not repo_path.exists():
            raise HTTPException(status_code=404, detail="Repository files not found on disk")

        # Novice weights: coupling first (entry points), then churn, minimal complexity penalty
        tour_data = tour_service.generate_tour(
            repository_id=payload.repository_id,
            repo_root=repo_path,
            top_k=payload.top_k,
            complexity_weight=0.15,   # low — don't penalise simple files
            churn_weight=0.25,
            coupling_weight=0.60,     # high — prefer well-connected modules
        )

        # Patch title & description for novice context
        tour_data["title"] = f"Tour para Novatos: {repo_record.repository_url}"
        tour_data["description"] = (
            f"Os {tour_data['step_count']} módulos mais acessíveis para quem está "
            "começando no projeto — priorizados por conectividade e facilidade de leitura."
        )
        for step in tour_data.get("steps", []):
            step["rationale"] = (
                "Módulo indicado para novatos: bem conectado ao restante do sistema, "
                "tornando-o um bom ponto de entrada para entender o fluxo geral. "
                + step.get("rationale", "")
            )

        return TourResponse(**tour_data)

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


router.include_router(_novice_router)

