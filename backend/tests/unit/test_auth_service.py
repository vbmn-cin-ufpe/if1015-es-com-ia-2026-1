"""Unit tests for auth and session services.

AuthService requires UserRepository, TokenService and EmailGateway —
all replaced with MagicMock so no database or SMTP connection is needed.

Corrections applied to the original stubs:
  - AuthService() now receives proper mocks (was called with no args)
  - Error messages match the Portuguese strings used by the real service
  - Password minimum is 8 characters (not 6)
  - validate_token() returns TokenClaims | None, not user_id directly
"""

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.domain.enums import Plan, Role
from app.services.auth_service import AuthService, OnboardingSessionService
from app.services.token_service import TokenClaims, TokenService


# ── Helpers ───────────────────────────────────────────────────────────────────


def _make_auth_service(existing_user=None):
    """
    Build an AuthService backed by minimal mocks.

    `existing_user`: if provided, `get_by_email` returns it (simulates a
    pre-existing account); otherwise returns None (new account).
    """
    user_repo = MagicMock()
    user_repo.get_by_email.return_value = existing_user
    user_repo.is_token_revoked.return_value = False

    token_svc = TokenService(secret="unit-test-secret", expiry_hours=1)

    email_gw = MagicMock()
    email_gw.send_verification.return_value = None

    svc = AuthService(
        user_repo=user_repo,
        token_service=token_svc,
        email_gateway=email_gw,
        admin_email="",
        admin_password="",
    )
    return svc, user_repo, token_svc, email_gw


def _fake_user(email="user@test.com", password="password123"):
    """Return a User-like mock that passes _verify_password checks."""
    from app.services.auth_service import _hash_password
    from app.domain.user import User

    u = User(
        email=email,
        password_hash=_hash_password(password),
        role=Role.FREE,
        plan=Plan.FREE,
        email_verified=True,
    )
    u.is_deleted = False
    return u


# ── TestAuthService ───────────────────────────────────────────────────────────


class TestAuthService:
    def test_signup_success_returns_expected_keys(self):
        svc, repo, *_ = _make_auth_service()
        result = svc.signup("user@test.com", "password123")
        assert result["email"] == "user@test.com"
        assert "token" in result
        assert "user_id" in result
        assert "role" in result
        assert "plan" in result

    def test_signup_creates_user_in_repo(self):
        svc, repo, *_ = _make_auth_service()
        svc.signup("new@test.com", "password123")
        repo.create.assert_called_once()

    def test_signup_sends_verification_email(self):
        svc, repo, _, email_gw = _make_auth_service()
        svc.signup("new@test.com", "password123")
        email_gw.send_verification.assert_called_once()

    def test_signup_duplicate_email_raises_portuguese_message(self):
        existing = _fake_user("dup@test.com")
        svc, *_ = _make_auth_service(existing_user=existing)
        with pytest.raises(ValueError, match="já está cadastrado"):
            svc.signup("dup@test.com", "password123")

    def test_signup_password_too_short_raises(self):
        """Minimum password length is 8 characters."""
        svc, *_ = _make_auth_service()
        with pytest.raises(ValueError, match="8 caracteres"):
            svc.signup("user@test.com", "short")

    def test_signup_exactly_8_chars_is_allowed(self):
        svc, *_ = _make_auth_service()
        result = svc.signup("user@test.com", "12345678")
        assert "token" in result

    def test_signup_empty_email_raises(self):
        svc, *_ = _make_auth_service()
        with pytest.raises(ValueError):
            svc.signup("", "password123")

    def test_signup_empty_password_raises(self):
        svc, *_ = _make_auth_service()
        with pytest.raises(ValueError):
            svc.signup("user@test.com", "")

    def test_signin_success(self):
        user = _fake_user("user@test.com", "password123")
        svc, repo, *_ = _make_auth_service(existing_user=user)
        result = svc.signin("user@test.com", "password123")
        assert result["email"] == "user@test.com"
        assert "token" in result

    def test_signin_wrong_password_raises_portuguese_message(self):
        user = _fake_user("user@test.com", "correctpass")
        svc, *_ = _make_auth_service(existing_user=user)
        with pytest.raises(ValueError, match="Credenciais inválidas"):
            svc.signin("user@test.com", "wrongpass")

    def test_signin_unknown_email_raises_portuguese_message(self):
        svc, *_ = _make_auth_service(existing_user=None)
        with pytest.raises(ValueError, match="Credenciais inválidas"):
            svc.signin("nobody@test.com", "password123")

    def test_signout_causes_validate_to_return_none(self):
        """After signout the token must not validate."""
        svc, repo, *_ = _make_auth_service()
        result = svc.signup("user@test.com", "password123")
        token = result["token"]

        # Token is valid before signout
        assert svc.validate_token(token) is not None

        # Simulate the repo marking the jti as revoked
        repo.is_token_revoked.return_value = True
        svc.signout(token)
        assert svc.validate_token(token) is None

    def test_validate_token_returns_token_claims(self):
        """validate_token() returns TokenClaims, not user_id."""
        svc, *_ = _make_auth_service()
        result = svc.signup("user@test.com", "password123")
        claims = svc.validate_token(result["token"])
        assert claims is not None
        assert isinstance(claims, TokenClaims)
        assert claims.user_id == result["user_id"]

    def test_validate_invalid_token_returns_none(self):
        svc, *_ = _make_auth_service()
        assert svc.validate_token("totally-invalid-token") is None


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
