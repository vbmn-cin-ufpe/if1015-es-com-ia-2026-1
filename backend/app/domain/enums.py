"""Domain enumerations for roles, plans, and actions."""

from enum import Enum


class Role(str, Enum):
    """User role — controls permission level."""
    ADMIN = "admin"
    FREE = "free"
    PAID = "paid"
    ENTERPRISE = "enterprise"


class Plan(str, Enum):
    """Subscription plan — controls quota limits."""
    FREE = "free"
    PAID = "paid"
    ENTERPRISE = "enterprise"


class PlanAction(str, Enum):
    """Actions that consume plan quotas."""
    INDEX_REPO = "index_repo"
    ASK_QUESTION = "ask_question"
    DELETE_REPO = "delete_repo"


# Limits per plan: (max_repos, max_questions, can_delete_repo)
PLAN_LIMITS: dict[Plan, dict] = {
    Plan.FREE: {
        "max_repos": 2,
        "max_questions": 5,
        "can_delete_repo": False,
    },
    Plan.PAID: {
        "max_repos": 10,
        "max_questions": 100,
        "can_delete_repo": True,
    },
    Plan.ENTERPRISE: {
        "max_repos": 50,
        "max_questions": 500,
        "can_delete_repo": True,
    },
}
