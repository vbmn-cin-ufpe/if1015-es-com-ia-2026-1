"""Authentication and session API endpoints."""

from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.domain.enums import Plan
from app.middleware.auth_middleware import AuthenticatedUser, require_auth
from app.services.auth_service import AuthService, OnboardingSessionService

router = APIRouter(tags=["auth"])

# Singleton services (lazy-loaded from dependencies to avoid circular imports)
_session_service = OnboardingSessionService()


def _auth() -> AuthService:
    from app.dependencies import get_auth_service_instance
    return get_auth_service_instance()


# Alias for backward compatibility (used by main.py seed_admin_user)
def get_auth_service() -> AuthService:
    return _auth()


# ── Request / Response models ─────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    plan: str = "free"


class SigninRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class AuthResponse(BaseModel):
    user_id: str
    email: str
    token: str
    role: str
    plan: str
    email_verified: bool


class MeResponse(BaseModel):
    user_id: str
    email: str
    role: str
    plan: str
    email_verified: bool
    repos_indexed_count: int
    questions_asked_count: int


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class SessionCreateRequest(BaseModel):
    repository_id: str = Field(min_length=1)


class SessionResponse(BaseModel):
    id: str
    user_id: str
    repository_id: str
    status: str
    started_at: str
    updated_at: str


class CheckpointRequest(BaseModel):
    feature: str = Field(min_length=1)
    checkpoint_payload: dict[str, Any] = {}


class CheckpointResponse(BaseModel):
    id: str
    session_id: str
    feature: str
    checkpoint_payload: dict[str, Any]
    timestamp: str


# ── Auth endpoints ────────────────────────────────────────────────────────────

@router.post("/api/auth/signup", response_model=AuthResponse, status_code=201)
def signup(payload: SignupRequest) -> AuthResponse:
    """Register a new user. Sends a verification email."""
    try:
        plan = Plan(payload.plan) if payload.plan in Plan._value2member_map_ else Plan.FREE
        result = _auth().signup(payload.email, payload.password, plan)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return AuthResponse(**result)


@router.post("/api/auth/signin", response_model=AuthResponse)
def signin(payload: SigninRequest) -> AuthResponse:
    """Authenticate with email + password."""
    try:
        result = _auth().signin(payload.email, payload.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    return AuthResponse(**result)


@router.post("/api/auth/signout")
def signout(authorization: str = Header(default="")) -> dict[str, str]:
    """Revoke the current JWT."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token ausente")
    token = authorization[7:]
    _auth().signout(token)
    return {"status": "signed_out"}


@router.get("/api/auth/me", response_model=MeResponse)
def me(user: AuthenticatedUser = Depends(require_auth)) -> MeResponse:
    """Return the authenticated user's profile and quota."""
    return MeResponse(
        user_id=user.user_id,
        email=user.email,
        role=user.role.value,
        plan=user.plan.value,
        email_verified=user.email_verified,
        repos_indexed_count=user.repos_indexed_count,
        questions_asked_count=user.questions_asked_count,
    )


@router.get("/api/auth/verify-email")
def verify_email(token: str) -> dict[str, Any]:
    """Click-through email verification link."""
    ok = _auth().verify_email(token)
    if not ok:
        raise HTTPException(status_code=400, detail="Token de verificação inválido ou expirado")
    return {"verified": True, "message": "E-mail confirmado com sucesso!"}


@router.post("/api/auth/resend-verification")
def resend_verification(payload: ResendVerificationRequest) -> dict[str, str]:
    """Resend the account verification email."""
    _auth().resend_verification(payload.email)
    return {"status": "sent"}


@router.post("/api/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest) -> dict[str, str]:
    """Request a 6-digit password-reset code via email."""
    _auth().forgot_password(payload.email)
    # Always 200 — do not reveal whether the email exists
    return {"status": "sent", "message": "Se esse e-mail existir, você receberá um código em breve."}


@router.post("/api/auth/reset-password")
def reset_password(payload: ResetPasswordRequest) -> dict[str, str]:
    """Reset password using the 6-digit code received by email."""
    try:
        ok = _auth().reset_password(payload.email, payload.code, payload.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not ok:
        raise HTTPException(status_code=400, detail="Código inválido, expirado ou e-mail não encontrado")
    return {"status": "ok", "message": "Senha redefinida com sucesso!"}


# ── Session endpoints (unchanged) ─────────────────────────────────────────────

@router.post("/api/sessions", response_model=SessionResponse)
def create_session(
    payload: SessionCreateRequest,
    user: AuthenticatedUser = Depends(require_auth),
) -> SessionResponse:
    session = _session_service.create_session(user_id=user.user_id, repository_id=payload.repository_id)
    return SessionResponse(id=session.id, user_id=session.user_id, repository_id=session.repository_id,
                           status=session.status, started_at=session.started_at, updated_at=session.updated_at)


@router.get("/api/sessions", response_model=list[SessionResponse])
def list_sessions(user: AuthenticatedUser = Depends(require_auth)) -> list[SessionResponse]:
    return [
        SessionResponse(id=s.id, user_id=s.user_id, repository_id=s.repository_id,
                        status=s.status, started_at=s.started_at, updated_at=s.updated_at)
        for s in _session_service.list_sessions(user.user_id)
    ]


@router.post("/api/sessions/{session_id}/resume", response_model=SessionResponse)
def resume_session(session_id: str, user: AuthenticatedUser = Depends(require_auth)) -> SessionResponse:
    session = _session_service.resume_session(session_id)
    if not session or session.user_id != user.user_id:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    return SessionResponse(id=session.id, user_id=session.user_id, repository_id=session.repository_id,
                           status=session.status, started_at=session.started_at, updated_at=session.updated_at)


@router.post("/api/sessions/{session_id}/close", response_model=SessionResponse)
def close_session(session_id: str, user: AuthenticatedUser = Depends(require_auth)) -> SessionResponse:
    session = _session_service.close_session(session_id)
    if not session or session.user_id != user.user_id:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    return SessionResponse(id=session.id, user_id=session.user_id, repository_id=session.repository_id,
                           status=session.status, started_at=session.started_at, updated_at=session.updated_at)


@router.post("/api/sessions/{session_id}/checkpoints", response_model=CheckpointResponse)
def save_checkpoint(
    session_id: str,
    payload: CheckpointRequest,
    user: AuthenticatedUser = Depends(require_auth),
) -> CheckpointResponse:
    session = _session_service.get_session(session_id)
    if not session or session.user_id != user.user_id:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    cp = _session_service.save_checkpoint(session_id, payload.feature, payload.checkpoint_payload)
    if not cp:
        raise HTTPException(status_code=400, detail="Falha ao salvar checkpoint")
    return CheckpointResponse(id=cp.id, session_id=cp.session_id, feature=cp.feature,
                              checkpoint_payload=cp.checkpoint_payload, timestamp=cp.timestamp)


@router.get("/api/sessions/{session_id}/checkpoints", response_model=list[CheckpointResponse])
def get_checkpoints(session_id: str, user: AuthenticatedUser = Depends(require_auth)) -> list[CheckpointResponse]:
    session = _session_service.get_session(session_id)
    if not session or session.user_id != user.user_id:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    return [
        CheckpointResponse(id=cp.id, session_id=cp.session_id, feature=cp.feature,
                           checkpoint_payload=cp.checkpoint_payload, timestamp=cp.timestamp)
        for cp in _session_service.get_checkpoints(session_id)
    ]
