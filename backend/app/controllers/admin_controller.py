"""Admin API — user management endpoints (admin-only)."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.domain.enums import Plan, Role
from app.middleware.auth_middleware import AuthenticatedUser, require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])

_require_admin = Depends(require_role(Role.ADMIN))


# ── Response / request models ─────────────────────────────────────────────────

class UserSummary(BaseModel):
    user_id: str
    email: str
    role: str
    plan: str
    email_verified: bool
    repos_indexed_count: int
    questions_asked_count: int
    created_at: Optional[str] = None
    deleted_at: Optional[str] = None


class UserListResponse(BaseModel):
    total: int
    users: list[UserSummary]


class UpdateUserRequest(BaseModel):
    role: Optional[str] = None   # "admin" | "free" | "paid" | "enterprise"
    plan: Optional[str] = None   # "free" | "paid" | "enterprise"
    email_verified: Optional[bool] = None


class AdminStats(BaseModel):
    total_users: int
    by_plan: dict[str, int]
    by_role: dict[str, int]
    total_repos_indexed: int
    total_questions_asked: int


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_user_repo():
    from app.dependencies import get_user_repository_instance
    return get_user_repository_instance()


def _user_to_summary(u) -> UserSummary:
    return UserSummary(
        user_id=u.id,
        email=u.email,
        role=u.role.value if hasattr(u.role, "value") else str(u.role),
        plan=u.plan.value if hasattr(u.plan, "value") else str(u.plan),
        email_verified=u.email_verified,
        repos_indexed_count=u.repos_indexed_count,
        questions_asked_count=u.questions_asked_count,
        created_at=getattr(u, "created_at", None),
        deleted_at=getattr(u, "deleted_at", None),
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/users", response_model=UserListResponse, dependencies=[_require_admin])
def list_users(
    plan: Optional[str] = None,
    role: Optional[str] = None,
    include_deleted: bool = False,
) -> UserListResponse:
    """List all users with optional plan/role filters."""
    repo = _get_user_repo()
    users = repo.list_all(include_deleted=include_deleted)

    if plan:
        users = [u for u in users if (u.plan.value if hasattr(u.plan, "value") else u.plan) == plan]
    if role:
        users = [u for u in users if (u.role.value if hasattr(u.role, "value") else u.role) == role]

    return UserListResponse(total=len(users), users=[_user_to_summary(u) for u in users])


@router.get("/users/{user_id}", response_model=UserSummary, dependencies=[_require_admin])
def get_user(user_id: str) -> UserSummary:
    """Get a single user by ID."""
    repo = _get_user_repo()
    user = repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_to_summary(user)


@router.patch("/users/{user_id}", response_model=UserSummary, dependencies=[_require_admin])
def update_user(user_id: str, body: UpdateUserRequest) -> UserSummary:
    """Update a user's role, plan, or email verification status."""
    repo = _get_user_repo()
    user = repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.role is not None:
        try:
            user.role = Role(body.role)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid role: {body.role}")

    if body.plan is not None:
        try:
            user.plan = Plan(body.plan)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid plan: {body.plan}")

    if body.email_verified is not None:
        user.email_verified = body.email_verified

    repo.update(user)
    logger.info("Admin updated user %s: role=%s plan=%s", user_id, user.role, user.plan)
    return _user_to_summary(user)


@router.delete("/users/{user_id}", dependencies=[_require_admin])
def delete_user(user_id: str, _admin: AuthenticatedUser = Depends(require_role(Role.ADMIN))) -> dict:
    """Soft-delete a user (sets deleted_at timestamp)."""
    repo = _get_user_repo()
    user = repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if (user.role.value if hasattr(user.role, "value") else user.role) == "admin":
        raise HTTPException(status_code=403, detail="Cannot delete another admin account")

    repo.soft_delete(user_id, deleted_by=_admin.user_id)
    logger.info("Admin %s soft-deleted user %s", _admin.user_id, user_id)
    return {"deleted": True, "user_id": user_id}


@router.post("/users/{user_id}/reset-password", dependencies=[_require_admin])
def admin_reset_password(user_id: str) -> dict:
    """Trigger a password reset email for a user."""
    from app.dependencies import get_auth_service_instance
    auth_svc = get_auth_service_instance()
    repo = _get_user_repo()
    user = repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        auth_svc.request_password_reset(user.email)
    except Exception as exc:
        logger.warning("Failed to send reset email for %s: %s", user_id, exc)

    return {"message": "Password reset email dispatched (if email service is configured)"}


