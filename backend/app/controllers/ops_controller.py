"""Operational endpoints — liveness, readiness, and summary."""

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.observability_service import get_metrics_collector

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ops", tags=["operations"])


class LivenessResponse(BaseModel):
    status: str


class DependencyStatus(BaseModel):
    name: str
    status: str  # healthy, degraded, unknown
    latency_ms: float | None = None
    message: str = ""


class ReadinessResponse(BaseModel):
    status: str  # ready, degraded, not_ready
    dependencies: list[DependencyStatus]


class OperationalSummary(BaseModel):
    status: str
    uptime_info: str
    total_metric_points: int
    operations: dict[str, Any]
    recent_errors: list[dict[str, Any]]
    alert_status: str


# --- Readiness checks ---

def _check_postgres() -> DependencyStatus:
    """Check PostgreSQL connectivity."""
    try:
        from app.infrastructure.settings import get_settings
        settings = get_settings()
        if not settings.postgres_dsn:
            return DependencyStatus(
                name="postgres", status="healthy",
                message="Using in-memory fallback (no DSN configured)"
            )
        import psycopg
        import time
        start = time.time()
        conn = psycopg.connect(settings.postgres_dsn, connect_timeout=3)
        conn.execute("SELECT 1")
        conn.close()
        latency = (time.time() - start) * 1000
        return DependencyStatus(
            name="postgres", status="healthy", latency_ms=round(latency, 2)
        )
    except Exception as exc:
        return DependencyStatus(
            name="postgres", status="degraded", message=str(exc)[:100]
        )


def _check_chromadb() -> DependencyStatus:
    """Check ChromaDB connectivity via direct HTTP heartbeat (avoids SDK tenant validation on init)."""
    try:
        from app.infrastructure.settings import get_settings
        settings = get_settings()
        if not settings.chroma_host:
            return DependencyStatus(
                name="chromadb", status="healthy",
                message="Using in-memory fallback"
            )
        import time
        import urllib.request
        scheme = "https" if settings.chroma_ssl else "http"
        url = f"{scheme}://{settings.chroma_host}:{settings.chroma_port}/api/v1/heartbeat"
        start = time.time()
        with urllib.request.urlopen(url, timeout=5) as resp:  # noqa: S310
            resp.read()
        latency = (time.time() - start) * 1000
        return DependencyStatus(
            name="chromadb", status="healthy", latency_ms=round(latency, 2)
        )
    except Exception as exc:
        return DependencyStatus(
            name="chromadb", status="degraded", message=str(exc)[:100]
        )


def _check_llm() -> DependencyStatus:
    """Check LLM provider availability."""
    try:
        from app.infrastructure.settings import get_settings
        settings = get_settings()
        if not settings.llm_api_key:
            return DependencyStatus(
                name="llm_provider", status="unknown",
                message="No API key configured"
            )
        return DependencyStatus(
            name="llm_provider", status="healthy",
            message="API key configured"
        )
    except Exception as exc:
        return DependencyStatus(
            name="llm_provider", status="unknown", message=str(exc)[:100]
        )


# --- Alert evaluation ---

class AlertEvaluationService:
    """Evaluates baseline alert thresholds."""

    ERROR_RATE_THRESHOLD = 0.1  # 10% error rate
    LATENCY_P95_THRESHOLD = 10.0  # 10 seconds
    READINESS_FAILURE_THRESHOLD = 2  # 2+ degraded dependencies

    def evaluate(
        self, dependencies: list[DependencyStatus], metrics_summary: dict[str, Any]
    ) -> str:
        """Evaluate alert status: ok, warning, critical."""
        degraded_count = sum(1 for d in dependencies if d.status == "degraded")

        if degraded_count >= self.READINESS_FAILURE_THRESHOLD:
            return "critical"

        ops = metrics_summary.get("operations", {})
        for op_data in ops.values():
            req_count = op_data.get("request_count", 0)
            err_count = op_data.get("error_count", 0)
            if req_count > 0 and (err_count / req_count) > self.ERROR_RATE_THRESHOLD:
                return "warning"
            if op_data.get("avg_latency", 0) > self.LATENCY_P95_THRESHOLD:
                return "warning"

        if degraded_count > 0:
            return "warning"

        return "ok"


_alert_service = AlertEvaluationService()
_start_time = datetime.now(timezone.utc)


# --- Endpoints ---

@router.get("/health/live", response_model=LivenessResponse)
def liveness() -> LivenessResponse:
    """Liveness probe — confirms the process is running."""
    return LivenessResponse(status="alive")


@router.get("/health/ready", response_model=ReadinessResponse)
def readiness() -> ReadinessResponse:
    """Readiness probe — checks all dependency connections."""
    deps = [_check_postgres(), _check_chromadb(), _check_llm()]

    all_healthy = all(d.status == "healthy" for d in deps)
    any_degraded = any(d.status == "degraded" for d in deps)

    if all_healthy:
        overall = "ready"
    elif any_degraded:
        overall = "degraded"
    else:
        overall = "ready"

    return ReadinessResponse(status=overall, dependencies=deps)


@router.get("/summary", response_model=OperationalSummary)
def operational_summary() -> OperationalSummary:
    """Operational summary — aggregated KPIs, errors, alert state."""
    collector = get_metrics_collector()
    summary = collector.get_summary()

    # Get recent errors
    error_metrics = collector.get_metrics(name_prefix="")
    recent_errors = [
        {
            "name": m.name,
            "dimensions": m.dimensions,
            "timestamp": m.timestamp,
        }
        for m in error_metrics
        if "error" in m.name
    ][-10:]  # last 10 errors

    # Readiness check for alert eval
    deps = [_check_postgres(), _check_chromadb(), _check_llm()]
    alert_status = _alert_service.evaluate(deps, summary)

    uptime = datetime.now(timezone.utc) - _start_time
    uptime_str = f"{uptime.days}d {uptime.seconds // 3600}h {(uptime.seconds % 3600) // 60}m"

    return OperationalSummary(
        status="operational",
        uptime_info=uptime_str,
        total_metric_points=summary["total_points"],
        operations=summary.get("operations", {}),
        recent_errors=recent_errors,
        alert_status=alert_status,
    )
