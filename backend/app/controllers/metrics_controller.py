"""Metrics and feedback API endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.services.models import (
    FeedbackRequest,
    FeedbackResponse,
    MetricsPayload,
    MetricsResponse,
    QualityReportResponse,
)

router = APIRouter(tags=["metrics"])


def _get_metrics_deps():
    """Lazy-load metrics dependencies."""
    from app.infrastructure.metrics_repository_adapter import (
        FeedbackRepositoryAdapter,
        MetricsRepositoryAdapter,
    )
    from app.infrastructure.settings import get_settings
    from app.services.metrics_aggregation_service import (
        AggregationService,
        ReportingService,
    )
    from app.services.metrics_ingestion_service import FeedbackService

    settings = get_settings()
    return {
        "metrics_repo": MetricsRepositoryAdapter(settings),
        "feedback_repo": FeedbackRepositoryAdapter(settings),
        "feedback_service": FeedbackService(),
        "aggregation": AggregationService(),
        "reporting": ReportingService(AggregationService()),
    }


@router.post("/api/feedback", response_model=FeedbackResponse)
def submit_feedback(payload: FeedbackRequest) -> FeedbackResponse:
    """Submit feedback for an assistant response."""
    deps = _get_metrics_deps()
    feedback_service = deps["feedback_service"]
    feedback_repo = deps["feedback_repo"]

    try:
        feedback = feedback_service.create_feedback(
            repository_id=payload.repository_id,
            response_id=payload.response_id,
            usefulness_score=payload.usefulness_score,
            correctness_score=payload.correctness_score,
            comment=payload.comment,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    feedback_repo.save_feedback(feedback)

    return FeedbackResponse(feedback_id=feedback.id, status="recorded")


@router.get("/api/repos/{repository_id}/metrics", response_model=MetricsResponse)
def get_metrics(
    repository_id: str,
    from_ts: str | None = None,
    to_ts: str | None = None,
) -> MetricsResponse:
    """Get aggregate metrics for a repository."""
    deps = _get_metrics_deps()
    metrics_repo = deps["metrics_repo"]
    feedback_repo = deps["feedback_repo"]
    aggregation = deps["aggregation"]

    events = metrics_repo.get_events(repository_id, from_ts=from_ts, to_ts=to_ts)
    feedback = feedback_repo.get_feedback(repository_id, from_ts=from_ts, to_ts=to_ts)
    computed = aggregation.compute_metrics(events, feedback)

    return MetricsResponse(
        repository_id=repository_id,
        period_start=from_ts,
        period_end=to_ts,
        metrics=MetricsPayload(**computed),
    )


@router.get(
    "/api/repos/{repository_id}/metrics/quality-report",
    response_model=QualityReportResponse,
)
def get_quality_report(
    repository_id: str,
    from_ts: str | None = None,
    to_ts: str | None = None,
) -> QualityReportResponse:
    """Get quality report for a repository and period."""
    deps = _get_metrics_deps()
    metrics_repo = deps["metrics_repo"]
    feedback_repo = deps["feedback_repo"]
    reporting = deps["reporting"]

    now = datetime.now(timezone.utc).isoformat()
    period_start = from_ts or "1970-01-01T00:00:00"
    period_end = to_ts or now

    events = metrics_repo.get_events(repository_id, from_ts=period_start, to_ts=period_end)
    feedback = feedback_repo.get_feedback(repository_id, from_ts=period_start, to_ts=period_end)
    report = reporting.build_quality_report(events, feedback, period_start, period_end)

    return QualityReportResponse(
        repository_id=repository_id,
        period_start=report["period_start"],
        period_end=report["period_end"],
        metrics=MetricsPayload(**report["metrics"]),
        quality_label=report["quality_label"],
        overall_quality_score=report["overall_quality_score"],
        summary=report["summary"],
    )
