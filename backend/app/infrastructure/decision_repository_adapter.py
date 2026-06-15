"""Decision repository adapter — persists commit decisions with in-memory fallback."""

import json
import logging
from typing import Any

from app.infrastructure.settings import Settings
from app.services.commit_history_service import CommitDecision

logger = logging.getLogger(__name__)


class DecisionRepositoryAdapter:
    """Persists classified commit decisions and timeline data."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._decisions: dict[str, list[CommitDecision]] = {}  # repo_id -> decisions
        self._conn = None
        self._init_db()

    def _init_db(self) -> None:
        if not self._settings.postgres_dsn:
            logger.info("POSTGRES_DSN not set — using in-memory decision storage")
            return
        try:
            import psycopg

            self._conn = psycopg.connect(self._settings.postgres_dsn)
            with self._conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS commit_decisions (
                        id TEXT PRIMARY KEY,
                        commit_id TEXT NOT NULL,
                        repository_id TEXT NOT NULL,
                        timestamp TEXT NOT NULL,
                        author TEXT NOT NULL DEFAULT '',
                        category TEXT NOT NULL,
                        confidence DOUBLE PRECISION NOT NULL,
                        summary TEXT NOT NULL,
                        touched_modules TEXT NOT NULL DEFAULT '[]'
                    )
                    """
                )
                # Add author column if the table already exists without it
                cur.execute(
                    """
                    DO $$ BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name='commit_decisions' AND column_name='author'
                        ) THEN
                            ALTER TABLE commit_decisions ADD COLUMN author TEXT NOT NULL DEFAULT '';
                        END IF;
                    END $$;
                    """
                )
                cur.execute(
                    "CREATE INDEX IF NOT EXISTS idx_decisions_repo "
                    "ON commit_decisions(repository_id, timestamp DESC)"
                )
            self._conn.commit()
            logger.info("Decision DB table initialized")
        except Exception as exc:
            logger.warning("Decision DB init failed, using in-memory: %s", exc)
            self._conn = None

    def save_decisions(
        self, repository_id: str, decisions: list[CommitDecision]
    ) -> None:
        """Persist a batch of classified decisions."""
        if self._conn is None:
            self._decisions[repository_id] = decisions
            return

        try:
            with self._conn.cursor() as cur:
                for d in decisions:
                    cur.execute(
                        """
                        INSERT INTO commit_decisions
                            (id, commit_id, repository_id, timestamp, author, category,
                             confidence, summary, touched_modules)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING
                        """,
                        (
                            d.id,
                            d.commit_id,
                            repository_id,
                            d.timestamp,
                            getattr(d, "author", ""),
                            d.category,
                            d.confidence,
                            d.summary,
                            json.dumps(d.touched_modules),
                        ),
                    )
            self._conn.commit()
        except Exception as exc:
            logger.error("Failed to persist decisions: %s", exc)
            self._decisions[repository_id] = decisions

    def get_decisions(self, repository_id: str) -> list[CommitDecision]:
        """Retrieve all decisions for a repository."""
        if self._conn is None:
            return self._decisions.get(repository_id, [])

        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    "SELECT id, commit_id, repository_id, timestamp, author, category, "
                    "confidence, summary, touched_modules "
                    "FROM commit_decisions WHERE repository_id = %s "
                    "ORDER BY timestamp DESC",
                    (repository_id,),
                )
                return [
                    CommitDecision(
                        id=r[0],
                        commit_id=r[1],
                        repository_id=r[2],
                        timestamp=r[3],
                        author=r[4],
                        category=r[5],
                        confidence=r[6],
                        summary=r[7],
                        touched_modules=json.loads(r[8]),
                    )
                    for r in cur.fetchall()
                ]
        except Exception as exc:
            logger.error("Failed to get decisions: %s", exc)
            return self._decisions.get(repository_id, [])

    def delete_decisions(self, repository_id: str) -> None:
        """Delete all decisions for a repository (used to force re-ingestion)."""
        self._decisions.pop(repository_id, None)
        if self._conn is None:
            return
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM commit_decisions WHERE repository_id = %s",
                    (repository_id,),
                )
            self._conn.commit()
        except Exception as exc:
            logger.error("Failed to delete decisions: %s", exc)
