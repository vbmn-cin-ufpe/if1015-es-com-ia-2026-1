"""Integration tests for Auth and Session API endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_auth_state():
    """Reset auth service state between tests."""
    from app.controllers.auth_controller import _auth_service, _session_service
    _auth_service._users.clear()
    _auth_service._tokens.clear()
    _session_service._sessions.clear()
    _session_service._checkpoints.clear()


class TestAuthEndpoints:
    def test_signup(self, client):
        resp = client.post("/api/auth/signup", json={
            "email": "test@example.com", "password": "secure123"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "test@example.com"
        assert "token" in data

    def test_signup_duplicate(self, client):
        client.post("/api/auth/signup", json={
            "email": "test@example.com", "password": "secure123"
        })
        resp = client.post("/api/auth/signup", json={
            "email": "test@example.com", "password": "other456"
        })
        assert resp.status_code == 400

    def test_signin(self, client):
        client.post("/api/auth/signup", json={
            "email": "test@example.com", "password": "secure123"
        })
        resp = client.post("/api/auth/signin", json={
            "email": "test@example.com", "password": "secure123"
        })
        assert resp.status_code == 200
        assert "token" in resp.json()

    def test_signin_wrong_password(self, client):
        client.post("/api/auth/signup", json={
            "email": "test@example.com", "password": "secure123"
        })
        resp = client.post("/api/auth/signin", json={
            "email": "test@example.com", "password": "wrongpass"
        })
        assert resp.status_code == 401

    def test_signout(self, client):
        signup_resp = client.post("/api/auth/signup", json={
            "email": "test@example.com", "password": "secure123"
        })
        token = signup_resp.json()["token"]
        resp = client.post("/api/auth/signout", headers={
            "Authorization": f"Bearer {token}"
        })
        assert resp.status_code == 200


class TestSessionEndpoints:
    def _get_token(self, client) -> str:
        resp = client.post("/api/auth/signup", json={
            "email": "test@example.com", "password": "secure123"
        })
        return resp.json()["token"]

    def test_create_session(self, client):
        token = self._get_token(client)
        resp = client.post("/api/sessions", json={
            "repository_id": "repo-001"
        }, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["repository_id"] == "repo-001"
        assert data["status"] == "active"

    def test_list_sessions(self, client):
        token = self._get_token(client)
        client.post("/api/sessions", json={"repository_id": "repo-001"},
                    headers={"Authorization": f"Bearer {token}"})
        client.post("/api/sessions", json={"repository_id": "repo-002"},
                    headers={"Authorization": f"Bearer {token}"})
        resp = client.get("/api/sessions",
                          headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_close_session(self, client):
        token = self._get_token(client)
        create_resp = client.post("/api/sessions", json={"repository_id": "repo-001"},
                                  headers={"Authorization": f"Bearer {token}"})
        session_id = create_resp.json()["id"]
        resp = client.post(f"/api/sessions/{session_id}/close",
                           headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "closed"

    def test_unauthorized_access(self, client):
        resp = client.get("/api/sessions")
        assert resp.status_code == 401

    def test_save_checkpoint(self, client):
        token = self._get_token(client)
        create_resp = client.post("/api/sessions", json={"repository_id": "repo-001"},
                                  headers={"Authorization": f"Bearer {token}"})
        session_id = create_resp.json()["id"]
        resp = client.post(
            f"/api/sessions/{session_id}/checkpoints",
            json={"feature": "tour", "checkpoint_payload": {"step": 2}},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["feature"] == "tour"
