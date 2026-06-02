"""Unit tests for tour generation service."""

from pathlib import Path
from unittest.mock import MagicMock

import pytest

from app.ports import RepositoryRecord, TourRecord, TourStepRecord
from app.services.tour_service import ModuleScoringService, TourGenerationService


def test_module_scoring_service_initialization():
    """Test that scoring service initializes with correct weights."""
    service = ModuleScoringService(
        complexity_weight=0.5,
        churn_weight=0.3,
        coupling_weight=0.2,
    )

    assert service.complexity_weight == 0.5
    assert service.churn_weight == 0.3
    assert service.coupling_weight == 0.2


def test_discover_modules():
    """Test module discovery from repo."""
    service = ModuleScoringService()

    app_path = Path(__file__).parent.parent.parent / "app"
    if app_path.exists():
        modules = service._discover_modules(app_path)

        assert isinstance(modules, dict)
        assert len(modules) > 0

        module_names = list(modules.keys())
        assert any("controllers" in name or "services" in name for name in module_names)


def test_score_module_basic():
    """Test basic module scoring."""
    service = ModuleScoringService()

    app_path = Path(__file__).parent.parent.parent / "app"
    if not app_path.exists():
        pytest.skip("App path not found")

    modules = service._discover_modules(app_path)
    if not modules:
        pytest.skip("No modules found")

    module_name, files = list(modules.items())[0]
    score_data = service.score_module(module_name, files, app_path)

    assert "module_name" in score_data
    assert "score" in score_data
    assert "complexity_score" in score_data
    assert "churn_score" in score_data
    assert "coupling_score" in score_data
    assert 0 <= score_data["score"] <= 1


def test_rank_modules():
    """Test module ranking."""
    service = ModuleScoringService()

    app_path = Path(__file__).parent.parent.parent / "app"
    if not app_path.exists():
        pytest.skip("App path not found")

    ranked = service.rank_modules(app_path, top_k=3)

    assert isinstance(ranked, list)
    assert len(ranked) <= 3

    if len(ranked) > 1:
        for i in range(len(ranked) - 1):
            assert ranked[i]["score"] >= ranked[i + 1]["score"]


def test_ranking_determinism():
    """Same repo snapshot and config must produce the same top-k order (RQ-008)."""
    app_path = Path(__file__).parent.parent.parent / "app"
    if not app_path.exists():
        pytest.skip("App path not found")

    service_a = ModuleScoringService(complexity_weight=0.4, churn_weight=0.3, coupling_weight=0.3)
    service_b = ModuleScoringService(complexity_weight=0.4, churn_weight=0.3, coupling_weight=0.3)

    ranked_a = service_a.rank_modules(app_path, top_k=5)
    ranked_b = service_b.rank_modules(app_path, top_k=5)

    assert len(ranked_a) == len(ranked_b)
    for a, b in zip(ranked_a, ranked_b):
        assert a["module_name"] == b["module_name"]
        assert abs(a["score"] - b["score"]) < 1e-9


def test_generate_tour_persists_when_repository_provided():
    """Tour generation must persist via TourRepositoryPort when wired (RQ-004)."""
    from datetime import datetime, timezone

    app_path = Path(__file__).parent.parent.parent / "app"
    if not app_path.exists():
        pytest.skip("App path not found")

    # Build a fake metadata adapter that returns a completed repo
    fake_record = RepositoryRecord(
        repository_id="test-repo",
        repository_url=str(app_path),
        status="completed",
        stats={},
        error_message=None,
        created_at=datetime.now(timezone.utc).isoformat(),
        updated_at=datetime.now(timezone.utc).isoformat(),
    )
    metadata_adapter = MagicMock()
    metadata_adapter.get_repository.return_value = fake_record

    # Fake tour repository to capture save_tour call
    tour_repo = MagicMock()

    scoring_service = ModuleScoringService()
    service = TourGenerationService(
        scoring_service=scoring_service,
        metadata_adapter=metadata_adapter,
        tour_repository=tour_repo,
    )

    tour_data = service.generate_tour(
        repository_id="test-repo",
        repo_root=app_path,
        top_k=3,
    )

    # Assert tour data is valid
    assert "tour_id" in tour_data
    assert "steps" in tour_data
    assert tour_data["repository_id"] == "test-repo"
    assert "created_at" in tour_data
    assert "config" in tour_data
    assert tour_data["config"]["top_k"] == 3

    # Assert persistence was called
    tour_repo.save_tour.assert_called_once()
    saved: TourRecord = tour_repo.save_tour.call_args[0][0]
    assert saved.tour_id == tour_data["tour_id"]
    assert saved.repository_id == "test-repo"
    assert saved.step_count == len(tour_data["steps"])


def test_generate_tour_no_persistence_when_no_repository():
    """Tour generation must work without persistence when no repo adapter provided."""
    app_path = Path(__file__).parent.parent.parent / "app"
    if not app_path.exists():
        pytest.skip("App path not found")

    from datetime import datetime, timezone

    fake_record = RepositoryRecord(
        repository_id="test-repo-2",
        repository_url=str(app_path),
        status="completed",
        stats={},
        error_message=None,
        created_at=datetime.now(timezone.utc).isoformat(),
        updated_at=datetime.now(timezone.utc).isoformat(),
    )
    metadata_adapter = MagicMock()
    metadata_adapter.get_repository.return_value = fake_record

    service = TourGenerationService(
        scoring_service=ModuleScoringService(),
        metadata_adapter=metadata_adapter,
        tour_repository=None,  # no persistence
    )

    tour_data = service.generate_tour(
        repository_id="test-repo-2",
        repo_root=app_path,
        top_k=2,
    )

    assert "tour_id" in tour_data
    # list_tours returns empty when no adapter
    assert service.list_tours("test-repo-2") == []
    # get_tour returns None when no adapter
    assert service.get_tour(tour_data["tour_id"]) is None

