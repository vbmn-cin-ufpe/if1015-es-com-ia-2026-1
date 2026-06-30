"""Unit tests for PlanEnforcer.

PlanEnforcer is pure logic with no external dependencies — no mocking needed.
All quotas come from PLAN_LIMITS in app.domain.enums.
"""

import pytest
from fastapi import HTTPException

from app.domain.enums import Plan, PlanAction, Role, PLAN_LIMITS
from app.services.plan_enforcer import PlanContext, PlanEnforcer


# ── Helpers ───────────────────────────────────────────────────────────────────


def _ctx(
    role: Role = Role.FREE,
    plan: Plan = Plan.FREE,
    repos: int = 0,
    questions: int = 0,
) -> PlanContext:
    return PlanContext(
        user_id="user-test",
        role=role,
        plan=plan,
        repos_indexed_count=repos,
        questions_asked_count=questions,
    )


@pytest.fixture
def enforcer() -> PlanEnforcer:
    return PlanEnforcer()


# ── Admin bypass ──────────────────────────────────────────────────────────────


class TestAdminBypass:
    def test_admin_can_index_unlimited_repos(self, enforcer):
        ctx = _ctx(role=Role.ADMIN, plan=Plan.FREE, repos=9999)
        enforcer.check(ctx, PlanAction.INDEX_REPO)  # must not raise

    def test_admin_can_ask_unlimited_questions(self, enforcer):
        ctx = _ctx(role=Role.ADMIN, plan=Plan.FREE, questions=9999)
        enforcer.check(ctx, PlanAction.ASK_QUESTION)  # must not raise

    def test_admin_can_delete_repo_on_free_plan(self, enforcer):
        ctx = _ctx(role=Role.ADMIN, plan=Plan.FREE)
        enforcer.check(ctx, PlanAction.DELETE_REPO)  # must not raise


# ── FREE plan ─────────────────────────────────────────────────────────────────


class TestFreePlan:
    MAX_REPOS = PLAN_LIMITS[Plan.FREE]["max_repos"]          # 2
    MAX_Q     = PLAN_LIMITS[Plan.FREE]["max_questions"]      # 5

    def test_free_can_index_within_limit(self, enforcer):
        ctx = _ctx(repos=self.MAX_REPOS - 1)
        enforcer.check(ctx, PlanAction.INDEX_REPO)  # must not raise

    def test_free_exceeds_repo_limit_raises_403(self, enforcer):
        ctx = _ctx(repos=self.MAX_REPOS)
        with pytest.raises(HTTPException) as exc_info:
            enforcer.check(ctx, PlanAction.INDEX_REPO)
        assert exc_info.value.status_code == 403
        assert exc_info.value.detail["code"] == "QUOTA_EXCEEDED"

    def test_free_can_ask_within_limit(self, enforcer):
        ctx = _ctx(questions=self.MAX_Q - 1)
        enforcer.check(ctx, PlanAction.ASK_QUESTION)  # must not raise

    def test_free_exceeds_question_limit_raises_403(self, enforcer):
        ctx = _ctx(questions=self.MAX_Q)
        with pytest.raises(HTTPException) as exc_info:
            enforcer.check(ctx, PlanAction.ASK_QUESTION)
        assert exc_info.value.status_code == 403
        assert exc_info.value.detail["code"] == "QUOTA_EXCEEDED"

    def test_free_cannot_delete_repo(self, enforcer):
        ctx = _ctx()
        with pytest.raises(HTTPException) as exc_info:
            enforcer.check(ctx, PlanAction.DELETE_REPO)
        assert exc_info.value.status_code == 403
        assert exc_info.value.detail["code"] == "PLAN_NOT_ALLOWED"

    def test_error_detail_contains_limit_and_current(self, enforcer):
        ctx = _ctx(repos=self.MAX_REPOS)
        with pytest.raises(HTTPException) as exc_info:
            enforcer.check(ctx, PlanAction.INDEX_REPO)
        detail = exc_info.value.detail
        assert detail["limit"] == self.MAX_REPOS
        assert detail["current"] == self.MAX_REPOS
        assert detail["action"] == PlanAction.INDEX_REPO.value


