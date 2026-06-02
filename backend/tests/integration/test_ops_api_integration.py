"""Integration tests for operational API endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestLivenessEndpoint:
    def test_liveness_returns_alive(self, client):
        resp = client.get("/api/ops/health/live")
        assert resp.status_code == 200
        assert resp.json()["status"] == "alive"


class TestReadinessEndpoint:
    def test_readiness_returns_status(self, client):
        resp = client.get("/api/ops/health/ready")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ("ready", "degraded", "not_ready")
        assert "dependencies" in data
        assert len(data["dependencies"]) > 0

    def test_readiness_has_dependency_details(self, client):
        resp = client.get("/api/ops/health/ready")
        data = resp.json()
        for dep in data["dependencies"]:
            assert "name" in dep
            assert "status" in dep


class TestOperationalSummaryEndpoint:
    def test_summary_returns_data(self, client):
        resp = client.get("/api/ops/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "operational"
        assert "uptime_info" in data
        assert "alert_status" in data
        assert data["alert_status"] in ("ok", "warning", "critical")
        assert "total_metric_points" in data
        assert "recent_errors" in data


class TestCorrelationIdMiddleware:
    def test_response_has_correlation_id(self, client):
        resp = client.get("/api/ops/health/live")
        assert "x-correlation-id" in resp.headers

    def test_custom_correlation_id_preserved(self, client):
        custom_id = "test-correlation-123"
        resp = client.get(
            "/api/ops/health/live",
            headers={"X-Correlation-ID": custom_id},
        )
        assert resp.headers["x-correlation-id"] == custom_id
