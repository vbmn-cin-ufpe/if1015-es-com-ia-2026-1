"""Watchlist repository — stores per-user module watch subscriptions."""

import logging
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

from app.infrastructure.settings import Settings

logger = logging.getLogger(__name__)


@dataclass
class WatchEntry:
    id: str
    user_id: str
    user_email: str
    repository_id: str
    module_path: str      # e.g. "app/services/chat_service.py" or "" for whole repo
    created_at: str


class WatchlistRepository:
    """Stores user watch subscriptions with PostgreSQL + in-memory fallback."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._lock = threading.Lock()
        self._memory: list[WatchEntry] = []
        self._conn = None
        self._init_db()

    def _init_db(self) -> None:
        if not self._settings.postgres_dsn:
            return
        try:
            import psycopg
            self._conn = psycopg.connect(self._settings.postgres_dsn)
            with self._conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS watchlist (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        user_email TEXT NOT NULL DEFAULT '',
                        repository_id TEXT NOT NULL,
                        module_path TEXT NOT NULL DEFAULT '',
                        created_at TIMESTAMPTZ NOT NULL,
                        UNIQUE(user_id, repository_id, module_path)
                    )
                    """
                )
                cur.execute(
                    "CREATE INDEX IF NOT EXISTS idx_watchlist_user "
                    "ON watchlist(user_id)"
                )
                cur.execute(
                    "CREATE INDEX IF NOT EXISTS idx_watchlist_repo "
                    "ON watchlist(repository_id)"
                )
            self._conn.commit()
        except Exception as exc:
            logger.warning("WatchlistRepository DB init failed, using in-memory: %s", exc)
            self._conn = None

    def watch(self, user_id: str, user_email: str, repository_id: str, module_path: str = "") -> WatchEntry:
        """Add a watch entry. Idempotent — returns existing if already watched."""
        existing = self.get(user_id, repository_id, module_path)
        if existing:
            return existing

        entry = WatchEntry(
            id=str(uuid4()),
            user_id=user_id,
            user_email=user_email,
            repository_id=repository_id,
            module_path=module_path,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        if self._conn is None:
            with self._lock:
                self._memory.append(entry)
            return entry
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO watchlist (id, user_id, user_email, repository_id, module_path, created_at) "
                    "VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT DO NOTHING",
                    (entry.id, entry.user_id, entry.user_email, entry.repository_id,
                     entry.module_path, entry.created_at),
                )
            self._conn.commit()
        except Exception as exc:
            logger.error("Failed to add watch entry: %s", exc)
        return entry

    def unwatch(self, user_id: str, repository_id: str, module_path: str = "") -> bool:
        if self._conn is None:
            with self._lock:
                before = len(self._memory)
                self._memory = [
                    e for e in self._memory
                    if not (e.user_id == user_id and e.repository_id == repository_id
                            and e.module_path == module_path)
                ]
                return len(self._memory) < before
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM watchlist WHERE user_id=%s AND repository_id=%s AND module_path=%s",
                    (user_id, repository_id, module_path),
                )
                deleted = cur.rowcount > 0
            self._conn.commit()
            return deleted
        except Exception as exc:
            logger.error("Failed to remove watch entry: %s", exc)
            return False

    def get(self, user_id: str, repository_id: str, module_path: str = "") -> WatchEntry | None:
        if self._conn is None:
            with self._lock:
                return next(
                    (e for e in self._memory
                     if e.user_id == user_id and e.repository_id == repository_id
                     and e.module_path == module_path),
                    None,
                )
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    "SELECT id, user_id, user_email, repository_id, module_path, created_at::text "
                    "FROM watchlist WHERE user_id=%s AND repository_id=%s AND module_path=%s",
                    (user_id, repository_id, module_path),
                )
                row = cur.fetchone()
                if not row:
                    return None
                return WatchEntry(
                    id=row[0], user_id=row[1], user_email=row[2],
                    repository_id=row[3], module_path=row[4], created_at=row[5],
                )
        except Exception as exc:
            logger.error("Failed to get watch entry: %s", exc)
            return None

    def list_for_user(self, user_id: str) -> list[WatchEntry]:
        if self._conn is None:
            with self._lock:
                return [e for e in self._memory if e.user_id == user_id]
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    "SELECT id, user_id, user_email, repository_id, module_path, created_at::text "
                    "FROM watchlist WHERE user_id=%s ORDER BY created_at DESC",
                    (user_id,),
                )
                return [
                    WatchEntry(id=r[0], user_id=r[1], user_email=r[2],
                               repository_id=r[3], module_path=r[4], created_at=r[5])
                    for r in cur.fetchall()
                ]
        except Exception as exc:
            logger.error("Failed to list watchlist for user %s: %s", user_id, exc)
            return []

    def list_for_repo(self, repository_id: str, module_path: str | None = None) -> list[WatchEntry]:
        """Find all watchers for a given repo (optionally filtered by module)."""
        if self._conn is None:
            with self._lock:
                result = [e for e in self._memory if e.repository_id == repository_id]
            if module_path is not None:
                result = [e for e in result if e.module_path == module_path or e.module_path == ""]
            return result
        try:
            with self._conn.cursor() as cur:
                if module_path is not None:
                    cur.execute(
                        "SELECT id, user_id, user_email, repository_id, module_path, created_at::text "
                        "FROM watchlist WHERE repository_id=%s AND (module_path=%s OR module_path='')",
                        (repository_id, module_path),
                    )
                else:
                    cur.execute(
                        "SELECT id, user_id, user_email, repository_id, module_path, created_at::text "
                        "FROM watchlist WHERE repository_id=%s",
                        (repository_id,),
                    )
                return [
                    WatchEntry(id=r[0], user_id=r[1], user_email=r[2],
                               repository_id=r[3], module_path=r[4], created_at=r[5])
                    for r in cur.fetchall()
                ]
        except Exception as exc:
            logger.error("Failed to list watchers for repo %s: %s", repository_id, exc)
            return []
