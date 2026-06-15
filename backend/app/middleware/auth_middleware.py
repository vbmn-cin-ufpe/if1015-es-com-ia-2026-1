"""FastAPI dependency factories for authentication and authorization."""

from dataclasses import dataclass
from typing import Callable

from fastapi import Depends, Header, HTTPException

from app.domain.enums import Plan, PlanAction, Role
from app.services.plan_enforcer import PlanContext, PlanEnforcer
from app.services.token_service import TokenClaims


@dataclass
class AuthenticatedUser:
    """Request-scoped user, populated by require_auth."""
    user_id: str
    email: str
    role: Role
    plan: Plan
    email_verified: bool
    repos_indexed_count: int = 0
    questions_asked_count: int = 0

    @property
    def is_admin(self) -> bool:
        return self.role == Role.ADMIN

    def to_plan_context(self) -> PlanContext:
        return PlanContext(
            user_id=self.user_id,
            role=self.role,
            plan=self.plan,
            repos_indexed_count=self.repos_indexed_count,
            questions_asked_count=self.questions_asked_count,
        )


# ── Singletons (set once at startup from dependencies.py) ────────────────────

_auth_service = None
_plan_enforcer = PlanEnforcer()


def _set_auth_service(svc) -> None:
    """Called from app.dependencies on first use."""
    global _auth_service
    _auth_service = svc


def _get_auth_service():
    global _auth_service
    if _auth_service is None:
        # Lazy import to avoid circular dependencies
        from app.dependencies import get_auth_service_instance
        _auth_service = get_auth_service_instance()
    return _auth_service


# ── Core dependency ───────────────────────────────────────────────────────────

def require_auth(authorization: str = Header(default="")) -> AuthenticatedUser:
    """
    FastAPI dependency: validates the Bearer JWT and returns AuthenticatedUser.
    Use with: `user: AuthenticatedUser = Depends(require_auth)`
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Token de autenticação ausente ou inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization[7:]
    svc = _get_auth_service()
    claims: TokenClaims | None = svc.validate_token(token)
    if not claims:
        raise HTTPException(
            status_code=401,
            detail="Token expirado ou inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch fresh quota counts from DB
    user_entity = svc.get_user(claims.user_id)
    repos_count = user_entity.repos_indexed_count if user_entity else 0
    questions_count = user_entity.questions_asked_count if user_entity else 0

    return AuthenticatedUser(
        user_id=claims.user_id,
        email=claims.email,
        role=claims.role,
        plan=claims.plan,
        email_verified=claims.email_verified,
        repos_indexed_count=repos_count,
        questions_asked_count=questions_count,
    )


# ── Role guard ────────────────────────────────────────────────────────────────

def require_role(*roles: Role) -> Callable:
    """
    Dependency factory that restricts access to specific roles.
    Admin always passes through.

    Usage:
        @router.delete("/{id}", dependencies=[Depends(require_role(Role.ADMIN))])
    """
    def _check(user: AuthenticatedUser = Depends(require_auth)) -> AuthenticatedUser:
        if user.role == Role.ADMIN:
            return user
        if user.role not in roles:
            raise HTTPException(
                status_code=403,
                detail=f"Acesso restrito. Requer: {[r.value for r in roles]}",
            )
        return user
    return _check


# ── Plan guard ────────────────────────────────────────────────────────────────

def require_plan(action: PlanAction) -> Callable:
    """
    Dependency factory that enforces plan quotas.
    Admin always bypasses.

    Usage:
        @router.post("/index", dependencies=[Depends(require_plan(PlanAction.INDEX_REPO))])
    """
    def _check(user: AuthenticatedUser = Depends(require_auth)) -> AuthenticatedUser:
        _plan_enforcer.check(user.to_plan_context(), action)
        return user
    return _check


# Alias — convenient dependency for controllers that just need an authenticated user
get_current_user = require_auth