# ── PAID plan ─────────────────────────────────────────────────────────────────


class TestPaidPlan:
    MAX_REPOS = PLAN_LIMITS[Plan.PAID]["max_repos"]      # 10
    MAX_Q     = PLAN_LIMITS[Plan.PAID]["max_questions"]  # 100

    def test_paid_has_higher_repo_limit_than_free(self):
        assert self.MAX_REPOS > PLAN_LIMITS[Plan.FREE]["max_repos"]

    def test_paid_can_delete_repo(self, enforcer):
        ctx = _ctx(role=Role.PAID, plan=Plan.PAID)
        enforcer.check(ctx, PlanAction.DELETE_REPO)  # must not raise

    def test_paid_exceeds_repo_limit_raises_403(self, enforcer):
        ctx = _ctx(role=Role.PAID, plan=Plan.PAID, repos=self.MAX_REPOS)
        with pytest.raises(HTTPException) as exc_info:
            enforcer.check(ctx, PlanAction.INDEX_REPO)
        assert exc_info.value.status_code == 403

    def test_paid_exceeds_question_limit_raises_403(self, enforcer):
        ctx = _ctx(role=Role.PAID, plan=Plan.PAID, questions=self.MAX_Q)
        with pytest.raises(HTTPException):
            enforcer.check(ctx, PlanAction.ASK_QUESTION)

    def test_paid_within_limits_does_not_raise(self, enforcer):
        ctx = _ctx(role=Role.PAID, plan=Plan.PAID, repos=5, questions=50)
        enforcer.check(ctx, PlanAction.INDEX_REPO)
        enforcer.check(ctx, PlanAction.ASK_QUESTION)


# ── ENTERPRISE plan ───────────────────────────────────────────────────────────


class TestEnterprisePlan:
    MAX_REPOS = PLAN_LIMITS[Plan.ENTERPRISE]["max_repos"]      # 50
    MAX_Q     = PLAN_LIMITS[Plan.ENTERPRISE]["max_questions"]  # 500

    def test_enterprise_has_highest_limits(self):
        assert self.MAX_REPOS >= PLAN_LIMITS[Plan.PAID]["max_repos"]
        assert self.MAX_Q >= PLAN_LIMITS[Plan.PAID]["max_questions"]

    def test_enterprise_can_delete_repo(self, enforcer):
        ctx = _ctx(role=Role.ENTERPRISE, plan=Plan.ENTERPRISE)
        enforcer.check(ctx, PlanAction.DELETE_REPO)  # must not raise

    def test_enterprise_within_limits_does_not_raise(self, enforcer):
        ctx = _ctx(
            role=Role.ENTERPRISE,
            plan=Plan.ENTERPRISE,
            repos=49,
            questions=499,
        )
        enforcer.check(ctx, PlanAction.INDEX_REPO)
        enforcer.check(ctx, PlanAction.ASK_QUESTION)

    def test_enterprise_at_exact_limit_raises(self, enforcer):
        ctx = _ctx(
            role=Role.ENTERPRISE,
            plan=Plan.ENTERPRISE,
            repos=self.MAX_REPOS,
        )
        with pytest.raises(HTTPException):
            enforcer.check(ctx, PlanAction.INDEX_REPO)


# ── Boundary conditions ───────────────────────────────────────────────────────


class TestBoundaryConditions:
    def test_exactly_at_limit_raises(self, enforcer):
        """repos_indexed_count == max_repos must raise (>= check)."""
        limit = PLAN_LIMITS[Plan.FREE]["max_repos"]
        ctx = _ctx(repos=limit)
        with pytest.raises(HTTPException):
            enforcer.check(ctx, PlanAction.INDEX_REPO)

    def test_one_below_limit_does_not_raise(self, enforcer):
        limit = PLAN_LIMITS[Plan.FREE]["max_repos"]
        ctx = _ctx(repos=limit - 1)
        enforcer.check(ctx, PlanAction.INDEX_REPO)  # must not raise

    def test_zero_count_always_allowed(self, enforcer):
        ctx = _ctx(repos=0, questions=0)
        enforcer.check(ctx, PlanAction.INDEX_REPO)
        enforcer.check(ctx, PlanAction.ASK_QUESTION)
