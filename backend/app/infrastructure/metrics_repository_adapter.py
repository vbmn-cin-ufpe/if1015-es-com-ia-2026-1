"""Storage adapters for metrics events and feedback."""

import json
import logging
from typing import Any

from app.infrastructure.settings import Settings
from app.services.metrics_ingestion_service import OnboardingEvent, ResponseFeedback

logger = logging.getLogger(__name__)


class MetricsRepositoryAdapter:
    """Persists onboarding events with in-memory fallback."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._events: list[OnboardingEvent] = []
        self._conn = None
        self._init_db()

    def _init_db(self) -> None:
        if not self._settings.postgres_dsn:
            logger.info("POSTGRES_DSN not set — using in-memory metrics storage")
            return
        try:
            import psycopg

            self._conn = psycopg.connect(self._settings.postgres_dsn)
            with self._conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS onboarding_events (
                        id TEXT PRIMARY KEY,
                        repository_id TEXT NOT NULL,
                        session_id TEXT NOT NULL DEFAULT '',
                        event_type TEXT NOT NULL,
                        timestamp TEXT NOT NULL,
                        metadata TEXT NOT NULL DEFAULT '{}'
                    )
                    """
                )
                cur.execute(
                    "CREATE INDEX IF NOT EXISTS idx_events_repo_ts "
                    "ON onboarding_events(repository_id, timestamp DESC)"
                )
            self._conn.commit()
        except Exception as exc:
            logger.warning("Metrics DB init failed, using in-memory: %s", exc)
            self._conn = None

    def save_event(self, event: OnboardingEvent) -> None:
        if self._conn is None:
            self._events.append(event)
            return
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO onboarding_events (id, repository_id, session_id, event_type, timestamp, metadata) "
                    "VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                    (event.id, event.repository_id, event.session_id,
                     event.event_type, event.timestamp, json.dumps(event.metadata)),
                )
            self._conn.commit()
        except Exception as exc:
            logger.error("Failed to persist event: %s", exc)
            self._events.append(event)

    def get_events(
        self,
        repository_id: str,
        from_ts: str | None = None,
        to_ts: str | None = None,
        event_type: str | None = None,
    ) -> list[OnboardingEvent]:
        if self._conn is None:
            return self._filter_memory(repository_id, from_ts, to_ts, event_type)
        try:
            with self._conn.cursor() as cur:
                query = "SELECT id, repository_id, session_id, event_type, timestamp, metadata FROM onboarding_events WHERE repository_id = %s"
                params: list[Any] = [repository_id]
                if from_ts:
                    query += " AND timestamp >= %s"
                    params.append(from_ts)
                if to_ts:
                    query += " AND timestamp <= %s"
                    params.append(to_ts)
                if event_type:
                    query += " AND event_type = %s"
                    params.append(event_type)
                query += " ORDER BY timestamp DESC"
                cur.execute(query, params)
                return [
                    OnboardingEvent(
                        id=r[0], repository_id=r[1], session_id=r[2],
                        event_type=r[3], timestamp=r[4], metadata=json.loads(r[5]),
                    )
                    for r in cur.fetchall()
                ]
        except Exception as exc:
            logger.error("Failed to get events: %s", exc)
            return self._filter_memory(repository_id, from_ts, to_ts, event_type)

    def _filter_memory(
        self, repository_id: str, from_ts: str | None, to_ts: str | None, event_type: str | None
    ) -> list[OnboardingEvent]:
        result = [e for e in self._events if e.repository_id == repository_id]
        if from_ts:
            result = [e for e in result if e.timestamp >= from_ts]
        if to_ts:
            result = [e for e in result if e.timestamp <= to_ts]
        if event_type:
            result = [e for e in result if e.event_type == event_type]
        return sorted(result, key=lambda e: e.timestamp, reverse=True)


class FeedbackRepositoryAdapter:
    """Persists response feedback with in-memory fallback."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._feedback: list[ResponseFeedback] = []
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
                    CREATE TABLE IF NOT EXISTS response_feedback (
                        id TEXT PRIMARY KEY,
                        repository_id TEXT NOT NULL,
                        response_id TEXT NOT NULL,
                        usefulness_score INTEGER NOT NULL,
                        correctness_score INTEGER NOT NULL,
                        comment TEXT NOT NULL DEFAULT '',
                        timestamp TEXT NOT NULL
                    )
                    """
                )
                cur.execute(
                    "CREATE INDEX IF NOT EXISTS idx_feedback_repo "
                    "ON response_feedback(repository_id, timestamp DESC)"
                )
            self._conn.commit()
        except Exception as exc:
            logger.warning("Feedback DB init failed, using in-memory: %s", exc)
            self._conn = None

    def save_feedback(self, feedback: ResponseFeedback) -> None:
        if self._conn is None:
            self._feedback.append(feedback)
            return
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO response_feedback (id, repository_id, response_id, usefulness_score, correctness_score, comment, timestamp) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                    (feedback.id, feedback.repository_id, feedback.response_id,
                     feedback.usefulness_score, feedback.correctness_score,
                     feedback.comment, feedback.timestamp),
                )
            self._conn.commit()
        except Exception as exc:
            logger.error("Failed to persist feedback: %s", exc)
            self._feedback.append(feedback)

    def get_feedback(
        self, repository_id: str, from_ts: str | None = None, to_ts: str | None = None
    ) -> list[ResponseFeedback]:
        if self._conn is None:
            result = [f for f in self._feedback if f.repository_id == repository_id]
            if from_ts:
                result = [f for f in result if f.timestamp >= from_ts]
            if to_ts:
                result = [f for f in result if f.timestamp <= to_ts]
            return sorted(result, key=lambda f: f.timestamp, reverse=True)
        try:
            with self._conn.cursor() as cur:
                query = "SELECT id, repository_id, response_id, usefulness_score, correctness_score, comment, timestamp FROM response_feedback WHERE repository_id = %s"
                params: list[Any] = [repository_id]
                if from_ts:
                    query += " AND timestamp >= %s"
                    params.append(from_ts)
                if to_ts:
                    query += " AND timestamp <= %s"
                    params.append(to_ts)
                query += " ORDER BY timestamp DESC"
                cur.execute(query, params)
                return [
                    ResponseFeedback(
                        id=r[0], repository_id=r[1], response_id=r[2],
                        usefulness_score=r[3], correctness_score=r[4],
                        comment=r[5], timestamp=r[6],
                    )
                    for r in cur.fetchall()
                ]
        except Exception as exc:
            logger.error("Failed to get feedback: %s", exc)
            return [f for f in self._feedback if f.repository_id == repository_id]
