"""Webhook repository — stores GitHub webhook configurations."""

import logging
import secrets
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

from app.infrastructure.settings import Settings

logger = logging.getLogger(__name__)


@dataclass
class WebhookRecord:
    id: str
    repository_id: str
    repository_url: str   # the repo URL it is tracking
    provider: str         # "github" | "gitlab" | "bitbucket"
    callback_url: str     # URL to POST to (our endpoint)
    secret: str           # HMAC secret (stored, never returned to client after creation)
    active: bool
    created_at: str
    last_triggered_at: str | None


class WebhookRepository:
    """Persists webhook configurations with in-memory fallback."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._lock = threading.Lock()
        self._memory: dict[str, WebhookRecord] = {}
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
                    CREATE TABLE IF NOT EXISTS webhooks (
                        id TEXT PRIMARY KEY,
                        repository_id TEXT NOT NULL DEFAULT '',
                        repository_url TEXT NOT NULL DEFAULT '',
                        provider TEXT NOT NULL DEFAULT 'github',
                        callback_url TEXT NOT NULL DEFAULT '',
                        secret TEXT NOT NULL DEFAULT '',
                        active BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at TIMESTAMPTZ NOT NULL,
                        last_triggered_at TIMESTAMPTZ
                    )
                    """
                )
            self._conn.commit()
        except Exception as exc:
            logger.warning("WebhookRepository DB init failed, using in-memory: %s", exc)
            self._conn = None

    def create(
        self,
        repository_id: str,
        repository_url: str,
        provider: str = "github",
    ) -> WebhookRecord:
        """Create a new webhook with a fresh HMAC secret."""
        record = WebhookRecord(
            id=str(uuid4()),
            repository_id=repository_id,
            repository_url=repository_url,
            provider=provider,
            callback_url="",  # filled by caller if needed
            secret=secrets.token_hex(32),
            active=True,
            created_at=datetime.now(timezone.utc).isoformat(),
            last_triggered_at=None,
        )
        if self._conn is None:
            with self._lock:
                self._memory[record.id] = record
            return record
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO webhooks "
                    "(id, repository_id, repository_url, provider, callback_url, secret, active, created_at) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                    (
                        record.id, record.repository_id, record.repository_url,
                        record.provider, record.callback_url, record.secret,
                        record.active, record.created_at,
                    ),
                )
            self._conn.commit()
        except Exception as exc:
            logger.error("Failed to create webhook: %s", exc)
        return record

    def get(self, webhook_id: str) -> WebhookRecord | None:
        if self._conn is None:
            with self._lock:
                return self._memory.get(webhook_id)
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    "SELECT id, repository_id, repository_url, provider, callback_url, "
                    "secret, active, created_at::text, last_triggered_at::text "
                    "FROM webhooks WHERE id = %s",
                    (webhook_id,),
                )
                row = cur.fetchone()
                if not row:
                    return None
                return self._row_to_record(row)
        except Exception as exc:
            logger.error("Failed to get webhook %s: %s", webhook_id, exc)
            return None

    def get_by_repo(self, repository_id: str) -> list[WebhookRecord]:
        if self._conn is None:
            with self._lock:
                return [w for w in self._memory.values() if w.repository_id == repository_id]
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    "SELECT id, repository_id, repository_url, provider, callback_url, "
                    "secret, active, created_at::text, last_triggered_at::text "
                    "FROM webhooks WHERE repository_id = %s ORDER BY created_at DESC",
                    (repository_id,),
                )
                return [self._row_to_record(r) for r in cur.fetchall()]
        except Exception as exc:
            logger.error("Failed to list webhooks for repo %s: %s", repository_id, exc)
            return []

    def list_all(self) -> list[WebhookRecord]:
        if self._conn is None:
            with self._lock:
                return list(self._memory.values())
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    "SELECT id, repository_id, repository_url, provider, callback_url, "
                    "secret, active, created_at::text, last_triggered_at::text "
                    "FROM webhooks ORDER BY created_at DESC"
                )
                return [self._row_to_record(r) for r in cur.fetchall()]
        except Exception as exc:
            logger.error("Failed to list webhooks: %s", exc)
            return []

    def delete(self, webhook_id: str) -> bool:
        if self._conn is None:
            with self._lock:
                existed = webhook_id in self._memory
                self._memory.pop(webhook_id, None)
                return existed
        try:
            with self._conn.cursor() as cur:
                cur.execute("DELETE FROM webhooks WHERE id = %s", (webhook_id,))
                deleted = cur.rowcount > 0
            self._conn.commit()
            return deleted
        except Exception as exc:
            logger.error("Failed to delete webhook %s: %s", webhook_id, exc)
            return False

    def touch(self, webhook_id: str) -> None:
        """Update last_triggered_at to now."""
        now = datetime.now(timezone.utc).isoformat()
        if self._conn is None:
            with self._lock:
                rec = self._memory.get(webhook_id)
                if rec:
                    rec.last_triggered_at = now
            return
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    "UPDATE webhooks SET last_triggered_at = %s WHERE id = %s",
                    (now, webhook_id),
                )
            self._conn.commit()
        except Exception as exc:
            logger.error("Failed to touch webhook %s: %s", webhook_id, exc)

    @staticmethod
    def _row_to_record(row) -> WebhookRecord:
        return WebhookRecord(
            id=row[0], repository_id=row[1], repository_url=row[2],
            provider=row[3], callback_url=row[4], secret=row[5],
            active=bool(row[6]), created_at=row[7], last_triggered_at=row[8],
        )
