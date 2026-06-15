import logging
import math
import threading
from typing import Any

from app.infrastructure.settings import Settings

logger = logging.getLogger(__name__)

try:
    import chromadb
except Exception:
    chromadb = None


class ChromaAdapter:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._memory_lock = threading.Lock()
        self._memory: dict[str, list[dict[str, Any]]] = {}
        self._client = None
        if chromadb is not None:
            try:
                self._client = chromadb.HttpClient(
                    host=self._settings.chroma_host,
                    port=self._settings.chroma_port,
                    ssl=self._settings.chroma_ssl,
                )
            except Exception:
                self._client = None

    def _collection_name(self, repository_id: str) -> str:
        return f"{self._settings.chroma_collection_prefix}_{repository_id}"

    def upsert_chunks(self, repository_id: str, vectors: list[dict[str, Any]]) -> None:
        """Upsert vectors into ChromaDB, splitting into batches to avoid timeouts/OOM.

        A single call with 10k+ vectors can exceed ChromaDB's gRPC message size limit
        and cause memory spikes.  Batching keeps each request small and provides
        progress logging visible in ``docker logs``.
        """
        total = len(vectors)
        batch_size: int = getattr(self._settings, "upsert_batch_size", 500)
        logger.info("upsert_chunks | repo=%s | vectors=%d | batch_size=%d", repository_id, total, batch_size)

        if self._client is not None:
            collection = self._client.get_or_create_collection(name=self._collection_name(repository_id))
            for start in range(0, total, batch_size):
                batch = vectors[start: start + batch_size]
                collection.upsert(
                    ids=[v["chunk_id"] for v in batch],
                    embeddings=[v["embedding"] for v in batch],
                    metadatas=[v["metadata"] for v in batch],
                    documents=[v["text"] for v in batch],
                )
                logger.info(
                    "upsert_chunks progress | repo=%s | %d/%d",
                    repository_id, min(start + batch_size, total), total,
                )
            logger.info("upsert_chunks done | repo=%s", repository_id)
            return

        with self._memory_lock:
            self._memory[repository_id] = vectors
        logger.debug("upsert_chunks (in-memory) | repo=%s | vectors=%d", repository_id, total)

    def query(self, repository_id: str, embedding: list[float], top_k: int) -> list[dict[str, Any]]:
        if self._client is not None:
            collection = self._client.get_or_create_collection(name=self._collection_name(repository_id))
            result = collection.query(query_embeddings=[embedding], n_results=top_k)
            ids = result.get("ids", [[]])[0]
            docs = result.get("documents", [[]])[0]
            metas = result.get("metadatas", [[]])[0]
            distances = result.get("distances", [[]])[0]
            rows: list[dict[str, Any]] = []
            for idx, chunk_id in enumerate(ids):
                rows.append(
                    {
                        "chunk_id": chunk_id,
                        "text": docs[idx],
                        "metadata": metas[idx] or {},
                        "score": 1 - float(distances[idx]) if idx < len(distances) else 0.0,
                    }
                )
            return rows
        with self._memory_lock:
            vectors = self._memory.get(repository_id, [])
        scored = []
        for item in vectors:
            score = self._cosine(embedding, item["embedding"])
            scored.append(
                {
                    "chunk_id": item["chunk_id"],
                    "text": item["text"],
                    "metadata": item["metadata"],
                    "score": score,
                }
            )
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

    def _cosine(self, a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        na = math.sqrt(sum(x * x for x in a))
        nb = math.sqrt(sum(y * y for y in b))
        if na == 0 or nb == 0:
            return 0.0
        return dot / (na * nb)