import json
import threading
from datetime import datetime, timezone
from typing import Any

from app.infrastructure.settings import Settings
from app.ports import RepositoryRecord

try:
    import psycopg
except Exception:
    psycopg = None


class PostgresAdapter:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._lock = threading.Lock()
        self._memory: dict[str, RepositoryRecord] = {}
        self._dsn = self._settings.postgres_dsn
        self._db_enabled = bool(self._dsn and psycopg is not None)
        if self._db_enabled:
            self._init_db()

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _init_db(self) -> None:
        with psycopg.connect(self._dsn) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    create table if not exists repositories (
                        repository_id text primary key,
                        repository_url text not null,
                        status text not null,
                        stats jsonb not null default '{}'::jsonb,
                        error_message text,
                        created_at timestamptz not null,
                        updated_at timestamptz not null
                    )
                    """
                )
            conn.commit()

    def create_repository(self, repository_id: str, repository_url: str, status: str) -> RepositoryRecord:
        now = self._now()
        record = RepositoryRecord(
            repository_id=repository_id,
            repository_url=repository_url,
            status=status,
            stats={},
            error_message=None,
            created_at=now,
            updated_at=now,
        )
        if self._db_enabled:
            with psycopg.connect(self._dsn) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        insert into repositories (repository_id, repository_url, status, stats, error_message, created_at, updated_at)
                        values (%s, %s, %s, %s::jsonb, %s, %s, %s)
                        """,
                        (repository_id, repository_url, status, json.dumps({}), None, now, now),
                    )
                conn.commit()
        else:
            with self._lock:
                self._memory[repository_id] = record
        return record

    def update_repository_status(
        self,
        repository_id: str,
        status: str,
        stats: dict[str, Any] | None = None,
        error_message: str | None = None,
    ) -> None:
        now = self._now()
        if self._db_enabled:
            with psycopg.connect(self._dsn) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        update repositories
                           set status=%s, stats=%s::jsonb, error_message=%s, updated_at=%s
                         where repository_id=%s
                        """,
                        (status, json.dumps(stats or {}), error_message, now, repository_id),
                    )
                conn.commit()
            return
        with self._lock:
            current = self._memory[repository_id]
            self._memory[repository_id] = RepositoryRecord(
                repository_id=current.repository_id,
                repository_url=current.repository_url,
                status=status,
                stats=stats or {},
                error_message=error_message,
                created_at=current.created_at,
                updated_at=now,
            )

    def get_repository(self, repository_id: str) -> RepositoryRecord | None:
        if self._db_enabled:
            with psycopg.connect(self._dsn) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        select repository_id, repository_url, status, stats, error_message, created_at::text, updated_at::text
                          from repositories
                         where repository_id=%s
                        """,
                        (repository_id,),
                    )
                    row = cur.fetchone()
                    if not row:
                        return None
                    return RepositoryRecord(
                        repository_id=row[0],
                        repository_url=row[1],
                        status=row[2],
                        stats=row[3] or {},
                        error_message=row[4],
                        created_at=row[5],
                        updated_at=row[6],
                    )
        with self._lock:
            return self._memory.get(repository_id)