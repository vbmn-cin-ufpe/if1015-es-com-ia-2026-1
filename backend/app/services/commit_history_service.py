"""Commit history ingestion and decision classification services."""

import logging
import re
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

logger = logging.getLogger(__name__)

# Decision categories
CATEGORIES = [
    "bugfix",
    "feature",
    "refactor",
    "performance",
    "documentation",
    "test",
    "infrastructure",
    "dependency",
    "style",
    "other",
]

# Pattern-based classifier keywords
_CATEGORY_PATTERNS: dict[str, list[str]] = {
    "bugfix": ["fix", "bug", "hotfix", "patch", "resolve", "issue", "correct"],
    "feature": ["feat", "add", "new", "implement", "introduce", "support"],
    "refactor": ["refactor", "restructure", "rename", "move", "extract", "simplify", "clean"],
    "performance": ["perf", "optim", "speed", "cache", "fast", "improve performance"],
    "documentation": ["doc", "readme", "comment", "changelog"],
    "test": ["test", "spec", "coverage", "mock", "assert"],
    "infrastructure": ["ci", "cd", "docker", "deploy", "build", "pipeline", "config"],
    "dependency": ["dep", "upgrade", "bump", "update dependency", "package"],
    "style": ["style", "format", "lint", "prettier", "eslint"],
}


@dataclass
class CommitRecord:
    """Parsed commit metadata."""

    commit_id: str
    repository_id: str
    author: str
    timestamp: str
    message: str
    touched_files: list[str]
    touched_modules: list[str]


@dataclass
class CommitDecision:
    """Classified commit with decision category."""

    id: str
    commit_id: str
    repository_id: str
    timestamp: str
    category: str
    confidence: float
    summary: str
    touched_modules: list[str]


class CommitIngestionService:
    """Ingests commits from git history."""

    def ingest_commits(
        self,
        repo_root: Path,
        repository_id: str,
        max_commits: int = 200,
        since_months: int = 6,
    ) -> list[CommitRecord]:
        """Read commit history from a git repository.

        Args:
            repo_root: Path to the repository root
            repository_id: Repository identifier
            max_commits: Maximum number of commits to ingest
            since_months: How many months back to look

        Returns:
            List of CommitRecord objects
        """
        try:
            since_date = datetime.now().strftime("%Y-%m-%d")
            # Calculate date N months ago
            from datetime import timedelta

            since_date = (datetime.now() - timedelta(days=since_months * 30)).strftime(
                "%Y-%m-%d"
            )

            # Get commits with files changed
            result = subprocess.run(
                [
                    "git",
                    "log",
                    f"--since={since_date}",
                    f"-n{max_commits}",
                    "--pretty=format:%H|%an|%aI|%s",
                    "--name-only",
                ],
                cwd=repo_root,
                capture_output=True,
                text=True,
                check=False,
            )

            if result.returncode != 0:
                logger.warning("git log failed: %s", result.stderr)
                return []

            return self._parse_git_log(result.stdout, repository_id, repo_root)

        except Exception as exc:
            logger.error("Failed to ingest commits: %s", exc)
            return []

    def _parse_git_log(
        self, log_output: str, repository_id: str, repo_root: Path
    ) -> list[CommitRecord]:
        """Parse git log output into CommitRecord objects."""
        commits: list[CommitRecord] = []
        lines = log_output.strip().split("\n")

        current_commit: dict[str, Any] | None = None
        current_files: list[str] = []

        for line in lines:
            if "|" in line and len(line.split("|")) >= 4:
                # Save previous commit
                if current_commit:
                    modules = self._extract_modules(current_files)
                    commits.append(
                        CommitRecord(
                            commit_id=current_commit["hash"],
                            repository_id=repository_id,
                            author=current_commit["author"],
                            timestamp=current_commit["timestamp"],
                            message=current_commit["message"],
                            touched_files=current_files,
                            touched_modules=modules,
                        )
                    )

                parts = line.split("|", 3)
                current_commit = {
                    "hash": parts[0],
                    "author": parts[1],
                    "timestamp": parts[2],
                    "message": parts[3] if len(parts) > 3 else "",
                }
                current_files = []
            elif line.strip() and current_commit:
                # File path line
                current_files.append(line.strip())

        # Don't forget last commit
        if current_commit:
            modules = self._extract_modules(current_files)
            commits.append(
                CommitRecord(
                    commit_id=current_commit["hash"],
                    repository_id=repository_id,
                    author=current_commit["author"],
                    timestamp=current_commit["timestamp"],
                    message=current_commit["message"],
                    touched_files=current_files,
                    touched_modules=modules,
                )
            )

        return commits

    def _extract_modules(self, files: list[str]) -> list[str]:
        """Extract module paths from list of changed files."""
        modules: set[str] = set()
        for filepath in files:
            if not filepath.endswith(".py"):
                continue
            parts = Path(filepath).parts
            if len(parts) > 1:
                # Use parent directory as module
                module = ".".join(parts[:-1])
            else:
                module = Path(filepath).stem
            modules.add(module)
        return sorted(modules)


class DecisionClassificationService:
    """Classifies commit messages into decision categories."""

    def classify_commit(self, commit: CommitRecord) -> CommitDecision:
        """Classify a single commit's intent.

        Returns:
            CommitDecision with category and confidence score
        """
        message_lower = commit.message.lower()

        # Score each category
        scores: dict[str, float] = {}
        for category, keywords in _CATEGORY_PATTERNS.items():
            score = 0.0
            for keyword in keywords:
                if keyword in message_lower:
                    score += 1.0
            scores[category] = score

        # Determine best category
        best_category = max(scores, key=scores.get)  # type: ignore[arg-type]
        best_score = scores[best_category]

        if best_score == 0:
            best_category = "other"
            confidence = 0.3
        else:
            # Normalize confidence (0.5 to 1.0 range)
            confidence = min(0.5 + (best_score / 5.0) * 0.5, 1.0)

        return CommitDecision(
            id=str(uuid4()),
            commit_id=commit.commit_id,
            repository_id=commit.repository_id,
            timestamp=commit.timestamp,
            category=best_category,
            confidence=confidence,
            summary=commit.message[:200],
            touched_modules=commit.touched_modules,
        )

    def classify_batch(self, commits: list[CommitRecord]) -> list[CommitDecision]:
        """Classify a batch of commits."""
        return [self.classify_commit(c) for c in commits]
