from fastapi import APIRouter, HTTPException

from app.infrastructure.chroma_adapter import ChromaAdapter
from app.infrastructure.llm_client import LlmClient
from app.infrastructure.postgres_adapter import PostgresAdapter
from app.services.chat_service import ChatService
from app.services.embedding_service import EmbeddingService
from app.services.models import ChatAskRequest, ChatAskResponse
from app.services.retrieval_service import RetrievalService

router = APIRouter(prefix="/api/chat", tags=["chat"])

_metadata = PostgresAdapter()
_retrieval = RetrievalService(chroma_adapter=ChromaAdapter(), embedding_service=EmbeddingService())
_chat_service = ChatService(metadata_adapter=_metadata, retrieval_service=_retrieval, llm_client=LlmClient())


@router.post("/ask", response_model=ChatAskResponse)
def ask(payload: ChatAskRequest) -> ChatAskResponse:
    try:
        return _chat_service.ask(repository_id=payload.repository_id, question=payload.question)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc