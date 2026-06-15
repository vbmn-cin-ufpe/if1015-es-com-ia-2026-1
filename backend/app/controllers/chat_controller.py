"""Chat/Q&A API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_chat_service, get_user_repository_instance
from app.domain.enums import PlanAction
from app.middleware.auth_middleware import AuthenticatedUser, require_auth, require_plan
from app.services.chat_service import ChatService
from app.services.models import ChatAskRequest, ChatAskResponse

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/ask", response_model=ChatAskResponse)
def ask(
    payload: ChatAskRequest,
    chat_service: ChatService = Depends(get_chat_service),
    user: AuthenticatedUser = Depends(require_plan(PlanAction.ASK_QUESTION)),
) -> ChatAskResponse:
    """Ask a question about the codebase."""
    try:
        result = chat_service.ask(repository_id=payload.repository_id, question=payload.question)
        # Increment quota counter
        if not user.is_admin:
            get_user_repository_instance().increment_questions_count(user.user_id)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ── LLM answer feedback (thumbs up/down) ─────────────────────────────────────

class AnswerFeedbackRequest(BaseModel):
    response_id: str    # opaque ID returned by /ask (or any client-generated UUID)
    repository_id: str
    thumbs_up: bool     # True = positive, False = negative
    comment: str = ""


class AnswerFeedbackResponse(BaseModel):
    feedback_id: str
    status: str


@router.post("/feedback", response_model=AnswerFeedbackResponse)
def submit_answer_feedback(
    payload: AnswerFeedbackRequest,
    _user: AuthenticatedUser = Depends(require_auth),
) -> AnswerFeedbackResponse:
    """Record a thumbs-up or thumbs-down rating for an LLM answer."""
    from app.infrastructure.metrics_repository_adapter import FeedbackRepositoryAdapter
    from app.infrastructure.settings import get_settings
    from app.services.metrics_ingestion_service import FeedbackService

    settings = get_settings()
    feedback_repo = FeedbackRepositoryAdapter(settings)
    feedback_svc = FeedbackService()

    # Map thumbs_up → usefulness_score (5 = good, 1 = bad) and correctness_score same
    score = 5 if payload.thumbs_up else 1

    feedback = feedback_svc.create_feedback(
        repository_id=payload.repository_id,
        response_id=payload.response_id,
        usefulness_score=score,
        correctness_score=score,
        comment=payload.comment,
    )
    feedback_repo.save_feedback(feedback)

    return AnswerFeedbackResponse(feedback_id=feedback.id, status="recorded")