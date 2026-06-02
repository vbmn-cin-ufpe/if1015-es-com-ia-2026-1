"""E2E test for commit history timeline and why-explanation flow."""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.ports import RepositoryRecord
from app.services.commit_history_service import CommitDecision


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def indexed_repo():
    return RepositoryRecord(
        repository_id="e2e-history-repo",
        repository_url="/tmp/e2e-repo",
        status="completed",
    )


@pytest.fixture
def sample_decisions():
    return [
        CommitDecision(
            id="d1",
            commit_id="aaa111",
            repository_id="e2e-history-repo",
            timestamp="2024-03-10T14:00:00",
            category="bugfix",
            confidence=0.92,
            summary="Fix null check in authentication handler",
            touched_modules=["src/auth.py", "src/middleware.py"],
        ),
        CommitDecision(
            id="d2",
            commit_id="bbb222",
            repository_id="e2e-history-repo",
            timestamp="2024-03-11T09:30:00",
            category="feature",
            confidence=0.88,
            summary="Add rate limiting to API endpoints",
            touched_modules=["src/middleware.py", "src/config.py"],
        ),
        CommitDecision(
            id="d3",
            commit_id="ccc333",
            repository_id="e2e-history-repo",
            timestamp="2024-03-12T16:45:00",
            category="refactor",
            confidence=0.75,
            summary="Extract database connection pooling logic",
            touched_modules=["src/db.py"],
        ),
    ]


class TestHistoryE2E:
    """End-to-end flow: ingest commits → get timeline → ask why."""

    def test_full_timeline_and_why_flow(
        self, client, indexed_repo, sample_decisions
    ):
        """Full flow: load timeline → filter → ask why."""
        with (
            patch("app.controllers.history_controller.get_metadata_adapter") as mock_meta,
            patch("app.controllers.history_controller.get_settings") as mock_settings,
            patch(
                "app.services.history_orchestration_service.HistoryService._ensure_decisions"
            ) as mock_ensure,
        ):
            mock_meta.return_value.get_repository.return_value = indexed_repo
            mock_settings.return_value.repo_workspace = "/tmp/workspaces"
            mock_ensure.return_value = sample_decisions

            # Step 1: Load full timeline
            resp = client.get("/api/repos/e2e-history-repo/history/timeline")
            assert resp.status_code == 200
            data = resp.json()
            assert data["total"] == 3
            assert data["entries"][0]["timestamp"] == "2024-03-12T16:45:00"

            # Step 2: Filter by module
            resp = client.get(
                "/api/repos/e2e-history-repo/history/timeline?module_path=src/middleware.py"
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["total"] == 2
            for entry in data["entries"]:
                assert "src/middleware.py" in entry["touched_modules"]

            # Step 3: Filter by category
            resp = client.get(
                "/api/repos/e2e-history-repo/history/timeline?category=bugfix"
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["total"] == 1
            assert data["entries"][0]["category"] == "bugfix"

            # Step 4: Ask why
            resp = client.post(
                "/api/repos/e2e-history-repo/history/why",
                json={
                    "module_path": "src/middleware.py",
                    "question": "Why does this module change so often?",
                },
            )
            assert resp.status_code == 200
            why = resp.json()
            assert why["module_path"] == "src/middleware.py"
            assert why["confidence"] > 0
            assert len(why["supporting_commits"]) == 2
            assert "explanation" in why
            assert len(why["explanation"]) > 0
