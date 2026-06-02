"""Authentication and session API endpoints."""

from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.services.auth_service import AuthService, OnboardingSessionService

router = APIRouter(tags=["auth"])

# Singleton services (in production these would be injected via DI)
_auth_service = AuthService()
_session_service = OnboardingSessionService()


def get_auth_service() -> AuthService:
    return _auth_service


def get_session_service() -> OnboardingSessionService:
    return _session_service


def get_current_user(authorization: str = Header(default="")) -> str:
    """Extract and validate user from Authorization header."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization[7:]
    user_id = _auth_service.validate_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id


# --- Auth Models ---

class SignupRequest(BaseModel):
    email: str = Field(min_length=1)
    password: str = Field(min_length=6)


class SigninRequest(BaseModel):
    email: str = Field(min_length=1)
    password: str = Field(min_length=1)


class AuthResponse(BaseModel):
    user_id: str
    email: str
    token: str


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


# --- Auth Endpoints ---

@router.post("/api/auth/signup", response_model=AuthResponse)
def signup(payload: SignupRequest) -> AuthResponse:
    """Register a new user."""
    auth = get_auth_service()
    try:
        result = auth.signup(payload.email, payload.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return AuthResponse(**result)


@router.post("/api/auth/signin", response_model=AuthResponse)
def signin(payload: SigninRequest) -> AuthResponse:
    """Authenticate a user."""
    auth = get_auth_service()
    try:
        result = auth.signin(payload.email, payload.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    return AuthResponse(**result)


@router.post("/api/auth/signout")
def signout(authorization: str = Header(default="")) -> dict[str, str]:
    """Sign out (invalidate token)."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization[7:]
    auth = get_auth_service()
    auth.signout(token)
    return {"status": "signed_out"}


# --- Session Endpoints ---

@router.post("/api/sessions", response_model=SessionResponse)
def create_session(
    payload: SessionCreateRequest,
    user_id: str = Depends(get_current_user),
) -> SessionResponse:
    """Create a new onboarding session."""
    svc = get_session_service()
    session = svc.create_session(user_id=user_id, repository_id=payload.repository_id)
    return SessionResponse(
        id=session.id,
        user_id=session.user_id,
        repository_id=session.repository_id,
        status=session.status,
        started_at=session.started_at,
        updated_at=session.updated_at,
    )


@router.get("/api/sessions", response_model=list[SessionResponse])
def list_sessions(user_id: str = Depends(get_current_user)) -> list[SessionResponse]:
    """List all sessions for the authenticated user."""
    svc = get_session_service()
    sessions = svc.list_sessions(user_id)
    return [
        SessionResponse(
            id=s.id,
            user_id=s.user_id,
            repository_id=s.repository_id,
            status=s.status,
            started_at=s.started_at,
            updated_at=s.updated_at,
        )
        for s in sessions
    ]


@router.post("/api/sessions/{session_id}/resume", response_model=SessionResponse)
def resume_session(
    session_id: str,
    user_id: str = Depends(get_current_user),
) -> SessionResponse:
    """Resume a paused session."""
    svc = get_session_service()
    session = svc.resume_session(session_id)
    if not session or session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse(
        id=session.id,
        user_id=session.user_id,
        repository_id=session.repository_id,
        status=session.status,
        started_at=session.started_at,
        updated_at=session.updated_at,
    )


@router.post("/api/sessions/{session_id}/close", response_model=SessionResponse)
def close_session(
    session_id: str,
    user_id: str = Depends(get_current_user),
) -> SessionResponse:
    """Close a session."""
    svc = get_session_service()
    session = svc.close_session(session_id)
    if not session or session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse(
        id=session.id,
        user_id=session.user_id,
        repository_id=session.repository_id,
        status=session.status,
        started_at=session.started_at,
        updated_at=session.updated_at,
    )


@router.post(
    "/api/sessions/{session_id}/checkpoints", response_model=CheckpointResponse
)
def save_checkpoint(
    session_id: str,
    payload: CheckpointRequest,
    user_id: str = Depends(get_current_user),
) -> CheckpointResponse:
    """Save a progress checkpoint."""
    svc = get_session_service()
    session = svc.get_session(session_id)
    if not session or session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")

    cp = svc.save_checkpoint(session_id, payload.feature, payload.checkpoint_payload)
    if not cp:
        raise HTTPException(status_code=400, detail="Failed to save checkpoint")

    return CheckpointResponse(
        id=cp.id,
        session_id=cp.session_id,
        feature=cp.feature,
        checkpoint_payload=cp.checkpoint_payload,
        timestamp=cp.timestamp,
    )


@router.get(
    "/api/sessions/{session_id}/checkpoints", response_model=list[CheckpointResponse]
)
def get_checkpoints(
    session_id: str,
    user_id: str = Depends(get_current_user),
) -> list[CheckpointResponse]:
    """Get all checkpoints for a session."""
    svc = get_session_service()
    session = svc.get_session(session_id)
    if not session or session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")

    checkpoints = svc.get_checkpoints(session_id)
    return [
        CheckpointResponse(
            id=cp.id,
            session_id=cp.session_id,
            feature=cp.feature,
            checkpoint_payload=cp.checkpoint_payload,
            timestamp=cp.timestamp,
        )
        for cp in checkpoints
    ]
