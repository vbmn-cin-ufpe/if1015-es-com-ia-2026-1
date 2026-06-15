"""History orchestration service — coordinates commit ingestion, classification, timeline, and why."""

import logging
from pathlib import Path
from typing import Any

from app.infrastructure.decision_repository_adapter import DecisionRepositoryAdapter
from app.services.commit_history_service import (
    CommitDecision,
    CommitIngestionService,
    DecisionClassificationService,
)
from app.services.timeline_service import TimelineService, WhyExplanationService

logger = logging.getLogger(__name__)


class HistoryService:
    """Orchestrates commit history analysis pipeline."""

    def __init__(
        self,
        decision_repository: DecisionRepositoryAdapter,
        llm_port: Any = None,
    ):
        self.decision_repository = decision_repository
        self.ingestion = CommitIngestionService()
        self.classifier = DecisionClassificationService()
        self.timeline_service = TimelineService()
        self.why_service = WhyExplanationService(llm_port=llm_port)

    def _ensure_decisions(
        self, repository_id: str, repo_root: Path
    ) -> list[CommitDecision]:
        """Ensure decisions are available (ingest + classify if needed)."""
        decisions = self.decision_repository.get_decisions(repository_id)
        # Re-ingest if missing or if cached decisions lack the author field
        if decisions and not getattr(decisions[0], "author", ""):
            self.decision_repository.delete_decisions(repository_id)
            decisions = []
        if decisions:
            return decisions

        # Ingest and classify
        commits = self.ingestion.ingest_commits(repo_root, repository_id)
        if not commits:
            return []

        decisions = self.classifier.classify_batch(commits)
        self.decision_repository.save_decisions(repository_id, decisions)
        return decisions

    def get_timeline(
        self,
        repository_id: str,
        repo_root: Path,
        module_path: str | None = None,
        category: str | None = None,
        search: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int]:
        """Get decision timeline for a repository. Returns (entries, total)."""
        decisions = self._ensure_decisions(repository_id, repo_root)
        return self.timeline_service.build_timeline(
            decisions, module_path=module_path, category=category,
            search=search, limit=limit, offset=offset,
        )

    def clear_cache(self, repository_id: str) -> int:
        """Delete cached decisions so the next call re-ingests from git. Returns deleted count."""
        decisions = self.decision_repository.get_decisions(repository_id)
        count = len(decisions)
        self.decision_repository.delete_decisions(repository_id)
        return count

    def explain_why(
        self,
        repository_id: str,
        repo_root: Path,
        module_path: str,
        question: str,
    ) -> dict[str, Any]:
        """Generate a why-explanation for a module."""
        decisions = self._ensure_decisions(repository_id, repo_root)
        return self.why_service.explain_why(module_path, question, decisions)
