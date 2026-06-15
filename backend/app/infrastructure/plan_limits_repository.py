"""Persistence adapter for plan limit configuration — editable without redeploy."""

import logging
import threading
from dataclasses import dataclass

from app.domain.enums import PLAN_LIMITS, Plan
from app.infrastructure.settings import Settings

logger = logging.getLogger(__name__)


@dataclass
class PlanLimit:
    plan: str
    max_repos: int
    max_questions: int
    can_delete_repo: bool


class PlanLimitsRepository:
    """Stores per-plan limits in Postgres with in-memory fallback from PLAN_LIMITS."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._lock = threading.Lock()
        self._memory: dict[str, PlanLimit] = {}
        self._conn = None
        self._init_db()

    def _init_db(self) -> None:
        if not self._settings.postgres_dsn:
            self._seed_memory()
            return
        try:
            import psycopg
            self._conn = psycopg.connect(self._settings.postgres_dsn)
            with self._conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS plan_limits (
                        plan TEXT PRIMARY KEY,
                        max_repos INT NOT NULL DEFAULT 2,
                        max_questions INT NOT NULL DEFAULT 5,
                        can_delete_repo BOOLEAN NOT NULL DEFAULT FALSE
                    )
                    """
                )
                # Seed defaults if table is empty
                cur.execute("SELECT COUNT(*) FROM plan_limits")
                count = cur.fetchone()[0]
                if count == 0:
                    for plan, limits in PLAN_LIMITS.items():
                        cur.execute(
                            "INSERT INTO plan_limits (plan, max_repos, max_questions, can_delete_repo) "
                            "VALUES (%s, %s, %s, %s) ON CONFLICT (plan) DO NOTHING",
                            (
                                plan.value,
                                limits["max_repos"],
                                limits["max_questions"],
                                limits.get("can_delete_repo", False),
                            ),
                        )
            self._conn.commit()
        except Exception as exc:
            logger.warning("PlanLimitsRepository DB init failed, using in-memory: %s", exc)
            self._conn = None
            self._seed_memory()

    def _seed_memory(self) -> None:
        for plan, limits in PLAN_LIMITS.items():
            self._memory[plan.value] = PlanLimit(
                plan=plan.value,
                max_repos=limits["max_repos"],
                max_questions=limits["max_questions"],
                can_delete_repo=limits.get("can_delete_repo", False),
            )

    def get_all(self) -> list[PlanLimit]:
        if self._conn is None:
            with self._lock:
                return list(self._memory.values())
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    "SELECT plan, max_repos, max_questions, can_delete_repo "
                    "FROM plan_limits ORDER BY plan"
                )
                return [
                    PlanLimit(plan=r[0], max_repos=r[1], max_questions=r[2], can_delete_repo=r[3])
                    for r in cur.fetchall()
                ]
        except Exception as exc:
            logger.error("Failed to get plan limits: %s", exc)
            return []

    def get(self, plan: str) -> PlanLimit | None:
        if self._conn is None:
            with self._lock:
                return self._memory.get(plan)
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    "SELECT plan, max_repos, max_questions, can_delete_repo "
                    "FROM plan_limits WHERE plan=%s",
                    (plan,),
                )
                row = cur.fetchone()
                if not row:
                    return None
                return PlanLimit(plan=row[0], max_repos=row[1], max_questions=row[2], can_delete_repo=row[3])
        except Exception as exc:
            logger.error("Failed to get plan limit for %s: %s", plan, exc)
            return None

    def update(self, plan: str, max_repos: int, max_questions: int, can_delete_repo: bool) -> PlanLimit:
        updated = PlanLimit(
            plan=plan,
            max_repos=max_repos,
            max_questions=max_questions,
            can_delete_repo=can_delete_repo,
        )
        if self._conn is None:
            with self._lock:
                self._memory[plan] = updated
            return updated
        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO plan_limits (plan, max_repos, max_questions, can_delete_repo)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (plan) DO UPDATE SET
                        max_repos=EXCLUDED.max_repos,
                        max_questions=EXCLUDED.max_questions,
                        can_delete_repo=EXCLUDED.can_delete_repo
                    """,
                    (plan, max_repos, max_questions, can_delete_repo),
                )
            self._conn.commit()
        except Exception as exc:
            logger.error("Failed to update plan limit for %s: %s", plan, exc)
        return updated
