"""Unit tests for TokenService — JWT issuance and validation.

Tests cover both the PyJWT path (when available) and the opaque-token
fallback.  All tests use a deterministic secret so JWT payloads can be
verified independently.
"""

import time

import pytest

from app.domain.enums import Plan, Role
from app.services.token_service import TokenClaims, TokenService


# ── Fixtures ──────────────────────────────────────────────────────────────────


SECRET = "test-secret-do-not-use-in-prod"


@pytest.fixture
def svc() -> TokenService:
    return TokenService(secret=SECRET, expiry_hours=1)


def _issue(svc: TokenService, **kwargs) -> tuple[str, str, str]:
    defaults = dict(
        user_id="user-abc",
        email="test@example.com",
        role=Role.FREE,
        plan=Plan.FREE,
        email_verified=True,
    )
    defaults.update(kwargs)
    return svc.issue(**defaults)


# ── Issue ─────────────────────────────────────────────────────────────────────


class TestTokenIssue:
    def test_returns_three_tuple(self, svc):
        result = _issue(svc)
        assert len(result) == 3

    def test_token_is_nonempty_string(self, svc):
        token, _, _ = _issue(svc)
        assert isinstance(token, str)
        assert len(token) > 0

    def test_jti_is_nonempty_string(self, svc):
        _, jti, _ = _issue(svc)
        assert isinstance(jti, str)
        assert len(jti) > 0

    def test_expires_at_is_iso_string(self, svc):
        _, _, expires_at = _issue(svc)
        # Must be parseable as ISO datetime
        from datetime import datetime
        dt = datetime.fromisoformat(expires_at)
        assert dt is not None

    def test_each_issue_has_unique_jti(self, svc):
        _, jti1, _ = _issue(svc)
        _, jti2, _ = _issue(svc)
        assert jti1 != jti2

    def test_each_issue_has_unique_token(self, svc):
        token1, _, _ = _issue(svc)
        token2, _, _ = _issue(svc)
        assert token1 != token2

    def test_expiry_in_future(self, svc):
        from datetime import datetime, timezone
        _, _, expires_at = _issue(svc)
        dt = datetime.fromisoformat(expires_at)
        assert dt > datetime.now(timezone.utc)


# ── Decode ────────────────────────────────────────────────────────────────────


class TestTokenDecode:
    def test_decode_returns_token_claims(self, svc):
        token, _, _ = _issue(svc)
        claims = svc.decode(token)
        assert isinstance(claims, TokenClaims)

    def test_claims_user_id_matches(self, svc):
        token, _, _ = _issue(svc, user_id="abc-123")
        claims = svc.decode(token)
        assert claims is not None
        assert claims.user_id == "abc-123"

    def test_claims_email_matches(self, svc):
        token, _, _ = _issue(svc, email="hello@test.com")
        claims = svc.decode(token)
        assert claims is not None
        assert claims.email == "hello@test.com"

    def test_claims_role_matches(self, svc):
        token, _, _ = _issue(svc, role=Role.ADMIN)
        claims = svc.decode(token)
        assert claims is not None
        assert claims.role == Role.ADMIN

    def test_claims_plan_matches(self, svc):
        token, _, _ = _issue(svc, plan=Plan.ENTERPRISE)
        claims = svc.decode(token)
        assert claims is not None
        assert claims.plan == Plan.ENTERPRISE

    def test_claims_email_verified_matches(self, svc):
        token, _, _ = _issue(svc, email_verified=False)
        claims = svc.decode(token)
        assert claims is not None
        assert claims.email_verified is False

    def test_claims_jti_matches_issued_jti(self, svc):
        token, jti, _ = _issue(svc)
        claims = svc.decode(token)
        assert claims is not None
        assert claims.jti == jti

    def test_decode_invalid_token_returns_none(self, svc):
        assert svc.decode("not-a-real-token") is None

    def test_decode_empty_string_returns_none(self, svc):
        assert svc.decode("") is None

    def test_decode_tampered_token_returns_none(self, svc):
        token, _, _ = _issue(svc)
        tampered = token[:-5] + "XXXXX"
        assert svc.decode(tampered) is None

    def test_decode_wrong_secret_returns_none(self):
        """A token signed with a different secret must not validate."""
        svc_a = TokenService(secret="secret-A", expiry_hours=1)
        svc_b = TokenService(secret="secret-B", expiry_hours=1)
        token, _, _ = _issue(svc_a)
        assert svc_b.decode(token) is None

    def test_all_role_enum_values_round_trip(self, svc):
        for role in Role:
            token, _, _ = _issue(svc, role=role)
            claims = svc.decode(token)
            assert claims is not None
            assert claims.role == role

    def test_all_plan_enum_values_round_trip(self, svc):
        for plan in Plan:
            token, _, _ = _issue(svc, plan=plan)
            claims = svc.decode(token)
            assert claims is not None
            assert claims.plan == plan


# ── Token uniqueness across users ─────────────────────────────────────────────


class TestMultipleUsers:
    def test_different_users_get_different_tokens(self, svc):
        t1, _, _ = _issue(svc, user_id="alice", email="alice@example.com")
        t2, _, _ = _issue(svc, user_id="bob",   email="bob@example.com")
        assert t1 != t2

    def test_claims_are_user_specific(self, svc):
        t1, _, _ = _issue(svc, user_id="alice", email="alice@example.com")
        t2, _, _ = _issue(svc, user_id="bob",   email="bob@example.com")
        c1 = svc.decode(t1)
        c2 = svc.decode(t2)
        assert c1.user_id != c2.user_id
        assert c1.email != c2.email