@router.get("/stats", response_model=AdminStats, dependencies=[_require_admin])
def admin_stats() -> AdminStats:
    """Aggregate user stats for the admin dashboard."""
    repo = _get_user_repo()
    users = repo.list_all(include_deleted=False)

    by_plan: dict[str, int] = {}
    by_role: dict[str, int] = {}
    total_repos = 0
    total_questions = 0

    for u in users:
        plan_val = u.plan.value if hasattr(u.plan, "value") else str(u.plan)
        role_val = u.role.value if hasattr(u.role, "value") else str(u.role)
        by_plan[plan_val] = by_plan.get(plan_val, 0) + 1
        by_role[role_val] = by_role.get(role_val, 0) + 1
        total_repos += u.repos_indexed_count
        total_questions += u.questions_asked_count

    return AdminStats(
        total_users=len(users),
        by_plan=by_plan,
        by_role=by_role,
        total_repos_indexed=total_repos,
        total_questions_asked=total_questions,
    )


# ── Repository health endpoint ─────────────────────────────────────────────────

class RepoHealthRecord(BaseModel):
    repository_id: str
    repository_url: str
    status: str
    chunk_count: int
    file_count: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    error_message: Optional[str] = None


class ReposHealthResponse(BaseModel):
    total: int
    by_status: dict[str, int]
    repositories: list[RepoHealthRecord]


@router.get("/repos/health", response_model=ReposHealthResponse, dependencies=[_require_admin])
def repos_health() -> ReposHealthResponse:
    """Return health overview for all indexed repositories (admin only)."""
    from app.dependencies import get_metadata_adapter

    metadata = get_metadata_adapter()
    # list_repositories is a concrete method on PostgresAdapter
    records = metadata.list_repositories()  # type: ignore[attr-defined]

    by_status: dict[str, int] = {}
    repo_health: list[RepoHealthRecord] = []

    for r in records:
        by_status[r.status] = by_status.get(r.status, 0) + 1
        stats = r.stats or {}
        repo_health.append(
            RepoHealthRecord(
                repository_id=r.repository_id,
                repository_url=r.repository_url,
                status=r.status,
                chunk_count=int(stats.get("chunks_stored", stats.get("chunk_count", 0))),
                file_count=int(stats.get("files_detected", stats.get("file_count", 0))),
                created_at=r.created_at,
                updated_at=r.updated_at,
                error_message=r.error_message,
            )
        )

    return ReposHealthResponse(total=len(records), by_status=by_status, repositories=repo_health)


# ── Usage dashboard endpoint ───────────────────────────────────────────────────

class UsageDailyBucket(BaseModel):
    date: str         # YYYY-MM-DD
    event_count: int
    unique_repos: int


class UsageSummary(BaseModel):
    total_events: int
    total_sessions: int
    by_event_type: dict[str, int]
    daily_buckets: list[UsageDailyBucket]


@router.get("/usage", response_model=UsageSummary, dependencies=[_require_admin])
def usage_dashboard(days: int = 30) -> UsageSummary:
    """Return usage statistics across all repositories for the last N days (admin only)."""
    from datetime import datetime, timedelta, timezone

    from app.infrastructure.metrics_repository_adapter import MetricsRepositoryAdapter
    from app.infrastructure.settings import get_settings
    from app.dependencies import get_metadata_adapter

    settings = get_settings()
    metrics_repo = MetricsRepositoryAdapter(settings)
    metadata = get_metadata_adapter()

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    records = metadata.list_repositories()  # type: ignore[attr-defined]

    all_events = []
    for repo in records:
        events = metrics_repo.get_events(
            repository_id=repo.repository_id,
            from_ts=cutoff,
        )
        all_events.extend(events)

    # Aggregate
    by_event_type: dict[str, int] = {}
    session_ids: set[str] = set()
    daily: dict[str, set[str]] = {}  # date → set of repo_ids

    for ev in all_events:
        by_event_type[ev.event_type] = by_event_type.get(ev.event_type, 0) + 1
        if ev.session_id:
            session_ids.add(ev.session_id)
        date_key = ev.timestamp[:10]  # YYYY-MM-DD
        daily.setdefault(date_key, set()).add(ev.repository_id)

    # Build daily buckets with counts
    date_counts: dict[str, int] = {}
    for ev in all_events:
        date_key = ev.timestamp[:10]
        date_counts[date_key] = date_counts.get(date_key, 0) + 1

    buckets = [
        UsageDailyBucket(
            date=d,
            event_count=date_counts.get(d, 0),
            unique_repos=len(daily.get(d, set())),
        )
        for d in sorted(daily.keys())
    ]

    return UsageSummary(
        total_events=len(all_events),
        total_sessions=len(session_ids),
        by_event_type=by_event_type,
        daily_buckets=buckets,
    )


# ── LLM feedback evaluation endpoint ─────────────────────────────────────────

class FeedbackRecord(BaseModel):
    feedback_id: str
    repository_id: str
    response_id: str
    usefulness_score: int
    correctness_score: int
    thumbs_up: bool       # derived: True when both scores >= 4
    comment: str
    timestamp: str


class LlmFeedbackResponse(BaseModel):
    total: int
    positive: int
    negative: int
    positive_rate: float  # 0.0 – 1.0
    avg_usefulness: float
    avg_correctness: float
    records: list[FeedbackRecord]


@router.get("/llm-feedback", response_model=LlmFeedbackResponse, dependencies=[_require_admin])
def llm_feedback_report(days: int = 30) -> LlmFeedbackResponse:
    """Return LLM answer quality metrics with individual feedback records (admin only)."""
    from datetime import datetime, timedelta, timezone

    from app.infrastructure.metrics_repository_adapter import FeedbackRepositoryAdapter
    from app.infrastructure.settings import get_settings

    settings = get_settings()
    feedback_repo = FeedbackRepositoryAdapter(settings)

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    items = feedback_repo.get_all_feedback(from_ts=cutoff, limit=500)  # type: ignore[attr-defined]

    positive = sum(1 for f in items if f.usefulness_score >= 4 and f.correctness_score >= 4)
    negative = len(items) - positive
    avg_use = sum(f.usefulness_score for f in items) / len(items) if items else 0.0
    avg_cor = sum(f.correctness_score for f in items) / len(items) if items else 0.0

    records = [
        FeedbackRecord(
            feedback_id=f.id,
            repository_id=f.repository_id,
            response_id=f.response_id,
            usefulness_score=f.usefulness_score,
            correctness_score=f.correctness_score,
            thumbs_up=(f.usefulness_score >= 4 and f.correctness_score >= 4),
            comment=f.comment,
            timestamp=f.timestamp,
        )
        for f in items
    ]

    return LlmFeedbackResponse(
        total=len(items),
        positive=positive,
        negative=negative,
        positive_rate=round(positive / len(items), 3) if items else 0.0,
        avg_usefulness=round(avg_use, 2),
        avg_correctness=round(avg_cor, 2),
        records=records,
    )


# ── LLM Cost Monitor ─────────────────────────────────────────────────────────

class LlmCostRecord(BaseModel):
    id: str
    user_id: str
    endpoint: str
    repository_id: str
    provider: str
    model: str
    tokens_in: int
    tokens_out: int
    cost_usd: float
    timestamp: str


class LlmCostSummary(BaseModel):
    total_cost_usd: float
    total_tokens_in: int
    total_tokens_out: int
    total_calls: int
    by_provider: dict[str, float]        # provider → cost
    by_day: dict[str, float]             # date → cost
    monthly_projection_usd: float
    recent: list[LlmCostRecord]


@router.get("/llm-costs", response_model=LlmCostSummary, dependencies=[_require_admin])
def llm_costs(days: int = 30) -> LlmCostSummary:
    """Return LLM token usage and cost breakdown (admin only)."""
    from datetime import datetime, timedelta, timezone

    from app.dependencies import get_llm_usage_repository

    usage_repo = get_llm_usage_repository()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    records = usage_repo.aggregate(from_ts=cutoff, limit=1000)

    total_cost = sum(r.cost_usd for r in records)
    total_in = sum(r.tokens_in for r in records)
    total_out = sum(r.tokens_out for r in records)

    by_provider: dict[str, float] = {}
    by_day: dict[str, float] = {}
    for r in records:
        by_provider[r.provider] = round(by_provider.get(r.provider, 0.0) + r.cost_usd, 6)
        day = r.timestamp[:10]
        by_day[day] = round(by_day.get(day, 0.0) + r.cost_usd, 6)

    # Monthly projection based on average daily cost
    avg_daily = total_cost / max(days, 1)
    projection = round(avg_daily * 30, 4)

    recent = [
        LlmCostRecord(
            id=r.id, user_id=r.user_id, endpoint=r.endpoint,
            repository_id=r.repository_id, provider=r.provider,
            model=r.model, tokens_in=r.tokens_in, tokens_out=r.tokens_out,
            cost_usd=r.cost_usd, timestamp=r.timestamp,
        )
        for r in records[:50]
    ]

    return LlmCostSummary(
        total_cost_usd=round(total_cost, 4),
        total_tokens_in=total_in,
        total_tokens_out=total_out,
        total_calls=len(records),
        by_provider=by_provider,
        by_day=dict(sorted(by_day.items())),
        monthly_projection_usd=projection,
        recent=recent,
    )


