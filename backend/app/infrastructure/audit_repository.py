"""Audit log repository — immutable record of every write action in the system."""

import logging
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

from app.infrastructure.settings import Settings

logger = logging.getLogger(__name__)


@dataclass
class AuditEntry:
    id: str
    user_id: str
    user_email: str
    action: str           # e.g. "user.update", "repo.index", "webhook.create"
    resource_type: str    # e.g. "user", "repository", "webhook"
    resource_id: str
    ip: str
    extra: str            # JSON string of extra context
    timestamp: str        # ISO 8601


class AuditRepository:
    """Persists audit log entries with PostgreSQL + in-memory fallback."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._lock = threading.Lock()
        self._memory: list[AuditEntry] = []
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
                    CREATE TABLE IF NOT EXISTS audit_log (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL DEFAULT '',
                        user_email TEXT NOT NULL DEFAULT '',
                        action TEXT NOT NULL DEFAULT '',
                        resource_type TEXT NOT NULL DEFAULT '',
                        resource_id TEXT NOT NULL DEFAULT '',
                        ip TEXT NOT NULL DEFAULT '',
                        extra TEXT NOT NULL DEFAULT '{}',
                        timestamp TIMESTAMPTZ NOT NULL
                    )
                    """
                )
                cur.execute(
                    "CREATE INDEX IF NOT EXISTS idx_audit_ts "
                    "ON audit_log(timestamp DESC)"
                )
                cur.execute(
                    "CREATE INDEX IF NOT EXISTS idx_audit_user "
                    "ON audit_log(user_id, timestamp DESC)"
                )
            self._conn.commit()
        except Exception as exc:
            logger.warning("AuditRepository DB init failed, using in-memory: %s", exc)
            self._conn = None

    def record(
        self,
        user_id: str,
        user_email: str,
        action: str,
        resource_type: str,
        resource_id: str,
        ip: str = "",
        extra: str = "{}",
    ) -> None:
        entry = AuditEntry(
            id=str(uuid4()),
            user_id=user_id,
            user_email=user_email,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip=ip,
            extra=extra,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        if self._conn is None:
            with self._lock:
                self._memory.append(entry)
            return
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO audit_log "
                    "(id, user_id, user_email, action, resource_type, resource_id, ip, extra, timestamp) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (
                        entry.id, entry.user_id, entry.user_email,
                        entry.action, entry.resource_type, entry.resource_id,
                        entry.ip, entry.extra, entry.timestamp,
                    ),
                )
            self._conn.commit()
        except Exception as exc:
            logger.error("Failed to record audit entry: %s", exc)

    def query(
        self,
        user_id: str | None = None,
        action: str | None = None,
        resource_type: str | None = None,
        from_ts: str | None = None,
        limit: int = 200,
    ) -> list[AuditEntry]:
        if self._conn is None:
            with self._lock:
                rows = list(self._memory)
            if user_id:
                rows = [r for r in rows if r.user_id == user_id]
            if action:
                rows = [r for r in rows if r.action.startswith(action)]
            if resource_type:
                rows = [r for r in rows if r.resource_type == resource_type]
            if from_ts:
                rows = [r for r in rows if r.timestamp >= from_ts]
            return sorted(rows, key=lambda e: e.timestamp, reverse=True)[:limit]
        try:
            sql = (
                "SELECT id, user_id, user_email, action, resource_type, resource_id, "
                "ip, extra, timestamp::text FROM audit_log WHERE 1=1"
            )
            params: list = []
            if user_id:
                sql += " AND user_id = %s"
                params.append(user_id)
            if action:
                sql += " AND action LIKE %s"
                params.append(f"{action}%")
            if resource_type:
                sql += " AND resource_type = %s"
                params.append(resource_type)
            if from_ts:
                sql += " AND timestamp >= %s"
                params.append(from_ts)
            sql += " ORDER BY timestamp DESC LIMIT %s"
            params.append(limit)
            with self._conn.cursor() as cur:
                cur.execute(sql, params)
                return [
                    AuditEntry(
                        id=r[0], user_id=r[1], user_email=r[2], action=r[3],
                        resource_type=r[4], resource_id=r[5], ip=r[6],
                        extra=r[7], timestamp=r[8],
                    )
                    for r in cur.fetchall()
                ]
        except Exception as exc:
            logger.error("Failed to query audit log: %s", exc)
            return []
