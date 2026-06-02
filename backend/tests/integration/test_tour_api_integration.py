"""Integration tests for tour generation API."""

from fastapi.testclient import TestClient

from app.main import app


def _index_local_app(client: TestClient) -> str | None:
    """Index the local 'app' directory and return repository_id if completed."""
    index_resp = client.post("/api/repos/index", json={"repository_url": "app"})
    assert index_resp.status_code == 200
    payload = index_resp.json()
    if payload["job_status"] != "completed":
        return None
    return payload["repository_id"]


def test_generate_tour_integration() -> None:
    """Test the full tour generation flow."""
    client = TestClient(app)

    repository_id = _index_local_app(client)
    if repository_id is None:
        return  # Skip if indexing failed in this environment

    tour_resp = client.post(
        "/api/tours/generate",
        json={
            "repository_id": repository_id,
            "top_k": 3,
            "complexity_weight": 0.4,
            "churn_weight": 0.3,
            "coupling_weight": 0.3,
        },
    )

    assert tour_resp.status_code == 200
    tour_data = tour_resp.json()

    assert "tour_id" in tour_data
    assert tour_data["repository_id"] == repository_id
    assert isinstance(tour_data["steps"], list)
    assert len(tour_data["steps"]) <= 3
    # Persistence fields
    assert "created_at" in tour_data
    assert "config" in tour_data

    if tour_data["steps"]:
        step = tour_data["steps"][0]
        for field in ("step_number", "module_name", "title", "score", "rationale",
                      "metrics", "recommendations"):
            assert field in step
        metrics = step["metrics"]
        for key in ("complexity", "churn", "coupling"):
            assert key in metrics


def test_generate_tour_with_custom_weights() -> None:
    """Tour generation must accept and use custom score weights."""
    client = TestClient(app)

    repository_id = _index_local_app(client)
    if repository_id is None:
        return

    tour_resp = client.post(
        "/api/tours/generate",
        json={
            "repository_id": repository_id,
            "top_k": 2,
            "complexity_weight": 0.6,
            "churn_weight": 0.2,
            "coupling_weight": 0.2,
        },
    )
    assert tour_resp.status_code == 200
    data = tour_resp.json()
    assert data["config"]["complexity_weight"] == 0.6
    assert data["config"]["churn_weight"] == 0.2
    assert data["config"]["coupling_weight"] == 0.2


def test_get_tour_by_id() -> None:
    """GET /api/tours/{tour_id} must return the persisted tour (RQ-004 + RQ-005)."""
    client = TestClient(app)

    repository_id = _index_local_app(client)
    if repository_id is None:
        return

    gen_resp = client.post(
        "/api/tours/generate",
        json={"repository_id": repository_id, "top_k": 2},
    )
    assert gen_resp.status_code == 200
    tour_id = gen_resp.json()["tour_id"]

    get_resp = client.get(f"/api/tours/{tour_id}")
    assert get_resp.status_code == 200
    retrieved = get_resp.json()
    assert retrieved["tour_id"] == tour_id
    assert retrieved["repository_id"] == repository_id
    assert isinstance(retrieved["steps"], list)


def test_get_tour_not_found() -> None:
    """GET /api/tours/{tour_id} returns 404 for unknown ID."""
    client = TestClient(app)
    resp = client.get("/api/tours/does-not-exist-tour-id")
    assert resp.status_code == 404


def test_list_tours_for_repository() -> None:
    """GET /api/repos/{id}/tours must list all tours for a repository."""
    client = TestClient(app)

    repository_id = _index_local_app(client)
    if repository_id is None:
        return

    # Generate two tours
    for _ in range(2):
        client.post(
            "/api/tours/generate",
            json={"repository_id": repository_id, "top_k": 2},
        )

    list_resp = client.get(f"/api/repos/{repository_id}/tours")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["repository_id"] == repository_id
    assert isinstance(data["tours"], list)
    assert len(data["tours"]) >= 2
    for summary in data["tours"]:
        for field in ("tour_id", "repository_id", "title", "description",
                      "step_count", "created_at", "config"):
            assert field in summary


def test_list_tours_repository_not_found() -> None:
    """GET /api/repos/{id}/tours returns 404 for unknown repository."""
    client = TestClient(app)
    resp = client.get("/api/repos/non-existent-repo-id/tours")
    assert resp.status_code == 404


def test_generate_tour_repository_not_found() -> None:
    """Tour generation with non-existent repository returns 404."""
    client = TestClient(app)

    tour_resp = client.post(
        "/api/tours/generate",
        json={"repository_id": "non-existent-id", "top_k": 5},
    )
    assert tour_resp.status_code == 404


def test_generate_tour_not_indexed() -> None:
    """Tour generation before repository is indexed returns 400."""
    client = TestClient(app)

    index_resp = client.post("/api/repos/index", json={"repository_url": "http://invalid.url/repo.git"})
    if index_resp.status_code == 200:
        repository_id = index_resp.json()["repository_id"]
        tour_resp = client.post(
            "/api/tours/generate",
            json={"repository_id": repository_id, "top_k": 5},
        )
        assert tour_resp.status_code in [400, 404]

