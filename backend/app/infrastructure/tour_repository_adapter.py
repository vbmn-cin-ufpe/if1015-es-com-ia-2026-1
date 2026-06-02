"""Tour repository adapter — persists tours to PostgreSQL with in-memory fallback."""

import json
import logging
from datetime import datetime, timezone

from app.infrastructure.settings import Settings
from app.ports import TourRecord, TourStepRecord

logger = logging.getLogger(__name__)


class TourRepositoryAdapter:
    """Implements TourRepositoryPort using PostgreSQL with in-memory fallback."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._tours: dict[str, TourRecord] = {}  # in-memory fallback
        self._conn = None
        self._init_db()

    def _init_db(self) -> None:
        """Initialize DB connection and create tables if needed."""
        if not self._settings.postgres_dsn:
            logger.info("POSTGRES_DSN not set — using in-memory tour storage")
            return
        try:
            import psycopg  # type: ignore[import]

            self._conn = psycopg.connect(self._settings.postgres_dsn)
            with self._conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS tours (
                        tour_id TEXT PRIMARY KEY,
                        repository_id TEXT NOT NULL,
                        title TEXT NOT NULL,
                        description TEXT NOT NULL,
                        step_count INTEGER NOT NULL,
                        config TEXT NOT NULL DEFAULT '{}',
                        created_at TEXT NOT NULL
                    )
                    """
                )
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS tour_steps (
                        step_id TEXT PRIMARY KEY,
                        tour_id TEXT NOT NULL,
                        position INTEGER NOT NULL,
                        module_path TEXT NOT NULL,
                        title TEXT NOT NULL,
                        score DOUBLE PRECISION NOT NULL,
                        rationale TEXT NOT NULL,
                        recommendations TEXT NOT NULL DEFAULT '[]',
                        metrics TEXT NOT NULL DEFAULT '{}'
                    )
                    """
                )
                cur.execute(
                    "CREATE INDEX IF NOT EXISTS idx_tours_repo ON tours(repository_id)"
                )
                cur.execute(
                    "CREATE INDEX IF NOT EXISTS idx_tour_steps_tour ON tour_steps(tour_id)"
                )
            self._conn.commit()
            logger.info("Tour DB tables initialized")
        except Exception as exc:
            logger.warning("Tour DB init failed, using in-memory storage: %s", exc)
            self._conn = None

    # ------------------------------------------------------------------ #
    # TourRepositoryPort implementation                                    #
    # ------------------------------------------------------------------ #

    def save_tour(self, tour: TourRecord) -> None:
        """Persist a tour and its steps."""
        if self._conn is None:
            self._tours[tour.tour_id] = tour
            return
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO tours (tour_id, repository_id, title, description,
                                       step_count, config, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (tour_id) DO UPDATE SET
                        title = EXCLUDED.title,
                        description = EXCLUDED.description,
                        step_count = EXCLUDED.step_count,
                        config = EXCLUDED.config
                    """,
                    (
                        tour.tour_id,
                        tour.repository_id,
                        tour.title,
                        tour.description,
                        tour.step_count,
                        json.dumps(tour.config),
                        tour.created_at,
                    ),
                )
                for step in tour.steps:
                    cur.execute(
                        """
                        INSERT INTO tour_steps (step_id, tour_id, position, module_path,
                                                title, score, rationale, recommendations, metrics)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (step_id) DO NOTHING
                        """,
                        (
                            step.step_id,
                            step.tour_id,
                            step.position,
                            step.module_path,
                            step.title,
                            step.score,
                            step.rationale,
                            json.dumps(step.recommendations),
                            json.dumps(step.metrics),
                        ),
                    )
            self._conn.commit()
        except Exception as exc:
            logger.error("Failed to persist tour %s: %s", tour.tour_id, exc)
            self._tours[tour.tour_id] = tour  # fallback

    def get_tour(self, tour_id: str) -> TourRecord | None:
        """Retrieve a tour by ID including its steps."""
        if self._conn is None:
            return self._tours.get(tour_id)
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    "SELECT tour_id, repository_id, title, description, step_count, config, created_at "
                    "FROM tours WHERE tour_id = %s",
                    (tour_id,),
                )
                row = cur.fetchone()
                if not row:
                    return None
                t_id, repo_id, title, description, step_count, config_str, created_at = row
                cur.execute(
                    "SELECT step_id, tour_id, position, module_path, title, score, "
                    "rationale, recommendations, metrics "
                    "FROM tour_steps WHERE tour_id = %s ORDER BY position",
                    (t_id,),
                )
                steps = [
                    TourStepRecord(
                        step_id=s[0],
                        tour_id=s[1],
                        position=s[2],
                        module_path=s[3],
                        title=s[4],
                        score=s[5],
                        rationale=s[6],
                        recommendations=json.loads(s[7]),
                        metrics=json.loads(s[8]),
                    )
                    for s in cur.fetchall()
                ]
                return TourRecord(
                    tour_id=t_id,
                    repository_id=repo_id,
                    title=title,
                    description=description,
                    step_count=step_count,
                    config=json.loads(config_str),
                    created_at=created_at,
                    steps=steps,
                )
        except Exception as exc:
            logger.error("Failed to retrieve tour %s: %s", tour_id, exc)
            return self._tours.get(tour_id)

    def list_tours(self, repository_id: str) -> list[TourRecord]:
        """List all tours for a repository (without steps for efficiency)."""
        if self._conn is None:
            return [t for t in self._tours.values() if t.repository_id == repository_id]
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    "SELECT tour_id, repository_id, title, description, step_count, config, created_at "
                    "FROM tours WHERE repository_id = %s ORDER BY created_at DESC",
                    (repository_id,),
                )
                return [
                    TourRecord(
                        tour_id=r[0],
                        repository_id=r[1],
                        title=r[2],
                        description=r[3],
                        step_count=r[4],
                        config=json.loads(r[5]),
                        created_at=r[6],
                        steps=[],  # not loaded in list view
                    )
                    for r in cur.fetchall()
                ]
        except Exception as exc:
            logger.error("Failed to list tours for %s: %s", repository_id, exc)
            return [t for t in self._tours.values() if t.repository_id == repository_id]
