"""Event and feedback ingestion services for onboarding metrics."""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

logger = logging.getLogger(__name__)


@dataclass
class OnboardingEvent:
    """Raw onboarding event record."""

    id: str = field(default_factory=lambda: str(uuid4()))
    repository_id: str = ""
    session_id: str = ""
    event_type: str = ""
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ResponseFeedback:
    """User feedback on an assistant response."""

    id: str = field(default_factory=lambda: str(uuid4()))
    repository_id: str = ""
    response_id: str = ""
    usefulness_score: int = 0  # 1-5
    correctness_score: int = 0  # 1-5
    comment: str = ""
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class EventIngestionService:
    """Validates and records onboarding events."""

    VALID_EVENT_TYPES = {
        "session_start",
        "session_end",
        "tour_generated",
        "tour_step_viewed",
        "graph_loaded",
        "module_inspected",
        "timeline_loaded",
        "why_asked",
        "chat_question",
        "chat_answer_received",
        "feedback_submitted",
    }

    def validate_event(self, event: OnboardingEvent) -> list[str]:
        """Validate an event, return list of errors (empty if valid)."""
        errors = []
        if not event.repository_id:
            errors.append("repository_id is required")
        if not event.event_type:
            errors.append("event_type is required")
        elif event.event_type not in self.VALID_EVENT_TYPES:
            errors.append(f"Invalid event_type: {event.event_type}")
        return errors

    def create_event(
        self,
        repository_id: str,
        event_type: str,
        session_id: str = "",
        metadata: dict[str, Any] | None = None,
    ) -> OnboardingEvent:
        """Create a validated onboarding event."""
        event = OnboardingEvent(
            repository_id=repository_id,
            session_id=session_id,
            event_type=event_type,
            metadata=metadata or {},
        )
        errors = self.validate_event(event)
        if errors:
            raise ValueError(f"Invalid event: {'; '.join(errors)}")
        return event


class FeedbackService:
    """Validates and captures user feedback."""

    def validate_feedback(self, feedback: ResponseFeedback) -> list[str]:
        """Validate feedback, return list of errors."""
        errors = []
        if not feedback.repository_id:
            errors.append("repository_id is required")
        if not feedback.response_id:
            errors.append("response_id is required")
        if not (1 <= feedback.usefulness_score <= 5):
            errors.append("usefulness_score must be between 1 and 5")
        if not (1 <= feedback.correctness_score <= 5):
            errors.append("correctness_score must be between 1 and 5")
        return errors

    def create_feedback(
        self,
        repository_id: str,
        response_id: str,
        usefulness_score: int,
        correctness_score: int,
        comment: str = "",
    ) -> ResponseFeedback:
        """Create validated feedback."""
        feedback = ResponseFeedback(
            repository_id=repository_id,
            response_id=response_id,
            usefulness_score=usefulness_score,
            correctness_score=correctness_score,
            comment=comment,
        )
        errors = self.validate_feedback(feedback)
        if errors:
            raise ValueError(f"Invalid feedback: {'; '.join(errors)}")
        return feedback
