"""Plan enforcement — quota checks and counter increments."""

import logging
from dataclasses import dataclass

from fastapi import HTTPException

from app.domain.enums import Plan, PlanAction, Role, PLAN_LIMITS

logger = logging.getLogger(__name__)


@dataclass
class PlanContext:
    """Minimal context needed for plan checks (extracted from AuthenticatedUser)."""
    user_id: str
    role: Role
    plan: Plan
    repos_indexed_count: int
    questions_asked_count: int


class PlanEnforcer:
    """
    Checks whether a user may perform a plan-gated action.
    Raises HTTP 403 with a descriptive message if the quota is exceeded.
    Admin role bypasses all limits.
    """

    def check(self, ctx: PlanContext, action: PlanAction) -> None:
        """
        Raise HTTP 403 if the user cannot perform `action`.
        Returns normally if allowed.
        """
        # Admins bypass everything
        if ctx.role == Role.ADMIN:
            return

        limits = PLAN_LIMITS.get(ctx.plan, PLAN_LIMITS[Plan.FREE])

        if action == PlanAction.INDEX_REPO:
            max_repos = limits["max_repos"]
            if ctx.repos_indexed_count >= max_repos:
                raise HTTPException(
                    status_code=403,
                    detail={
                        "code": "QUOTA_EXCEEDED",
                        "message": f"Seu plano {ctx.plan.value} permite no máximo {max_repos} repositório(s). "
                                   f"Faça upgrade para indexar mais.",
                        "action": action.value,
                        "limit": max_repos,
                        "current": ctx.repos_indexed_count,
                    },
                )

        elif action == PlanAction.ASK_QUESTION:
            max_q = limits["max_questions"]
            if ctx.questions_asked_count >= max_q:
                raise HTTPException(
                    status_code=403,
                    detail={
                        "code": "QUOTA_EXCEEDED",
                        "message": f"Seu plano {ctx.plan.value} permite no máximo {max_q} pergunta(s). "
                                   f"Faça upgrade para continuar.",
                        "action": action.value,
                        "limit": max_q,
                        "current": ctx.questions_asked_count,
                    },
                )

        elif action == PlanAction.DELETE_REPO:
            if not limits.get("can_delete_repo", False):
                raise HTTPException(
                    status_code=403,
                    detail={
                        "code": "PLAN_NOT_ALLOWED",
                        "message": "Deletar repositórios requer plano Pago ou Enterprise.",
                        "action": action.value,
                    },
                )
