"""JWT token service — stateless JWTs with jti blacklist support."""

import logging
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.domain.enums import Plan, Role

logger = logging.getLogger(__name__)

try:
    import jwt as pyjwt
    _JWT_AVAILABLE = True
except ImportError:
    _JWT_AVAILABLE = False
    logger.warning("PyJWT not installed — tokens will be opaque secrets (no expiry)")


@dataclass
class TokenClaims:
    """Decoded JWT claims or equivalent for opaque tokens."""
    jti: str
    user_id: str
    email: str
    role: Role
    plan: Plan
    email_verified: bool
    expires_at: str


class TokenService:
    """
    Issues and validates JWTs.
    Falls back to opaque token dict if PyJWT is unavailable.
    """

    def __init__(self, secret: str, expiry_hours: int = 24) -> None:
        self._secret = secret
        self._expiry_hours = expiry_hours
        self._opaque: dict[str, TokenClaims] = {}  # fallback store

    def issue(
        self,
        user_id: str,
        email: str,
        role: Role,
        plan: Plan,
        email_verified: bool,
    ) -> tuple[str, str, str]:
        """
        Returns (token, jti, expires_at_iso).
        """
        jti = secrets.token_hex(16)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=self._expiry_hours)
        expires_iso = expires_at.isoformat()

        if _JWT_AVAILABLE:
            payload = {
                "sub": user_id,
                "email": email,
                "role": role.value,
                "plan": plan.value,
                "email_verified": email_verified,
                "jti": jti,
                "iat": int(now.timestamp()),
                "exp": int(expires_at.timestamp()),
            }
            token = pyjwt.encode(payload, self._secret, algorithm="HS256")
        else:
            token = secrets.token_urlsafe(32)
            self._opaque[token] = TokenClaims(
                jti=jti,
                user_id=user_id,
                email=email,
                role=role,
                plan=plan,
                email_verified=email_verified,
                expires_at=expires_iso,
            )

        return token, jti, expires_iso

    def decode(self, token: str) -> Optional[TokenClaims]:
        """Decode and validate token. Returns None on any failure."""
        if _JWT_AVAILABLE:
            try:
                payload = pyjwt.decode(
                    token,
                    self._secret,
                    algorithms=["HS256"],
                    options={"require": ["sub", "jti", "exp"]},
                )
                return TokenClaims(
                    jti=payload["jti"],
                    user_id=payload["sub"],
                    email=payload.get("email", ""),
                    role=Role(payload.get("role", Role.FREE.value)),
                    plan=Plan(payload.get("plan", Plan.FREE.value)),
                    email_verified=payload.get("email_verified", False),
                    expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc).isoformat(),
                )
            except Exception:
                return None
        else:
            return self._opaque.get(token)
