"""Embedding service — backends: local (sentence-transformers) ou openai (API).

EMBEDDING_PROVIDER=openai  → usa OPENAI_API_KEY (separado de LLM_API_KEY do Abacus)
                              EMBEDDING_MODEL=text-embedding-3-small, EMBEDDING_DIM=1536
EMBEDDING_PROVIDER=local   → sentence-transformers CPU, sem chave necessária

Otimização OpenAI:
  - Batches processados em paralelo via ThreadPoolExecutor (EMBEDDING_MAX_WORKERS, padrão 4)
  - I/O-bound: múltiplas chamadas HTTP simultâneas reduzem tempo total drasticamente
  - Tier 1 (conta nova): reduz impacto dos backoffs — outros batches avançam durante retry
  - Tier 2+: speedup linear com o número de workers
"""
import hashlib
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Callable

from app.infrastructure.settings import Settings

logger = logging.getLogger(__name__)

try:
    from sentence_transformers import SentenceTransformer as _ST
except ImportError:
    _ST = None

try:
    from openai import OpenAI as _OpenAI
except ImportError:
    _OpenAI = None


class EmbeddingService:
    """Embedding service with pluggable backends (local | openai)."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._encode_batch: Callable[[list[str]], list[list[float]]] | None = None
        self._concurrent = False  # True only for OpenAI (I/O bound → benefits from threads)
        provider = settings.embedding_provider.lower()
        logger.info("embedding provider = %s | model = %s", provider, settings.embedding_model)
        if provider == "openai":
            self._init_openai()
        else:
            if provider != "local":
                logger.warning("unknown provider '%s', falling back to local", provider)
            self._init_local()

    # ── Backend initializers ────────────────────────────────────────────────

    def _init_local(self) -> None:
        if _ST is None:
            logger.warning("sentence-transformers not installed — using hash fallback")
            return
        try:
            model = _ST(self._settings.embedding_model)
            batch_size = self._settings.embedding_batch_size

            def _encode(texts: list[str]) -> list[list[float]]:
                return model.encode(
                    texts, batch_size=batch_size,
                    convert_to_numpy=True, show_progress_bar=False,
                ).tolist()

            self._encode_batch = _encode
            logger.info("local model loaded | model=%s", self._settings.embedding_model)
        except Exception as exc:
            logger.warning("failed to load local model: %s — using hash fallback", exc)

    def _init_openai(self) -> None:
        """OpenAI Embeddings API usando OPENAI_API_KEY (separado de LLM_API_KEY do Abacus)."""
        if _OpenAI is None:
            logger.warning("openai package not installed — falling back to local")
            self._init_local()
            return
        api_key = self._settings.openai_api_key
        if not api_key:
            logger.warning("OPENAI_API_KEY not set — falling back to local embeddings")
            self._init_local()
            return
        try:
            client = _OpenAI(api_key=api_key)
            model = self._settings.embedding_model

            def _encode(texts: list[str]) -> list[list[float]]:
                result = client.embeddings.create(input=texts, model=model)
                return [item.embedding for item in result.data]

            self._encode_batch = _encode
            self._concurrent = True
            logger.info(
                "openai embedding ready | model=%s | workers=%d",
                model, self._settings.embedding_max_workers,
            )
        except Exception as exc:
            logger.warning("failed to init openai embedding: %s — falling back to local", exc)
            self._init_local()

    # ── Public API ──────────────────────────────────────────────────────────

    def embed_text(self, text: str) -> list[float]:
        """Embedding para uma query (usado pelo chat service)."""
        if self._encode_batch is not None:
            return self._encode_batch([text])[0]
        return self._hash_based_embedding(text)

    def embed_chunks(self, chunks: list[dict]) -> list[dict]:
        """Embedding de todos os chunks com log de progresso por batch."""
        total = len(chunks)
        texts = [c["text"] for c in chunks]
        logger.info(
            "embed_chunks | provider=%s | chunks=%d",
            self._settings.embedding_provider, total,
        )
        t0 = time.perf_counter()

        if self._encode_batch is not None:
            if self._concurrent:
                all_embeddings = self._embed_concurrent(texts, t0, total)
            else:
                all_embeddings = self._embed_sequential(texts, t0, total)
        else:
            all_embeddings = [self._hash_based_embedding(t) for t in texts]

        logger.info(
            "embed_chunks done | chunks=%d | elapsed=%.1fs",
            total, time.perf_counter() - t0,
        )
        return [
            {
                "chunk_id": c["chunk_id"],
                "text": c["text"],
                "metadata": c["metadata"],
                "embedding": emb,
            }
            for c, emb in zip(chunks, all_embeddings)
        ]

    # ── Fallback ────────────────────────────────────────────────────────────

    def _embed_sequential(self, texts: list[str], t0: float, total: int) -> list[list[float]]:
        """Processa batches um a um — usado pelo backend local (CPU-bound, GIL impede paralelismo)."""
        batch_size = self._settings.embedding_batch_size
        all_embeddings: list[list[float]] = []
        for start in range(0, total, batch_size):
            batch_embs = self._encode_batch(texts[start: start + batch_size])  # type: ignore[misc]
            all_embeddings.extend(batch_embs)
            done = min(start + batch_size, total)
            elapsed = time.perf_counter() - t0
            rate = done / elapsed if elapsed > 0 else 0
            logger.info(
                "embed_chunks progress | %d/%d | %.0f chunks/s | eta ~%.0fs",
                done, total, rate, (total - done) / rate if rate > 0 else 0,
            )
        return all_embeddings

    def _embed_concurrent(self, texts: list[str], t0: float, total: int) -> list[list[float]]:
        """Processa batches em paralelo — usado pelo OpenAI (I/O-bound, sem GIL penalty).

        Com EMBEDDING_MAX_WORKERS=4 (padrão):
          - Tier 1 (conta nova): durante o backoff de um batch, outros 3 avançam
          - Tier 2+: speedup ~4x linear, reduz de ~10s para ~3s no nestjs/nest
        """
        batch_size = self._settings.embedding_batch_size
        workers = self._settings.embedding_max_workers
        batches = [(i, texts[i: i + batch_size]) for i in range(0, total, batch_size)]
        results: dict[int, list[list[float]]] = {}
        completed = 0

        logger.info(
            "embed_chunks concurrent | batches=%d | workers=%d | batch_size=%d",
            len(batches), workers, batch_size,
        )

        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {pool.submit(self._encode_batch, batch): idx for idx, batch in batches}  # type: ignore[misc]
            for future in as_completed(futures):
                idx = futures[future]
                results[idx] = future.result()
                completed += len(results[idx])
                elapsed = time.perf_counter() - t0
                rate = completed / elapsed if elapsed > 0 else 0
                logger.info(
                    "embed_chunks progress | %d/%d | %.0f chunks/s | eta ~%.0fs",
                    completed, total, rate, (total - completed) / rate if rate > 0 else 0,
                )

        # Reordena pelo índice original do batch para preservar a ordem dos chunks
        all_embeddings: list[list[float]] = []
        for idx, _ in batches:
            all_embeddings.extend(results[idx])
        return all_embeddings

    def _hash_based_embedding(self, text: str) -> list[float]:
        """Pseudo-embedding determinístico baseado em hash (sem dependências)."""
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        dim = self._settings.embedding_dim
        return [digest[i % len(digest)] / 255.0 for i in range(dim)]
