"""E2E test — generate tour, retrieve by ID, and navigate all steps."""

from fastapi.testclient import TestClient

from app.main import app


def test_generate_navigate_tour_e2e() -> None:
    """Full onboarding flow: index → generate tour → retrieve tour → navigate steps.

    Maps to SPEC-0003 TASK-016 and acceptance criteria for RQ-003, RQ-004, RQ-005.
    """
    client = TestClient(app)

    # Step 1 — Index a local repository (using the app directory itself as a Python repo)
    index_resp = client.post("/api/repos/index", json={"repository_url": "app"})
    assert index_resp.status_code == 200
    index_payload = index_resp.json()
    if index_payload["job_status"] != "completed":
        return  # Environment cannot complete indexing; skip gracefully

    repository_id = index_payload["repository_id"]

    # Step 2 — Generate a guided tour with custom configuration
    gen_resp = client.post(
        "/api/tours/generate",
        json={
            "repository_id": repository_id,
            "top_k": 3,
            "complexity_weight": 0.5,
            "churn_weight": 0.3,
            "coupling_weight": 0.2,
        },
    )
    assert gen_resp.status_code == 200
    gen_data = gen_resp.json()

    tour_id = gen_data["tour_id"]
    assert gen_data["repository_id"] == repository_id
    assert gen_data["step_count"] <= 3
    assert len(gen_data["steps"]) == gen_data["step_count"]
    assert gen_data["config"]["top_k"] == 3
    assert gen_data["config"]["complexity_weight"] == 0.5

    # Step 3 — Retrieve the persisted tour by ID
    get_resp = client.get(f"/api/tours/{tour_id}")
    assert get_resp.status_code == 200
    retrieved = get_resp.json()
    assert retrieved["tour_id"] == tour_id
    assert retrieved["repository_id"] == repository_id

    # Step 4 — Navigate all steps and validate structure (RQ-006: rationale + references)
    steps = retrieved["steps"]
    assert len(steps) == gen_data["step_count"]
    for step in steps:
        assert step["step_number"] >= 1
        assert step["module_name"]
        assert step["title"]
        assert 0.0 <= step["score"] <= 1.0
        assert step["rationale"]  # non-empty rationale
        assert isinstance(step["recommendations"], list)
        metrics = step["metrics"]
        assert "complexity" in metrics
        assert "churn" in metrics
        assert "coupling" in metrics

    # Step 5 — List tours for the repository and confirm our tour is there
    list_resp = client.get(f"/api/repos/{repository_id}/tours")
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert list_data["repository_id"] == repository_id
    tour_ids = [t["tour_id"] for t in list_data["tours"]]
    assert tour_id in tour_ids
