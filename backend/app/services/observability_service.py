"""Structured logging and telemetry services for observability."""

import json
import logging
import time
import uuid
from contextvars import ContextVar
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

# Correlation ID context variable for request tracing
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")


def get_correlation_id() -> str:
    """Get the current correlation ID."""
    return correlation_id_var.get() or str(uuid.uuid4())


def set_correlation_id(cid: str | None = None) -> str:
    """Set correlation ID for the current context."""
    new_id = cid or str(uuid.uuid4())
    correlation_id_var.set(new_id)
    return new_id


class StructuredLogger:
    """Standardized structured log entries with telemetry fields."""

    def __init__(self, service: str = "codecompass"):
        self.service = service

    def _format_entry(
        self,
        level: str,
        operation: str,
        stage: str,
        message: str,
        error_code: str | None = None,
        extra: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "service": self.service,
            "correlation_id": get_correlation_id(),
            "operation": operation,
            "stage": stage,
            "message": message,
        }
        if error_code:
            entry["error_code"] = error_code
        if extra:
            entry.update(extra)
        return entry

    def info(self, operation: str, stage: str, message: str, **extra: Any) -> None:
        entry = self._format_entry("INFO", operation, stage, message, extra=extra)
        logger.info(json.dumps(entry))

    def warning(self, operation: str, stage: str, message: str, **extra: Any) -> None:
        entry = self._format_entry("WARNING", operation, stage, message, extra=extra)
        logger.warning(json.dumps(entry))

    def error(
        self, operation: str, stage: str, message: str, error_code: str | None = None, **extra: Any
    ) -> None:
        entry = self._format_entry("ERROR", operation, stage, message, error_code=error_code, extra=extra)
        logger.error(json.dumps(entry))


@dataclass
class MetricPoint:
    """Single metric data point."""

    name: str
    value: float
    dimensions: dict[str, str] = field(default_factory=dict)
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class MetricsCollector:
    """Collects and stores workflow metrics."""

    def __init__(self):
        self._metrics: list[MetricPoint] = []
        self._log = StructuredLogger()

    def record(
        self, name: str, value: float, dimensions: dict[str, str] | None = None
    ) -> None:
        """Record a metric point."""
        point = MetricPoint(name=name, value=value, dimensions=dimensions or {})
        self._metrics.append(point)

    def record_latency(
        self, operation: str, duration_seconds: float, status: str = "success",
        repository_id: str | None = None,
    ) -> None:
        """Record latency metric for an operation."""
        dims = {"operation": operation, "status": status}
        if repository_id:
            dims["repository_id"] = repository_id
        self.record(f"{operation}_latency_seconds", duration_seconds, dims)

    def record_error(
        self, operation: str, error_code: str = "unknown",
        repository_id: str | None = None,
    ) -> None:
        """Record an error occurrence."""
        dims = {"operation": operation, "error_code": error_code}
        if repository_id:
            dims["repository_id"] = repository_id
        self.record(f"{operation}_errors_total", 1.0, dims)

    def record_throughput(self, operation: str, count: int = 1) -> None:
        """Record throughput count."""
        self.record(f"{operation}_requests_total", float(count), {"operation": operation})

    def get_metrics(
        self, name_prefix: str | None = None, since: str | None = None
    ) -> list[MetricPoint]:
        """Retrieve collected metrics, optionally filtered."""
        result = self._metrics
        if name_prefix:
            result = [m for m in result if m.name.startswith(name_prefix)]
        if since:
            result = [m for m in result if m.timestamp >= since]
        return result

    def get_summary(self) -> dict[str, Any]:
        """Get a summary of collected metrics."""
        if not self._metrics:
            return {"total_points": 0, "operations": {}}

        ops: dict[str, dict[str, Any]] = {}
        for m in self._metrics:
            op = m.dimensions.get("operation", "unknown")
            if op not in ops:
                ops[op] = {"count": 0, "errors": 0, "latencies": []}
            ops[op]["count"] += 1
            if "errors" in m.name:
                ops[op]["errors"] += 1
            if "latency" in m.name:
                ops[op]["latencies"].append(m.value)

        summary: dict[str, Any] = {}
        for op, data in ops.items():
            latencies = data["latencies"]
            summary[op] = {
                "request_count": data["count"],
                "error_count": data["errors"],
                "avg_latency": sum(latencies) / len(latencies) if latencies else 0,
            }

        return {"total_points": len(self._metrics), "operations": summary}


# Global metrics collector
_metrics_collector = MetricsCollector()


def get_metrics_collector() -> MetricsCollector:
    """Get the global metrics collector instance."""
    return _metrics_collector
