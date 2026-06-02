"""Embedding service using sentence-transformers for semantic similarity."""

import hashlib
import logging

from app.infrastructure.settings import Settings

logger = logging.getLogger(__name__)

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None
    logger.warning("sentence-transformers not installed, using fallback hash-based embeddings")


class EmbeddingService:
    """Service for generating text embeddings.
    
    Uses sentence-transformers when available, falls back to deterministic hash-based
    embeddings for development/testing without external dependencies.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._model = None
        
        if SentenceTransformer is not None:
            try:
                self._model = SentenceTransformer(settings.embedding_model)
                logger.info(f"Loaded embedding model: {settings.embedding_model}")
            except Exception as e:
                logger.warning(f"Failed to load embedding model: {e}, using fallback")
                self._model = None

    def embed_text(self, text: str) -> list[float]:
        """Generate embedding vector for text."""
        if self._model is not None:
            # Use real semantic embeddings
            embedding = self._model.encode(text, convert_to_numpy=True)
            return embedding.tolist()
        
        # Fallback: deterministic hash-based pseudo-embeddings
        return self._hash_based_embedding(text)

    def embed_chunks(self, chunks: list[dict]) -> list[dict]:
        """Generate embeddings for a batch of chunks."""
        vectors: list[dict] = []
        
        if self._model is not None:
            # Batch encode for efficiency
            texts = [chunk["text"] for chunk in chunks]
            embeddings = self._model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
            
            for chunk, embedding in zip(chunks, embeddings):
                vectors.append(
                    {
                        "chunk_id": chunk["chunk_id"],
                        "text": chunk["text"],
                        "metadata": chunk["metadata"],
                        "embedding": embedding.tolist(),
                    }
                )
        else:
            # Fallback: process individually
            for chunk in chunks:
                vectors.append(
                    {
                        "chunk_id": chunk["chunk_id"],
                        "text": chunk["text"],
                        "metadata": chunk["metadata"],
                        "embedding": self._hash_based_embedding(chunk["text"]),
                    }
                )
        
        return vectors

    def _hash_based_embedding(self, text: str) -> list[float]:
        """Deterministic hash-based pseudo-embedding for fallback."""
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        dim = self._settings.embedding_dim
        values = [digest[i % len(digest)] / 255.0 for i in range(dim)]
        return values