"""Retrieval service for finding relevant code chunks using semantic search."""

from app.ports import EmbeddingPort, VectorStorePort


class RetrievalService:
    """Service for retrieving relevant code chunks based on semantic similarity."""

    def __init__(self, chroma_adapter: VectorStorePort, embedding_service: EmbeddingPort) -> None:
        self._chroma = chroma_adapter
        self._embedding = embedding_service

    def retrieve(self, repository_id: str, question: str, top_k: int = 5) -> list[dict]:
        question_embedding = self._embedding.embed_text(question)
        return self._chroma.query(repository_id=repository_id, embedding=question_embedding, top_k=top_k)