"""Authentication and session services."""

import logging
import random
import secrets
import string
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from app.domain.enums import Plan, Role
from app.domain.user import User
from app.infrastructure.email_gateway import EmailGateway
from app.infrastructure.user_repository import UserRepository
from app.services.token_service import TokenClaims, TokenService

logger = logging.getLogger(__name__)

try:
    import bcrypt as _bcrypt
    _BCRYPT_AVAILABLE = True
except ImportError:
    _BCRYPT_AVAILABLE = False
    import hashlib
    logger.warning("bcrypt not installed — falling back to SHA-256 (dev only)")


def _hash_password(password: str) -> str:
    if _BCRYPT_AVAILABLE:
        return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt(rounds=12)).decode()
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()
    return f"sha256:{salt}:{hashed}"


def _verify_password(password: str, stored: str) -> bool:
    if _BCRYPT_AVAILABLE and not stored.startswith("sha256:"):
        try:
            return _bcrypt.checkpw(password.encode(), stored.encode())
        except Exception:
            return False
    # SHA-256 fallback
    parts = stored.split(":", 2)
    if len(parts) == 3 and parts[0] == "sha256":
        _, salt, h = parts
        import hashlib
        return secrets.compare_digest(h, hashlib.sha256(f"{salt}:{password}".encode()).hexdigest())
    return False


def _generate_reset_code() -> str:
    """Generate a cryptographically random 6-digit numeric code."""
    return "".join(random.SystemRandom().choices(string.digits, k=6))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class AuthToken:
    """Legacy compat shim — kept so OnboardingSessionService still compiles."""
    token: str = field(default_factory=lambda: secrets.token_urlsafe(32))
    user_id: str = ""
    created_at: str = field(default_factory=_now)
    expires_at: str = ""


@dataclass
class OnboardingSession:
    """Onboarding session entity."""

    id: str = field(default_factory=lambda: str(uuid4()))
    user_id: str = ""
    repository_id: str = ""
    status: str = "active"  # active, paused, closed
    started_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    updated_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


@dataclass
class SessionCheckpoint:
    """Progress checkpoint within a session."""

    id: str = field(default_factory=lambda: str(uuid4()))
    session_id: str = ""
    feature: str = ""  # tour, graph, history, chat
    checkpoint_payload: dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class AuthService:
    """
    Full authentication service: signup/signin/signout, email verification,
    password reset, and JWT issuance via TokenService.
    """

    def __init__(
        self,
        user_repo: UserRepository,
        token_service: TokenService,
        email_gateway: EmailGateway,
        app_base_url: str = "http://localhost:5173",
        admin_email: str = "",
        admin_password: str = "",
    ) -> None:
        self._repo = user_repo
        self._tokens = token_service
        self._email = email_gateway
        self._base_url = app_base_url
        self._ensure_admin(admin_email, admin_password)

    def _ensure_admin(self, email: str, password: str) -> None:
        """Seed the admin user on startup if it doesn't exist yet."""
        if not email or not password:
            return
        existing = self._repo.get_by_email(email)
        if existing:
            return
        admin = User(
            email=email.lower(),
            password_hash=_hash_password(password),
            role=Role.ADMIN,
            plan=Plan.ENTERPRISE,
            email_verified=True,
        )
        admin.created_by = admin.id
        self._repo.create(admin)
        logger.info("Admin user seeded: %s", email)

    # ── Signup ────────────────────────────────────────────────────────────────

    def signup(self, email: str, password: str, plan: Plan = Plan.FREE) -> dict[str, Any]:
        if not email or not password:
            raise ValueError("Email e senha são obrigatórios")
        if len(password) < 8:
            raise ValueError("A senha deve ter pelo menos 8 caracteres")
        email = email.lower().strip()
        if self._repo.get_by_email(email):
            raise ValueError("Este e-mail já está cadastrado")

        verify_token = str(uuid4())
        verify_expires = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()

        user = User(
            email=email,
            password_hash=_hash_password(password),
            role=Role.FREE,
            plan=plan,
            email_verified=False,
            email_verify_token=verify_token,
            email_verify_expires=verify_expires,
        )
        user.created_by = user.id
        self._repo.create(user)

        # Send verification email (non-blocking — log on failure)
        try:
            self._email.send_verification(email, verify_token, self._base_url)
        except Exception as exc:
            logger.warning("Could not send verification email to %s: %s", email, exc)

        token, jti, expires_at = self._tokens.issue(
            user.id, user.email, user.role, user.plan, user.email_verified
        )
        return {
            "user_id": user.id,
            "email": user.email,
            "token": token,
            "role": user.role.value,
            "plan": user.plan.value,
            "email_verified": user.email_verified,
        }

    # ── Signin ────────────────────────────────────────────────────────────────

    def signin(self, email: str, password: str) -> dict[str, Any]:
        email = email.lower().strip()
        user = self._repo.get_by_email(email)
        # Constant-time failure path
        if not user or not user.password_hash:
            _verify_password("dummy", _hash_password("dummy"))
            raise ValueError("Credenciais inválidas")
        if not _verify_password(password, user.password_hash):
            raise ValueError("Credenciais inválidas")
        if user.is_deleted:
            raise ValueError("Conta desativada")

        token, jti, expires_at = self._tokens.issue(
            user.id, user.email, user.role, user.plan, user.email_verified
        )
        return {
            "user_id": user.id,
            "email": user.email,
            "token": token,
            "role": user.role.value,
            "plan": user.plan.value,
            "email_verified": user.email_verified,
        }

    # ── Signout ───────────────────────────────────────────────────────────────

    def signout(self, token: str) -> bool:
        claims = self._tokens.decode(token)
        if not claims:
            return False
        self._repo.revoke_token(claims.jti, claims.user_id, claims.expires_at)
        return True

    # ── Validate token ────────────────────────────────────────────────────────

    def validate_token(self, token: str) -> TokenClaims | None:
        """Return claims if the token is valid and not revoked."""
        claims = self._tokens.decode(token)
        if not claims:
            return None
        if self._repo.is_token_revoked(claims.jti):
            return None
        return claims

    # ── Email verification ────────────────────────────────────────────────────

    def verify_email(self, token: str) -> bool:
        user = self._repo.get_by_verify_token(token)
        if not user:
            return False
        # Check expiry
        if user.email_verify_expires:
            try:
                exp = datetime.fromisoformat(user.email_verify_expires)
                if datetime.now(timezone.utc) > exp:
                    return False
            except ValueError:
                pass
        user.email_verified = True
        user.email_verify_token = None
        user.email_verify_expires = None
        user.touch(user.id)
        self._repo.update(user)
        return True

    def resend_verification(self, email: str) -> None:
        user = self._repo.get_by_email(email.lower().strip())
        if not user or user.email_verified:
            return  # Silently ignore — do not leak user existence
        verify_token = str(uuid4())
        user.email_verify_token = verify_token
        user.email_verify_expires = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        user.touch(user.id)
        self._repo.update(user)
        try:
            self._email.send_verification(user.email, verify_token, self._base_url)
        except Exception as exc:
            logger.warning("Resend verification failed: %s", exc)

    # ── Password reset ────────────────────────────────────────────────────────

    def forgot_password(self, email: str) -> None:
        """Generate 6-digit code and email it. Silent on unknown email."""
        user = self._repo.get_by_email(email.lower().strip())
        if not user or user.is_deleted:
            return  # Do not leak user existence
        code = _generate_reset_code()
        expires = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
        user.reset_token = code
        user.reset_token_expires = expires
        user.touch(user.id)
        self._repo.update(user)
        try:
            self._email.send_reset_code(user.email, code)
        except Exception as exc:
            logger.warning("Reset email failed for %s: %s", email, exc)

    def reset_password(self, email: str, code: str, new_password: str) -> bool:
        if len(new_password) < 8:
            raise ValueError("A nova senha deve ter pelo menos 8 caracteres")
        user = self._repo.get_by_email(email.lower().strip())
        if not user or not user.reset_token:
            return False
        if not secrets.compare_digest(user.reset_token, code):
            return False
        if user.reset_token_expires:
            try:
                exp = datetime.fromisoformat(user.reset_token_expires)
                if datetime.now(timezone.utc) > exp:
                    return False
            except ValueError:
                return False
        user.password_hash = _hash_password(new_password)
        user.reset_token = None
        user.reset_token_expires = None
        user.touch(user.id)
        self._repo.update(user)
        return True

    # ── Me ────────────────────────────────────────────────────────────────────

    def get_user(self, user_id: str) -> User | None:
        return self._repo.get_by_id(user_id)




