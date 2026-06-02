"""Authentication and session services."""

import hashlib
import logging
import secrets
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

logger = logging.getLogger(__name__)


@dataclass
class User:
    """User domain entity."""

    id: str = field(default_factory=lambda: str(uuid4()))
    email: str = ""
    password_hash: str = ""
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    status: str = "active"


@dataclass
class AuthToken:
    """Auth token for session management."""

    token: str = field(default_factory=lambda: secrets.token_urlsafe(32))
    user_id: str = ""
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
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
    """Handles user authentication."""

    def __init__(self):
        # In-memory user/token store (fallback when no DB)
        self._users: dict[str, User] = {}  # email -> User
        self._tokens: dict[str, AuthToken] = {}  # token -> AuthToken

    def _hash_password(self, password: str) -> str:
        """Hash password with salt using SHA-256."""
        salt = secrets.token_hex(16)
        hashed = hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()
        return f"{salt}:{hashed}"

    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against stored hash."""
        parts = password_hash.split(":", 1)
        if len(parts) != 2:
            return False
        salt, stored_hash = parts
        computed = hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()
        return secrets.compare_digest(computed, stored_hash)

    def signup(self, email: str, password: str) -> dict[str, Any]:
        """Register a new user."""
        if not email or not password:
            raise ValueError("Email and password are required")
        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters")
        if email in self._users:
            raise ValueError("Email already registered")

        user = User(email=email, password_hash=self._hash_password(password))
        self._users[email] = user

        token = AuthToken(user_id=user.id)
        self._tokens[token.token] = token

        return {
            "user_id": user.id,
            "email": user.email,
            "token": token.token,
        }

    def signin(self, email: str, password: str) -> dict[str, Any]:
        """Authenticate user and return token."""
        user = self._users.get(email)
        if not user:
            raise ValueError("Invalid credentials")
        if not self._verify_password(password, user.password_hash):
            raise ValueError("Invalid credentials")

        token = AuthToken(user_id=user.id)
        self._tokens[token.token] = token

        return {
            "user_id": user.id,
            "email": user.email,
            "token": token.token,
        }

    def signout(self, token: str) -> bool:
        """Invalidate a token."""
        if token in self._tokens:
            del self._tokens[token]
            return True
        return False

    def validate_token(self, token: str) -> str | None:
        """Validate token, return user_id or None."""
        auth_token = self._tokens.get(token)
        if auth_token:
            return auth_token.user_id
        return None


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
