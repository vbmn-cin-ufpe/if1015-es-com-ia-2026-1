"""User domain entity."""

from dataclasses import dataclass, field
from typing import Optional
from uuid import uuid4

from .base_entity import BaseEntity
from .enums import Plan, Role


@dataclass
class User(BaseEntity):
    """
    User aggregate root.

    Supports:
    - Email + password auth (password_hash nullable for social-only users)
    - Social OAuth login (social_provider + social_id)
    - social_linked: True when the same account is linked to BOTH
      a password credential AND a social provider
    - Email verification via UUID token
    - Password reset via 6-digit code (expires in 15 min)
    - Role-based access (admin overrides all quotas)
    - Plan-based quotas (repos indexed, questions asked)
    """

    id: str = field(default_factory=lambda: str(uuid4()))
    email: str = ""

    # Credential — None when account was created via social-only
    password_hash: Optional[str] = None

    # Authorization
    role: Role = Role.FREE
    plan: Plan = Plan.FREE

    # Social OAuth
    social_provider: Optional[str] = None   # 'google', 'github', etc.
    social_id: Optional[str] = None         # Provider's user ID
    social_linked: bool = False             # True when pw + social are linked

    # Email verification
    email_verified: bool = False
    email_verify_token: Optional[str] = None
    email_verify_expires: Optional[str] = None

    # Password reset (6-digit numeric code)
    reset_token: Optional[str] = None
    reset_token_expires: Optional[str] = None

    # Quota counters (incremented in service layer)
    repos_indexed_count: int = 0
    questions_asked_count: int = 0
