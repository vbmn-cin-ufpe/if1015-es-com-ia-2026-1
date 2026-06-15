"""Persistence adapter for LLM token usage and cost tracking."""

import logging
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import uuid4

from app.infrastructure.settings import Settings

logger = logging.getLogger(__name__)

# Cost per 1000 tokens (USD) — update as provider pricing changes
_COST_PER_1K: dict[str, dict[str, float]] = {
    "abacus":    {"input": 0.003, "output": 0.015},
    "anthropic": {"input": 0.003, "output": 0.015},
    "openai":    {"input": 0.005, "output": 0.015},
}
_DEFAULT_COST = {"input": 0.003, "output": 0.015}


def estimate_cost_usd(provider: str, tokens_in: int, tokens_out: int) -> float:
    rates = _COST_PER_1K.get(provider.lower(), _DEFAULT_COST)
    return (tokens_in / 1000) * rates["input"] + (tokens_out / 1000) * rates["output"]


@dataclass
class LlmUsageRecord:
    id: str
    user_id: str
    endpoint: str           # e.g. "chat/ask", "generate-doc"
    repository_id: str
    provider: str
    model: str
    tokens_in: int
    tokens_out: int
    cost_usd: float
    timestamp: str          # ISO 8601


class LlmUsageRepository:
    """Records per-call LLM token usage with in-memory fallback."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._lock = threading.Lock()
        self._memory: list[LlmUsageRecord] = []
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
                    CREATE TABLE IF NOT EXISTS llm_usage_log (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL DEFAULT '',
                        endpoint TEXT NOT NULL DEFAULT '',
                        repository_id TEXT NOT NULL DEFAULT '',
                        provider TEXT NOT NULL DEFAULT '',
                        model TEXT NOT NULL DEFAULT '',
                        tokens_in INT NOT NULL DEFAULT 0,
                        tokens_out INT NOT NULL DEFAULT 0,
                        cost_usd REAL NOT NULL DEFAULT 0,
                        timestamp TIMESTAMPTZ NOT NULL
                    )
                    """
                )
                cur.execute(
                    "CREATE INDEX IF NOT EXISTS idx_llm_usage_ts "
                    "ON llm_usage_log(timestamp DESC)"
                )
                cur.execute(
                    "CREATE INDEX IF NOT EXISTS idx_llm_usage_user "
                    "ON llm_usage_log(user_id, timestamp DESC)"
                )
            self._conn.commit()
        except Exception as exc:
            logger.warning("LlmUsageRepository DB init failed, using in-memory: %s", exc)
            self._conn = None

    def record(
        self,
        user_id: str,
        endpoint: str,
        repository_id: str,
        provider: str,
        model: str,
        tokens_in: int,
        tokens_out: int,
    ) -> None:
        cost = estimate_cost_usd(provider, tokens_in, tokens_out)
        entry = LlmUsageRecord(
            id=str(uuid4()),
            user_id=user_id,
            endpoint=endpoint,
            repository_id=repository_id,
            provider=provider,
            model=model,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            cost_usd=cost,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        if self._conn is None:
            with self._lock:
                self._memory.append(entry)
            return
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO llm_usage_log
                        (id, user_id, endpoint, repository_id, provider, model,
                         tokens_in, tokens_out, cost_usd, timestamp)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        entry.id, entry.user_id, entry.endpoint, entry.repository_id,
                        entry.provider, entry.model,
                        entry.tokens_in, entry.tokens_out, entry.cost_usd, entry.timestamp,
                    ),
                )
            self._conn.commit()
        except Exception as exc:
            logger.error("Failed to record LLM usage: %s", exc)

    def aggregate(
        self,
        from_ts: str | None = None,
        to_ts: str | None = None,
        limit: int = 500,
    ) -> list[LlmUsageRecord]:
        if self._conn is None:
            with self._lock:
                rows = list(self._memory)
            if from_ts:
                rows = [r for r in rows if r.timestamp >= from_ts]
            if to_ts:
                rows = [r for r in rows if r.timestamp <= to_ts]
            return sorted(rows, key=lambda r: r.timestamp, reverse=True)[:limit]
        try:
            with self._conn.cursor() as cur:
                query = (
                    "SELECT id, user_id, endpoint, repository_id, provider, model, "
                    "tokens_in, tokens_out, cost_usd, timestamp::text "
                    "FROM llm_usage_log WHERE 1=1"
                )
                params: list = []
                if from_ts:
                    query += " AND timestamp >= %s"
                    params.append(from_ts)
                if to_ts:
                    query += " AND timestamp <= %s"
                    params.append(to_ts)
                query += " ORDER BY timestamp DESC LIMIT %s"
                params.append(limit)
                cur.execute(query, params)
                return [
                    LlmUsageRecord(
                        id=r[0], user_id=r[1], endpoint=r[2], repository_id=r[3],
                        provider=r[4], model=r[5],
                        tokens_in=r[6], tokens_out=r[7], cost_usd=r[8], timestamp=r[9],
                    )
                    for r in cur.fetchall()
                ]
        except Exception as exc:
            logger.error("Failed to aggregate LLM usage: %s", exc)
            return []
