"""Aggregation and reporting services for onboarding metrics."""

import logging
from typing import Any

from app.services.metrics_ingestion_service import OnboardingEvent, ResponseFeedback

logger = logging.getLogger(__name__)


class AggregationService:
    """Computes rolled-up KPIs from events and feedback data."""

    def compute_metrics(
        self,
        events: list[OnboardingEvent],
        feedback: list[ResponseFeedback],
    ) -> dict[str, Any]:
        """Compute core KPI set from raw data."""
        total_events = len(events)
        total_feedback = len(feedback)

        # Response latency (from chat_question to chat_answer_received)
        latencies = self._compute_latencies(events)
        p50_latency = self._percentile(latencies, 50)
        p95_latency = self._percentile(latencies, 95)

        # Flow completion rate
        sessions_started = sum(1 for e in events if e.event_type == "session_start")
        sessions_ended = sum(1 for e in events if e.event_type == "session_end")
        completion_rate = (
            sessions_ended / sessions_started if sessions_started > 0 else 0.0
        )

        # Usefulness and correctness rates
        avg_usefulness = (
            sum(f.usefulness_score for f in feedback) / total_feedback
            if total_feedback > 0
            else 0.0
        )
        avg_correctness = (
            sum(f.correctness_score for f in feedback) / total_feedback
            if total_feedback > 0
            else 0.0
        )

        # Feedback coverage: responses that received feedback / total answers
        total_answers = sum(
            1 for e in events if e.event_type == "chat_answer_received"
        )
        feedback_coverage = (
            total_feedback / total_answers if total_answers > 0 else 0.0
        )

        return {
            "total_events": total_events,
            "total_feedback": total_feedback,
            "response_latency_p50": p50_latency,
            "response_latency_p95": p95_latency,
            "onboarding_flow_completion_rate": round(completion_rate, 4),
            "answer_usefulness_rate": round(avg_usefulness / 5.0, 4),
            "answer_correctness_rate": round(avg_correctness / 5.0, 4),
            "feedback_coverage_rate": round(feedback_coverage, 4),
        }

    def _compute_latencies(self, events: list[OnboardingEvent]) -> list[float]:
        """Compute response latencies from paired question/answer events."""
        questions: dict[str, str] = {}  # session_id -> timestamp
        latencies: list[float] = []

        for event in sorted(events, key=lambda e: e.timestamp):
            if event.event_type == "chat_question":
                questions[event.session_id] = event.timestamp
            elif event.event_type == "chat_answer_received":
                q_ts = questions.pop(event.session_id, None)
                if q_ts:
                    try:
                        from datetime import datetime

                        t1 = datetime.fromisoformat(q_ts)
                        t2 = datetime.fromisoformat(event.timestamp)
                        latencies.append((t2 - t1).total_seconds())
                    except (ValueError, TypeError):
                        pass
        return latencies

    def _percentile(self, data: list[float], p: int) -> float:
        """Compute percentile from sorted data."""
        if not data:
            return 0.0
        sorted_data = sorted(data)
        k = (len(sorted_data) - 1) * (p / 100.0)
        f = int(k)
        c = f + 1 if f < len(sorted_data) - 1 else f
        return sorted_data[f] + (k - f) * (sorted_data[c] - sorted_data[f])


class ReportingService:
    """Builds trend summaries and quality reports."""

    def __init__(self, aggregation: AggregationService):
        self.aggregation = aggregation

    def build_quality_report(
        self,
        events: list[OnboardingEvent],
        feedback: list[ResponseFeedback],
        period_start: str,
        period_end: str,
    ) -> dict[str, Any]:
        """Build a quality report for a given period."""
        metrics = self.aggregation.compute_metrics(events, feedback)

        # Categorize quality level
        usefulness = metrics["answer_usefulness_rate"]
        correctness = metrics["answer_correctness_rate"]
        overall_quality = (usefulness + correctness) / 2.0

        if overall_quality >= 0.8:
            quality_label = "excellent"
        elif overall_quality >= 0.6:
            quality_label = "good"
        elif overall_quality >= 0.4:
            quality_label = "needs_improvement"
        else:
            quality_label = "poor"

        return {
            "period_start": period_start,
            "period_end": period_end,
            "metrics": metrics,
            "quality_label": quality_label,
            "overall_quality_score": round(overall_quality, 4),
            "summary": self._build_summary(metrics, quality_label),
        }

    def _build_summary(self, metrics: dict[str, Any], quality_label: str) -> str:
        """Build a human-readable summary."""
        lines = [f"Quality assessment: {quality_label.upper()}"]

        if metrics["total_feedback"] == 0:
            lines.append("No feedback collected yet.")
        else:
            lines.append(
                f"Based on {metrics['total_feedback']} feedback submissions."
            )
            lines.append(
                f"Usefulness: {metrics['answer_usefulness_rate']*100:.0f}% | "
                f"Correctness: {metrics['answer_correctness_rate']*100:.0f}%"
            )

        if metrics["response_latency_p95"] > 0:
            lines.append(
                f"Response latency P95: {metrics['response_latency_p95']:.2f}s"
            )

        completion = metrics["onboarding_flow_completion_rate"]
        if completion > 0:
            lines.append(f"Flow completion rate: {completion*100:.0f}%")

        return "\n".join(lines)
