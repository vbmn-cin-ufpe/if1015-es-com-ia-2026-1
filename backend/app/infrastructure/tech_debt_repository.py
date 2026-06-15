"""Persistence adapter for tech-debt score snapshots."""

import json
import logging
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.infrastructure.settings import Settings

logger = logging.getLogger(__name__)


@dataclass
class TechDebtSnapshot:
    """One point in the tech-debt timeline for a repository."""
    id: str
    repository_id: str
    snapshot_ts: str       # ISO 8601
    avg_score: float
    total_files: int
    critical_count: int    # files with score ≥ 75
    high_count: int        # files with score ≥ 50
    top_files: list[dict[str, Any]] = field(default_factory=list)


class TechDebtRepository:
    """Stores and retrieves tech-debt score snapshots with in-memory fallback."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._lock = threading.Lock()
        self._memory: list[TechDebtSnapshot] = []
        self._conn = None
        self._init_db()

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _init_db(self) -> None:
        if not self._settings.postgres_dsn:
            return
        try:
            import psycopg
            self._conn = psycopg.connect(self._settings.postgres_dsn)
            with self._conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS tech_debt_snapshots (
                        id TEXT PRIMARY KEY,
                        repository_id TEXT NOT NULL,
                        snapshot_ts TIMESTAMPTZ NOT NULL,
                        avg_score REAL NOT NULL DEFAULT 0,
                        total_files INT NOT NULL DEFAULT 0,
                        critical_count INT NOT NULL DEFAULT 0,
                        high_count INT NOT NULL DEFAULT 0,
                        top_files JSONB NOT NULL DEFAULT '[]'
                    )
                    """
                )
                cur.execute(
                    "CREATE INDEX IF NOT EXISTS idx_tech_debt_repo_ts "
                    "ON tech_debt_snapshots(repository_id, snapshot_ts DESC)"
                )
            self._conn.commit()
        except Exception as exc:
            logger.warning("TechDebtRepository DB init failed, using in-memory: %s", exc)
            self._conn = None

    def save(self, snapshot: TechDebtSnapshot) -> None:
        if self._conn is None:
            with self._lock:
                self._memory.append(snapshot)
            return
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO tech_debt_snapshots
                        (id, repository_id, snapshot_ts, avg_score, total_files,
                         critical_count, high_count, top_files)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    (
                        snapshot.id, snapshot.repository_id, snapshot.snapshot_ts,
                        snapshot.avg_score, snapshot.total_files,
                        snapshot.critical_count, snapshot.high_count,
                        json.dumps(snapshot.top_files),
                    ),
                )
            self._conn.commit()
        except Exception as exc:
            logger.error("Failed to save tech debt snapshot: %s", exc)

    def list_history(
        self,
        repository_id: str,
        limit: int = 30,
    ) -> list[TechDebtSnapshot]:
        """Return the last *limit* snapshots for a repository, oldest first."""
        if self._conn is None:
            with self._lock:
                rows = [s for s in self._memory if s.repository_id == repository_id]
            rows.sort(key=lambda s: s.snapshot_ts)
            return rows[-limit:]
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, repository_id, snapshot_ts::text, avg_score,
                           total_files, critical_count, high_count, top_files
                      FROM tech_debt_snapshots
                     WHERE repository_id = %s
                     ORDER BY snapshot_ts ASC
                     LIMIT %s
                    """,
                    (repository_id, limit),
                )
                return [
                    TechDebtSnapshot(
                        id=r[0], repository_id=r[1], snapshot_ts=r[2],
                        avg_score=r[3], total_files=r[4],
                        critical_count=r[5], high_count=r[6],
                        top_files=r[7] if isinstance(r[7], list) else json.loads(r[7] or "[]"),
                    )
                    for r in cur.fetchall()
                ]
        except Exception as exc:
            logger.error("Failed to get tech debt history: %s", exc)
            return []

    def latest(self, repository_id: str) -> TechDebtSnapshot | None:
        history = self.list_history(repository_id, limit=1)
        return history[-1] if history else None

    @staticmethod
    def create(
        repository_id: str,
        avg_score: float,
        total_files: int,
        critical_count: int,
        high_count: int,
        top_files: list[dict[str, Any]],
    ) -> TechDebtSnapshot:
        return TechDebtSnapshot(
            id=str(uuid4()),
            repository_id=repository_id,
            snapshot_ts=datetime.now(timezone.utc).isoformat(),
            avg_score=avg_score,
            total_files=total_files,
            critical_count=critical_count,
            high_count=high_count,
            top_files=top_files,
        )
