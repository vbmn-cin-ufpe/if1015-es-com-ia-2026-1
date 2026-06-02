"""Integration tests for History API endpoints."""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.ports import RepositoryRecord


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def mock_repo_record():
    return RepositoryRecord(
        repository_id="test-repo-001",
        repository_url="/tmp/test-repo",
        status="completed",
    )


class TestTimelineEndpoint:
    """Tests for GET /api/repos/{id}/history/timeline."""

    def test_timeline_returns_entries(self, client, mock_repo_record):
        with (
            patch("app.controllers.history_controller.get_metadata_adapter") as mock_meta,
            patch("app.controllers.history_controller.get_settings") as mock_settings,
        ):
            mock_meta.return_value.get_repository.return_value = mock_repo_record
            mock_settings.return_value.repo_workspace = "/tmp/workspaces"

            resp = client.get("/api/repos/test-repo-001/history/timeline")
            assert resp.status_code == 200
            data = resp.json()
            assert "entries" in data
            assert "total" in data
            assert data["repository_id"] == "test-repo-001"

    def test_timeline_with_filters(self, client, mock_repo_record):
        with (
            patch("app.controllers.history_controller.get_metadata_adapter") as mock_meta,
            patch("app.controllers.history_controller.get_settings") as mock_settings,
        ):
            mock_meta.return_value.get_repository.return_value = mock_repo_record
            mock_settings.return_value.repo_workspace = "/tmp/workspaces"

            resp = client.get(
                "/api/repos/test-repo-001/history/timeline?module_path=src/parser.py&category=bugfix&limit=10"
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["module_path"] == "src/parser.py"
            assert data["category"] == "bugfix"

    def test_timeline_repo_not_found(self, client):
        with patch("app.controllers.history_controller.get_metadata_adapter") as mock_meta:
            mock_meta.return_value.get_repository.return_value = None
            resp = client.get("/api/repos/nonexistent/history/timeline")
            assert resp.status_code == 404

    def test_timeline_repo_not_indexed(self, client):
        record = RepositoryRecord(
            repository_id="repo-pending",
            repository_url="/tmp/repo",
            status="pending",
        )
        with patch("app.controllers.history_controller.get_metadata_adapter") as mock_meta:
            mock_meta.return_value.get_repository.return_value = record
            resp = client.get("/api/repos/repo-pending/history/timeline")
            assert resp.status_code == 400


class TestWhyEndpoint:
    """Tests for POST /api/repos/{id}/history/why."""

    def test_why_returns_explanation(self, client, mock_repo_record):
        with (
            patch("app.controllers.history_controller.get_metadata_adapter") as mock_meta,
            patch("app.controllers.history_controller.get_settings") as mock_settings,
        ):
            mock_meta.return_value.get_repository.return_value = mock_repo_record
            mock_settings.return_value.repo_workspace = "/tmp/workspaces"

            resp = client.post(
                "/api/repos/test-repo-001/history/why",
                json={"module_path": "src/parser.py", "question": "Why so many bugs?"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["module_path"] == "src/parser.py"
            assert data["question"] == "Why so many bugs?"
            assert "explanation" in data
            assert "confidence" in data

    def test_why_repo_not_found(self, client):
        with patch("app.controllers.history_controller.get_metadata_adapter") as mock_meta:
            mock_meta.return_value.get_repository.return_value = None
            resp = client.post(
                "/api/repos/nonexistent/history/why",
                json={"module_path": "x.py", "question": "why?"},
            )
            assert resp.status_code == 404

    def test_why_missing_fields(self, client, mock_repo_record):
        with patch("app.controllers.history_controller.get_metadata_adapter") as mock_meta:
            mock_meta.return_value.get_repository.return_value = mock_repo_record
            resp = client.post(
                "/api/repos/test-repo-001/history/why",
                json={"module_path": ""},
            )
            assert resp.status_code == 422
