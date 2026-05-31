from app.infrastructure.chroma_adapter import ChromaAdapter
from app.services.embedding_service import EmbeddingService


class RetrievalService:
    def __init__(self, chroma_adapter: ChromaAdapter, embedding_service: EmbeddingService) -> None:
        self._chroma = chroma_adapter
        self._embedding = embedding_service

    def retrieve(self, repository_id: str, question: str, top_k: int = 5) -> list[dict]:
        question_embedding = self._embedding.embed_text(question)
        return self._chroma.query(repository_id=repository_id, embedding=question_embedding, top_k=top_k)