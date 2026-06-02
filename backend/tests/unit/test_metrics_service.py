"""Unit tests for metrics aggregation and reporting services."""

from app.services.metrics_aggregation_service import AggregationService, ReportingService
from app.services.metrics_ingestion_service import (
    EventIngestionService,
    FeedbackService,
    OnboardingEvent,
    ResponseFeedback,
)


class TestEventIngestionService:
    def setup_method(self):
        self.service = EventIngestionService()

    def test_create_valid_event(self):
        event = self.service.create_event(
            repository_id="repo1", event_type="session_start"
        )
        assert event.repository_id == "repo1"
        assert event.event_type == "session_start"
        assert event.id

    def test_invalid_event_type(self):
        import pytest

        with pytest.raises(ValueError, match="Invalid event_type"):
            self.service.create_event(
                repository_id="repo1", event_type="invalid_type"
            )

    def test_missing_repository_id(self):
        import pytest

        with pytest.raises(ValueError, match="repository_id"):
            self.service.create_event(repository_id="", event_type="session_start")


class TestFeedbackService:
    def setup_method(self):
        self.service = FeedbackService()

    def test_create_valid_feedback(self):
        fb = self.service.create_feedback(
            repository_id="repo1",
            response_id="resp1",
            usefulness_score=4,
            correctness_score=5,
            comment="Great!",
        )
        assert fb.usefulness_score == 4
        assert fb.correctness_score == 5

    def test_invalid_score_range(self):
        import pytest

        with pytest.raises(ValueError, match="usefulness_score"):
            self.service.create_feedback(
                repository_id="repo1",
                response_id="resp1",
                usefulness_score=0,
                correctness_score=3,
            )

    def test_score_above_max(self):
        import pytest

        with pytest.raises(ValueError, match="correctness_score"):
            self.service.create_feedback(
                repository_id="repo1",
                response_id="resp1",
                usefulness_score=3,
                correctness_score=6,
            )


class TestAggregationService:
    def setup_method(self):
        self.service = AggregationService()

    def test_compute_empty_data(self):
        metrics = self.service.compute_metrics([], [])
        assert metrics["total_events"] == 0
        assert metrics["total_feedback"] == 0
        assert metrics["response_latency_p50"] == 0.0
        assert metrics["answer_usefulness_rate"] == 0.0

    def test_compute_with_feedback(self):
        feedback = [
            ResponseFeedback(
                repository_id="r1", response_id="resp1",
                usefulness_score=4, correctness_score=5,
            ),
            ResponseFeedback(
                repository_id="r1", response_id="resp2",
                usefulness_score=3, correctness_score=4,
            ),
        ]
        metrics = self.service.compute_metrics([], feedback)
        assert metrics["total_feedback"] == 2
        # avg usefulness: (4+3)/2 = 3.5, rate = 3.5/5 = 0.7
        assert abs(metrics["answer_usefulness_rate"] - 0.7) < 0.01
        # avg correctness: (5+4)/2 = 4.5, rate = 4.5/5 = 0.9
        assert abs(metrics["answer_correctness_rate"] - 0.9) < 0.01

    def test_completion_rate(self):
        events = [
            OnboardingEvent(repository_id="r1", event_type="session_start"),
            OnboardingEvent(repository_id="r1", event_type="session_start"),
            OnboardingEvent(repository_id="r1", event_type="session_end"),
        ]
        metrics = self.service.compute_metrics(events, [])
        assert abs(metrics["onboarding_flow_completion_rate"] - 0.5) < 0.01

    def test_latency_computation(self):
        events = [
            OnboardingEvent(
                repository_id="r1", session_id="s1",
                event_type="chat_question",
                timestamp="2024-01-15T10:00:00",
            ),
            OnboardingEvent(
                repository_id="r1", session_id="s1",
                event_type="chat_answer_received",
                timestamp="2024-01-15T10:00:02",
            ),
        ]
        metrics = self.service.compute_metrics(events, [])
        assert abs(metrics["response_latency_p50"] - 2.0) < 0.01


class TestReportingService:
    def setup_method(self):
        self.agg = AggregationService()
        self.service = ReportingService(self.agg)

    def test_empty_report(self):
        report = self.service.build_quality_report(
            [], [], "2024-01-01", "2024-01-31"
        )
        assert report["quality_label"] == "poor"
        assert report["overall_quality_score"] == 0.0
        assert "No feedback" in report["summary"]

    def test_excellent_quality_report(self):
        feedback = [
            ResponseFeedback(
                repository_id="r1", response_id=f"resp{i}",
                usefulness_score=5, correctness_score=5,
            )
            for i in range(5)
        ]
        report = self.service.build_quality_report(
            [], feedback, "2024-01-01", "2024-01-31"
        )
        assert report["quality_label"] == "excellent"
        assert report["overall_quality_score"] >= 0.9
