"""Unit tests for auth and session services."""

import pytest

from app.services.auth_service import AuthService, OnboardingSessionService


class TestAuthService:
    def setup_method(self):
        self.service = AuthService()

    def test_signup_success(self):
        result = self.service.signup("user@test.com", "password123")
        assert result["email"] == "user@test.com"
        assert "token" in result
        assert "user_id" in result

    def test_signup_duplicate_email(self):
        self.service.signup("user@test.com", "password123")
        with pytest.raises(ValueError, match="already registered"):
            self.service.signup("user@test.com", "password456")

    def test_signup_short_password(self):
        with pytest.raises(ValueError, match="at least 6"):
            self.service.signup("user@test.com", "123")

    def test_signin_success(self):
        self.service.signup("user@test.com", "password123")
        result = self.service.signin("user@test.com", "password123")
        assert result["email"] == "user@test.com"
        assert "token" in result

    def test_signin_wrong_password(self):
        self.service.signup("user@test.com", "password123")
        with pytest.raises(ValueError, match="Invalid credentials"):
            self.service.signin("user@test.com", "wrongpass")

    def test_signin_unknown_email(self):
        with pytest.raises(ValueError, match="Invalid credentials"):
            self.service.signin("nobody@test.com", "password123")

    def test_signout_invalidates_token(self):
        result = self.service.signup("user@test.com", "password123")
        token = result["token"]
        assert self.service.validate_token(token) is not None
        self.service.signout(token)
        assert self.service.validate_token(token) is None

    def test_validate_token(self):
        result = self.service.signup("user@test.com", "password123")
        user_id = self.service.validate_token(result["token"])
        assert user_id == result["user_id"]

    def test_validate_invalid_token(self):
        assert self.service.validate_token("nonexistent") is None


class TestOnboardingSessionService:
    def setup_method(self):
        self.service = OnboardingSessionService()

    def test_create_session(self):
        session = self.service.create_session("user1", "repo1")
        assert session.user_id == "user1"
        assert session.repository_id == "repo1"
        assert session.status == "active"

    def test_list_sessions(self):
        self.service.create_session("user1", "repo1")
        self.service.create_session("user1", "repo2")
        self.service.create_session("user2", "repo1")
        sessions = self.service.list_sessions("user1")
        assert len(sessions) == 2

    def test_close_session(self):
        session = self.service.create_session("user1", "repo1")
        closed = self.service.close_session(session.id)
        assert closed is not None
        assert closed.status == "closed"

    def test_resume_session(self):
        session = self.service.create_session("user1", "repo1")
        self.service.close_session(session.id)
        # Cannot resume a closed session
        resumed = self.service.resume_session(session.id)
        assert resumed is None

    def test_save_and_get_checkpoint(self):
        session = self.service.create_session("user1", "repo1")
        cp = self.service.save_checkpoint(session.id, "tour", {"step": 3})
        assert cp is not None
        assert cp.feature == "tour"

        checkpoints = self.service.get_checkpoints(session.id)
        assert len(checkpoints) == 1

    def test_get_latest_checkpoint(self):
        session = self.service.create_session("user1", "repo1")
        self.service.save_checkpoint(session.id, "tour", {"step": 1})
        self.service.save_checkpoint(session.id, "tour", {"step": 5})
        self.service.save_checkpoint(session.id, "graph", {"module": "x"})

        latest = self.service.get_latest_checkpoint(session.id, "tour")
        assert latest is not None
        assert latest.checkpoint_payload == {"step": 5}