class OnboardingSessionService:
    """Manages onboarding session lifecycle."""

    def __init__(self):
        self._sessions: dict[str, OnboardingSession] = {}  # session_id -> session
        self._checkpoints: dict[str, list[SessionCheckpoint]] = {}  # session_id -> checkpoints

    def create_session(self, user_id: str, repository_id: str) -> OnboardingSession:
        """Create a new onboarding session."""
        session = OnboardingSession(user_id=user_id, repository_id=repository_id)
        self._sessions[session.id] = session
        self._checkpoints[session.id] = []
        return session

    def list_sessions(self, user_id: str) -> list[OnboardingSession]:
        """List all sessions for a user."""
        return [s for s in self._sessions.values() if s.user_id == user_id]

    def get_session(self, session_id: str) -> OnboardingSession | None:
        """Get a session by ID."""
        return self._sessions.get(session_id)

    def resume_session(self, session_id: str) -> OnboardingSession | None:
        """Resume a paused session."""
        session = self._sessions.get(session_id)
        if session and session.status in ("paused", "active"):
            session.status = "active"
            session.updated_at = datetime.now(timezone.utc).isoformat()
            return session
        return None

    def close_session(self, session_id: str) -> OnboardingSession | None:
        """Close a session."""
        session = self._sessions.get(session_id)
        if session and session.status != "closed":
            session.status = "closed"
            session.updated_at = datetime.now(timezone.utc).isoformat()
            return session
        return None

    def save_checkpoint(
        self, session_id: str, feature: str, payload: dict[str, Any]
    ) -> SessionCheckpoint | None:
        """Save a progress checkpoint."""
        if session_id not in self._sessions:
            return None
        checkpoint = SessionCheckpoint(
            session_id=session_id, feature=feature, checkpoint_payload=payload
        )
        self._checkpoints.setdefault(session_id, []).append(checkpoint)
        return checkpoint

    def get_checkpoints(self, session_id: str) -> list[SessionCheckpoint]:
        """Get all checkpoints for a session."""
        return self._checkpoints.get(session_id, [])

    def get_latest_checkpoint(
        self, session_id: str, feature: str
    ) -> SessionCheckpoint | None:
        """Get the latest checkpoint for a specific feature."""
        checkpoints = [
            c
            for c in self._checkpoints.get(session_id, [])
            if c.feature == feature
        ]
        if checkpoints:
            return max(checkpoints, key=lambda c: c.timestamp)
        return None
