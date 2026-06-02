"""Chat/Q&A API endpoints."""

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_chat_service
from app.services.chat_service import ChatService
from app.services.models import ChatAskRequest, ChatAskResponse

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/ask", response_model=ChatAskResponse)
def ask(
    payload: ChatAskRequest,
    chat_service: ChatService = Depends(get_chat_service),
) -> ChatAskResponse:
    """Ask a question about the codebase."""
    try:
        return chat_service.ask(repository_id=payload.repository_id, question=payload.question)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc