"""Chat service for answering questions about code using RAG."""

from app.ports import LLMPort, RepositoryMetadataPort
from app.services.models import ChatAskResponse, ChatSource
from app.services.retrieval_service import RetrievalService


class ChatService:
    """Service for handling chat/question-answering over codebases."""

    def __init__(
        self,
        metadata_adapter: RepositoryMetadataPort,
        retrieval_service: RetrievalService,
        llm_client: LLMPort,
    ) -> None:
        self._metadata = metadata_adapter
        self._retrieval = retrieval_service
        self._llm = llm_client

    def ask(self, repository_id: str, question: str, locale: str = "pt-BR") -> ChatAskResponse:
        repo = self._metadata.get_repository(repository_id)
        if repo is None:
            raise ValueError("repository not found")
        if repo.status != "completed":
            raise ValueError("repository is not indexed yet")

        chunks = self._retrieval.retrieve(repository_id=repository_id, question=question, top_k=5)
        answer = self._llm.generate_answer(question=question, context_chunks=chunks, locale=locale)
        sources = [
            ChatSource(
                chunk_id=item["chunk_id"],
                file_path=item["metadata"].get("file_path", ""),
                start_line=int(item["metadata"].get("start_line", 0)),
                end_line=int(item["metadata"].get("end_line", 0)),
                score=float(item["score"]),
            )
            for item in chunks
        ]
        return ChatAskResponse(answer=answer, sources=sources)