# ── Ingestion Queue ───────────────────────────────────────────────────────────

class IngestionQueueItem(BaseModel):
    repository_id: str
    repository_url: str
    status: str
    progress_pct: int
    current_step: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    error_message: Optional[str] = None


class IngestionQueueResponse(BaseModel):
    total: int
    active: int
    items: list[IngestionQueueItem]


@router.get("/ingestion-queue", response_model=IngestionQueueResponse, dependencies=[_require_admin])
def ingestion_queue() -> IngestionQueueResponse:
    """Return all repositories with real-time ingestion progress (admin only)."""
    from app.dependencies import get_metadata_adapter

    metadata = get_metadata_adapter()
    records = metadata.list_repositories()  # type: ignore[attr-defined]

    active_statuses = {"queued", "cloning", "detecting", "chunking", "embedding", "storing"}

    items = [
        IngestionQueueItem(
            repository_id=r.repository_id,
            repository_url=r.repository_url,
            status=r.status,
            progress_pct=r.progress_pct,
            current_step=r.current_step,
            created_at=r.created_at,
            updated_at=r.updated_at,
            error_message=r.error_message,
        )
        for r in records
    ]
    active = sum(1 for r in records if r.status in active_statuses)

    return IngestionQueueResponse(total=len(items), active=active, items=items)


# ── Plan Limits Management ────────────────────────────────────────────────────

class PlanLimitOut(BaseModel):
    plan: str
    max_repos: int
    max_questions: int
    can_delete_repo: bool


class UpdatePlanLimitRequest(BaseModel):
    max_repos: int
    max_questions: int
    can_delete_repo: bool


def _get_plan_repo():
    from app.dependencies import get_settings_cached
    from app.infrastructure.plan_limits_repository import PlanLimitsRepository
    return PlanLimitsRepository(get_settings_cached())


@router.get("/plans", response_model=list[PlanLimitOut], dependencies=[_require_admin])
def list_plan_limits() -> list[PlanLimitOut]:
    """Return configured limits for all plans."""
    plan_repo = _get_plan_repo()
    return [
        PlanLimitOut(
            plan=p.plan,
            max_repos=p.max_repos,
            max_questions=p.max_questions,
            can_delete_repo=p.can_delete_repo,
        )
        for p in plan_repo.get_all()
    ]


@router.patch("/plans/{plan}", response_model=PlanLimitOut, dependencies=[_require_admin])
def update_plan_limits(plan: str, body: UpdatePlanLimitRequest) -> PlanLimitOut:
    """Edit limits for a specific plan (free | paid | enterprise)."""
    valid_plans = {"free", "paid", "enterprise"}
    if plan not in valid_plans:
        raise HTTPException(status_code=422, detail=f"Invalid plan. Must be one of: {valid_plans}")

    plan_repo = _get_plan_repo()
    updated = plan_repo.update(
        plan=plan,
        max_repos=body.max_repos,
        max_questions=body.max_questions,
        can_delete_repo=body.can_delete_repo,
    )
    logger.info("Admin updated plan limits for %s: %s", plan, body)
    return PlanLimitOut(
        plan=updated.plan,
        max_repos=updated.max_repos,
        max_questions=updated.max_questions,
        can_delete_repo=updated.can_delete_repo,
    )


# ── Audit Log ─────────────────────────────────────────────────────────────────

class AuditEntryOut(BaseModel):
    id: str
    user_id: str
    user_email: str
    action: str
    resource_type: str
    resource_id: str
    ip: str
    extra: str
    timestamp: str


class AuditLogResponse(BaseModel):
    total: int
    entries: list[AuditEntryOut]


@router.get("/audit-log", response_model=AuditLogResponse, dependencies=[_require_admin])
def get_audit_log(
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    days: int = 30,
    limit: int = 200,
) -> AuditLogResponse:
    """Return audit log entries with optional filters (admin only)."""
    from datetime import datetime, timedelta, timezone

    from app.dependencies import get_settings_cached
    from app.infrastructure.audit_repository import AuditRepository

    settings = get_settings_cached()
    audit_repo = AuditRepository(settings)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    entries = audit_repo.query(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        from_ts=cutoff,
        limit=limit,
    )
    return AuditLogResponse(
        total=len(entries),
        entries=[
            AuditEntryOut(
                id=e.id, user_id=e.user_id, user_email=e.user_email,
                action=e.action, resource_type=e.resource_type,
                resource_id=e.resource_id, ip=e.ip,
                extra=e.extra, timestamp=e.timestamp,
            )
            for e in entries
        ],
    )

