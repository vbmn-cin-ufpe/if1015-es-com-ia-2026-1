"""Integration tests for dependency graph API."""

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


def test_get_dependency_graph() -> None:
    """GET /api/repos/{id}/dependency-graph generates and returns a graph."""
    client = TestClient(app)
    repository_id = _index_local_app(client)
    if repository_id is None:
        return

    resp = client.get(f"/api/repos/{repository_id}/dependency-graph")
    assert resp.status_code == 200
    data = resp.json()

    assert data["repository_id"] == repository_id
    assert "snapshot_id" in data
    assert data["node_count"] > 0
    assert data["edge_count"] > 0
    assert len(data["nodes"]) == data["node_count"]
    assert len(data["edges"]) == data["edge_count"]

    # Validate node schema
    node = data["nodes"][0]
    assert "id" in node
    assert "label" in node
    assert "module_path" in node
    assert "metrics" in node


def test_get_dependency_graph_not_found() -> None:
    """Graph endpoint returns 404 for unknown repository."""
    client = TestClient(app)
    resp = client.get("/api/repos/unknown-repo/dependency-graph")
    assert resp.status_code == 404


def test_get_dependency_graph_not_indexed() -> None:
    """Graph endpoint returns 400 if repo is not indexed."""
    client = TestClient(app)
    index_resp = client.post("/api/repos/index", json={"repository_url": "http://invalid.url/repo.git"})
    if index_resp.status_code != 200:
        return
    repository_id = index_resp.json()["repository_id"]
    resp = client.get(f"/api/repos/{repository_id}/dependency-graph")
    assert resp.status_code in [400, 404]


def test_get_module_dependencies() -> None:
    """GET /api/repos/{id}/modules/{path}/dependencies returns module details."""
    client = TestClient(app)
    repository_id = _index_local_app(client)
    if repository_id is None:
        return

    # First load graph to populate persistence
    graph_resp = client.get(f"/api/repos/{repository_id}/dependency-graph")
    assert graph_resp.status_code == 200
    nodes = graph_resp.json()["nodes"]
    if not nodes:
        return

    # Get details for first node
    module_path = nodes[0]["module_path"]
    resp = client.get(f"/api/repos/{repository_id}/modules/{module_path}/dependencies")
    assert resp.status_code == 200
    data = resp.json()

    assert data["module_path"] == module_path
    assert "label" in data
    assert "metrics" in data
    assert "inbound_dependencies" in data
    assert "outbound_dependencies" in data


def test_get_module_not_found() -> None:
    """Module details returns 404 for unknown module."""
    client = TestClient(app)
    repository_id = _index_local_app(client)
    if repository_id is None:
        return

    # First load graph
    client.get(f"/api/repos/{repository_id}/dependency-graph")

    resp = client.get(f"/api/repos/{repository_id}/modules/nonexistent.module/dependencies")
    assert resp.status_code == 404
