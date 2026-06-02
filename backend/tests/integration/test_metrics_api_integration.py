"""Integration tests for Metrics API endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestFeedbackEndpoint:
    def test_submit_valid_feedback(self, client):
        resp = client.post("/api/feedback", json={
            "repository_id": "test-repo",
            "response_id": "resp-001",
            "usefulness_score": 4,
            "correctness_score": 5,
            "comment": "Very helpful",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "recorded"
        assert "feedback_id" in data

    def test_submit_invalid_score(self, client):
        resp = client.post("/api/feedback", json={
            "repository_id": "test-repo",
            "response_id": "resp-001",
            "usefulness_score": 0,
            "correctness_score": 3,
        })
        assert resp.status_code == 422

    def test_submit_missing_fields(self, client):
        resp = client.post("/api/feedback", json={
            "repository_id": "",
            "response_id": "resp-001",
            "usefulness_score": 3,
            "correctness_score": 3,
        })
        assert resp.status_code == 422


class TestMetricsEndpoint:
    def test_get_metrics(self, client):
        resp = client.get("/api/repos/test-repo/metrics")
        assert resp.status_code == 200
        data = resp.json()
        assert data["repository_id"] == "test-repo"
        assert "metrics" in data
        m = data["metrics"]
        assert "total_events" in m
        assert "answer_usefulness_rate" in m

    def test_get_metrics_with_period(self, client):
        resp = client.get(
            "/api/repos/test-repo/metrics?from_ts=2024-01-01T00:00:00&to_ts=2024-12-31T23:59:59"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["period_start"] == "2024-01-01T00:00:00"


class TestQualityReportEndpoint:
    def test_get_quality_report(self, client):
        resp = client.get("/api/repos/test-repo/metrics/quality-report")
        assert resp.status_code == 200
        data = resp.json()
        assert data["repository_id"] == "test-repo"
        assert "quality_label" in data
        assert "overall_quality_score" in data
        assert "summary" in data
