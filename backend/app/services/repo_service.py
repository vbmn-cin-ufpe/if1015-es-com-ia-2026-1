"""Repository indexing service - orchestrates the ingestion pipeline."""

import logging
import time
from uuid import uuid4

from app.infrastructure.settings import Settings
from app.ports import EmbeddingPort, GitClientPort, RepositoryMetadataPort, VectorStorePort
from app.services.chunking_service import ChunkingService
from app.services.ingestion_service import IngestionService
from app.services.models import RepositoryIndexResponse, RepositoryStatusResponse

logger = logging.getLogger(__name__)


class RepoService:
    """Service for managing repository indexing operations."""

    def __init__(
        self,
        metadata_adapter: RepositoryMetadataPort,
        git_client: GitClientPort,
        ingestion_service: IngestionService,
        chunking_service: ChunkingService,
        embedding_service: EmbeddingPort,
        chroma_adapter: VectorStorePort,
        settings: Settings | None = None,
    ) -> None:
        from app.infrastructure.settings import get_settings

        self._settings = settings or get_settings()
        self._metadata = metadata_adapter
        self._git = git_client
        self._ingestion = ingestion_service
        self._chunking = chunking_service
        self._embedding = embedding_service
        self._chroma = chroma_adapter

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def queue_index(self, repository_url: str) -> RepositoryIndexResponse:
        """Validate the URL, create the DB record and return immediately.

        The caller is responsible for scheduling :meth:`run_index` as a
        background task.  This two-phase design lets the HTTP endpoint
        respond in milliseconds while heavy work happens asynchronously.
        """
        self._validate_repository_ref(repository_url)
        repository_id = str(uuid4())
        self._metadata.create_repository(
            repository_id=repository_id,
            repository_url=repository_url,
            status="queued",
        )
        logger.info("queued | id=%s | url=%s", repository_id, repository_url)
        return RepositoryIndexResponse(repository_id=repository_id, job_status="queued")

    def run_index(self, repository_id: str, repository_url: str) -> None:
        """Execute the full indexing pipeline for *repository_id*.

        This method is designed to be called inside a background task.
        It updates the repository status at every stage so that the frontend
        polling the status endpoint always has an up-to-date progress signal.

        Stages and corresponding status values
        ─────────────────────────────────────
        queued      → cloning   → detecting → chunking
        → embedding → storing  → completed (or failed)
        """
        t0 = time.perf_counter()
        logger.info("[%s] indexing started | url=%s", repository_id, repository_url)

        try:
            # ── 1. Clone ──────────────────────────────────────────────────
            self._set_status(repository_id, "cloning")
            repo_path = self._git.prepare_repository(repository_url, repository_id)
            logger.info(
                "[%s] cloned | path=%s | elapsed=%.1fs",
                repository_id, repo_path, time.perf_counter() - t0,
            )

            # ── 2. Detect languages ───────────────────────────────────────
            self._set_status(repository_id, "detecting")
            lang_counts = self._ingestion.detect_languages(repo_path)
            logger.info("[%s] languages detected | %s", repository_id, lang_counts)

            # ── 3. Collect & chunk ────────────────────────────────────────
            self._set_status(repository_id, "chunking")
            source_files = self._ingestion.collect_files(
                repo_path, max_file_size_kb=self._settings.max_file_size_kb
            )
            logger.info(
                "[%s] files collected | count=%d | elapsed=%.1fs",
                repository_id, len(source_files), time.perf_counter() - t0,
            )
            chunks = self._chunking.build_chunks(repo_path, source_files)
            logger.info(
                "[%s] chunks built | count=%d | elapsed=%.1fs",
                repository_id, len(chunks), time.perf_counter() - t0,
            )

            # ── 4. Embed ──────────────────────────────────────────────────
            self._set_status(repository_id, "embedding")
            vectors = self._embedding.embed_chunks(chunks)
            logger.info(
                "[%s] embeddings generated | count=%d | elapsed=%.1fs",
                repository_id, len(vectors), time.perf_counter() - t0,
            )

            # ── 5. Store ──────────────────────────────────────────────────
            self._set_status(repository_id, "storing")
            self._chroma.upsert_chunks(repository_id=repository_id, vectors=vectors)
            logger.info(
                "[%s] stored to ChromaDB | elapsed=%.1fs",
                repository_id, time.perf_counter() - t0,
            )

            # ── 6. Complete ───────────────────────────────────────────────
            stats = {
                "source_files": len(source_files),
                "languages": lang_counts,
                "chunks": len(chunks),
                "vectors": len(vectors),
                "python_files": lang_counts.get("python", 0),
                "elapsed_seconds": round(time.perf_counter() - t0, 1),
            }
            self._metadata.update_repository_status(
                repository_id=repository_id, status="completed", stats=stats
            )
            logger.info(
                "[%s] completed | total=%.1fs | stats=%s",
                repository_id, time.perf_counter() - t0, stats,
            )

        except Exception as exc:
            elapsed = time.perf_counter() - t0
            logger.exception(
                "[%s] indexing FAILED | elapsed=%.1fs | error=%s",
                repository_id, elapsed, exc,
            )
            self._metadata.update_repository_status(
                repository_id=repository_id,
                status="failed",
                stats={"elapsed_seconds": round(elapsed, 1)},
                error_message=str(exc),
            )

    def start_index(self, repository_url: str) -> RepositoryIndexResponse:
        """Synchronous index (queue + run in the same thread).

        Kept for backwards compatibility with existing tests and callers that
        expect a blocking response.  Production code should prefer the
        async path: ``queue_index`` + ``run_index`` via BackgroundTasks.
        """
        resp = self.queue_index(repository_url)
        self.run_index(resp.repository_id, repository_url)
        record = self._metadata.get_repository(resp.repository_id)
        final_status = record.status if record else "failed"
        return RepositoryIndexResponse(
            repository_id=resp.repository_id, job_status=final_status
        )

    def get_status(self, repository_id: str) -> RepositoryStatusResponse:
        record = self._metadata.get_repository(repository_id)
        if record is None:
            raise ValueError("repository not found")
        return RepositoryStatusResponse(
            repository_id=record.repository_id,
            index_status=record.status,
            stats=record.stats,
            error_message=record.error_message,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _set_status(self, repository_id: str, status: str) -> None:
        """Update repository status and emit a stage-level log line."""
        logger.info("[%s] stage → %s", repository_id, status)
        self._metadata.update_repository_status(
            repository_id=repository_id, status=status, stats={}
        )

    def _validate_repository_ref(self, repository_ref: str) -> None:
        value = repository_ref.strip()
        if value.startswith("http://") or value.startswith("https://"):
            return
        if self._settings.allow_local_repos:
            return
        raise ValueError("repository_url must be a valid http(s) URL")
