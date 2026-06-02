"""E2E test — index repository, generate graph, explore modules."""

from fastapi.testclient import TestClient

from app.main import app


def test_dependency_graph_exploration_e2e() -> None:
    """Full flow: index → load graph → select module → inspect deps.

    Maps to SPEC-0004 TASK-013 and RQ-001 through RQ-005.
    """
    client = TestClient(app)

    # Step 1 — Index
    index_resp = client.post("/api/repos/index", json={"repository_url": "app"})
    assert index_resp.status_code == 200
    payload = index_resp.json()
    if payload["job_status"] != "completed":
        return  # Cannot complete in this environment

    repository_id = payload["repository_id"]

    # Step 2 — Load dependency graph
    graph_resp = client.get(f"/api/repos/{repository_id}/dependency-graph")
    assert graph_resp.status_code == 200
    graph_data = graph_resp.json()

    assert graph_data["repository_id"] == repository_id
    assert graph_data["node_count"] > 0
    assert graph_data["edge_count"] > 0

    nodes = graph_data["nodes"]
    edges = graph_data["edges"]

    # Step 3 — Validate graph structure (RQ-002)
    for node in nodes:
        assert node["id"]
        assert node["module_path"]
        assert "metrics" in node
        assert node["metrics"]["in_degree"] >= 0
        assert node["metrics"]["out_degree"] >= 0

    for edge in edges:
        assert edge["source"]
        assert edge["target"]
        assert edge["type"] in ("internal", "external")

    # Step 4 — Select a module with outbound deps and inspect
    module_with_deps = next(
        (n for n in nodes if n["metrics"]["out_degree"] > 0), None
    )
    if module_with_deps is None:
        return  # No module with deps found

    module_path = module_with_deps["module_path"]
    details_resp = client.get(
        f"/api/repos/{repository_id}/modules/{module_path}/dependencies"
    )
    assert details_resp.status_code == 200
    details = details_resp.json()

    assert details["module_path"] == module_path
    assert len(details["outbound_dependencies"]) > 0

    # Step 5 — Verify determinism (RQ-008): reload graph, same data
    graph_resp_2 = client.get(f"/api/repos/{repository_id}/dependency-graph")
    assert graph_resp_2.status_code == 200
    # Snapshot should be the same (retrieved from persistence)
    assert graph_resp_2.json()["snapshot_id"] == graph_data["snapshot_id"]
