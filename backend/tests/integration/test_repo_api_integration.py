from fastapi.testclient import TestClient

from app.main import app


def test_repo_index_and_status() -> None:
    client = TestClient(app)
    create_resp = client.post("/api/repos/index", json={"repository_url": "app"})
    assert create_resp.status_code == 200
    data = create_resp.json()
    assert "repository_id" in data
    status_resp = client.get(f"/api/repos/{data['repository_id']}/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["index_status"] in {"completed", "failed"}