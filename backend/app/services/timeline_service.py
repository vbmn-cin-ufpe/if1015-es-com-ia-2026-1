"""Timeline and why-explanation services for commit history."""

import logging
from typing import Any
from uuid import uuid4

from app.services.commit_history_service import CommitDecision

logger = logging.getLogger(__name__)


class TimelineService:
    """Builds and filters module-linked decision timelines."""

    def build_timeline(
        self,
        decisions: list[CommitDecision],
        module_path: str | None = None,
        category: str | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Build an ordered timeline of decisions.

        Args:
            decisions: Classified commit decisions
            module_path: Filter by module (optional)
            category: Filter by category (optional)
            limit: Max entries to return

        Returns:
            Ordered list of timeline entries (newest first)
        """
        filtered = decisions

        if module_path:
            filtered = [
                d for d in filtered if module_path in d.touched_modules
            ]

        if category:
            filtered = [d for d in filtered if d.category == category]

        # Sort by timestamp descending
        filtered.sort(key=lambda d: d.timestamp, reverse=True)

        entries = []
        for idx, decision in enumerate(filtered[:limit]):
            entries.append({
                "id": str(uuid4()),
                "position": idx + 1,
                "commit_id": decision.commit_id,
                "repository_id": decision.repository_id,
                "timestamp": decision.timestamp,
                "category": decision.category,
                "confidence": decision.confidence,
                "summary": decision.summary,
                "touched_modules": decision.touched_modules,
            })

        return entries


class WhyExplanationService:
    """Generates grounded why-explanations from timeline evidence."""

    def __init__(self, llm_port: Any = None):
        """Initialize with optional LLM port for enhanced explanations."""
        self.llm_port = llm_port

    def explain_why(
        self,
        module_path: str,
        question: str,
        decisions: list[CommitDecision],
        max_evidence: int = 10,
    ) -> dict[str, Any]:
        """Generate a why-explanation for a module based on commit history.

        Args:
            module_path: The module to explain
            question: The user's why-question
            decisions: All classified decisions for the repository
            max_evidence: Maximum number of supporting commits

        Returns:
            Explanation with supporting commit references
        """
        # Filter to relevant decisions
        relevant = [
            d for d in decisions if module_path in d.touched_modules
        ]
        relevant.sort(key=lambda d: d.timestamp, reverse=True)
        evidence = relevant[:max_evidence]

        if not evidence:
            return {
                "module_path": module_path,
                "question": question,
                "explanation": (
                    f"No commit history found for module '{module_path}'. "
                    "The module may be new or not tracked in recent commits."
                ),
                "supporting_commits": [],
                "confidence": 0.0,
            }

        # Build explanation from evidence
        explanation = self._synthesize_explanation(module_path, question, evidence)

        supporting_commits = [
            {
                "commit_id": d.commit_id,
                "timestamp": d.timestamp,
                "category": d.category,
                "summary": d.summary,
                "confidence": d.confidence,
            }
            for d in evidence
        ]

        avg_confidence = (
            sum(d.confidence for d in evidence) / len(evidence) if evidence else 0.0
        )

        return {
            "module_path": module_path,
            "question": question,
            "explanation": explanation,
            "supporting_commits": supporting_commits,
            "confidence": avg_confidence,
        }

    def _synthesize_explanation(
        self,
        module_path: str,
        question: str,
        evidence: list[CommitDecision],
    ) -> str:
        """Synthesize an explanation from evidence.

        Uses LLM if available, otherwise builds a template-based response.
        """
        if self.llm_port:
            try:
                context_chunks = [
                    {
                        "text": f"[{d.timestamp}] ({d.category}) {d.summary}",
                        "metadata": {"commit_id": d.commit_id},
                    }
                    for d in evidence
                ]
                prompt = (
                    f"Based on the commit history of module '{module_path}', "
                    f"answer: {question}\n\nEvidence from commits:"
                )
                return self.llm_port.generate_answer(prompt, context_chunks)
            except Exception as exc:
                logger.warning("LLM explanation failed, using template: %s", exc)

        # Template-based explanation
        categories = {}
        for d in evidence:
            categories.setdefault(d.category, []).append(d)

        lines = [
            f"Module '{module_path}' has been modified {len(evidence)} times in recent history."
        ]

        for cat, items in sorted(categories.items(), key=lambda x: -len(x[1])):
            lines.append(
                f"- {len(items)} change(s) classified as '{cat}': "
                f"{items[0].summary[:80]}"
                + (f" (and {len(items)-1} more)" if len(items) > 1 else "")
            )

        lines.append(
            f"\nRegarding your question '{question}': "
            "The commit history shows the changes above as the main evolution drivers."
        )

        return "\n".join(lines)
