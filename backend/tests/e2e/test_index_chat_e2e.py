from fastapi.testclient import TestClient

from app.main import app


def test_index_then_chat_flow() -> None:
    client = TestClient(app)
    index_resp = client.post("/api/repos/index", json={"repository_url": "app"})
    assert index_resp.status_code == 200
    payload = index_resp.json()
    if payload["job_status"] != "completed":
        return
    ask_resp = client.post(
        "/api/chat/ask",
        json={"repository_id": payload["repository_id"], "question": "o que faz o health endpoint?"},
    )
    assert ask_resp.status_code == 200
    body = ask_resp.json()
    assert "answer" in body
    assert "sources" in body