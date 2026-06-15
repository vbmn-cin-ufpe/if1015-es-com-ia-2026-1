"""Hotspot analysis service — ranks files by churn × complexity risk score."""

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.services.analyzers import ChurnAnalyzer, ComplexityAnalyzer
from app.services.language_registry import all_languages

logger = logging.getLogger(__name__)

_EXCLUDED_DIRS = {
    ".git", "venv", ".venv", "__pycache__", "node_modules",
    "dist", "build", "vendor", ".next", ".nuxt",
    "test", "tests", "__tests__", "spec", "specs",
    "fixture", "fixtures", "mock", "mocks",
    "migrations", ".github", ".idea", ".vscode",
}


@dataclass
class FileHotspot:
    """Risk score for a single source file."""
    file_path: str
    relative_path: str
    churn: int          # number of commits in the last N months
    complexity: float   # cyclomatic or branch-based complexity
    loc: int            # lines of code
    hotspot_score: float  # composite churn × complexity (0–100 normalised later)
    language: str


class HotspotService:
    """Identifies high-risk files by combining churn and complexity metrics."""

    def __init__(
        self,
        churn_months: int = 6,
        top_n: int = 30,
    ) -> None:
        self._churn_months = churn_months
        self._top_n = top_n
        self._complexity_analyzer = ComplexityAnalyzer()

    def analyse(self, repo_root: Path) -> list[FileHotspot]:
        """Scan *repo_root* and return the top-N hotspot files sorted by score."""
        extensions = {ext for spec in all_languages() for ext in spec.extensions}
        churn_analyzer = ChurnAnalyzer(repo_root)

        raw: list[dict[str, Any]] = []

        for file_path in repo_root.rglob("*"):
            if not file_path.is_file():
                continue
            if any(part in _EXCLUDED_DIRS for part in file_path.parts):
                continue
            if file_path.suffix.lower() not in extensions:
                continue

            try:
                relative = file_path.relative_to(repo_root)
            except ValueError:
                continue

            churn = churn_analyzer.analyze_file_churn(file_path, self._churn_months)
            metrics = self._complexity_analyzer.analyze_file(file_path)
            complexity = float(metrics.get("complexity", 0))
            loc = int(metrics.get("loc", 0))

            # Skip files never touched and with zero complexity (generated/empty)
            if churn == 0 and complexity == 0:
                continue

            raw.append({
                "file_path": str(file_path),
                "relative_path": str(relative).replace("\\", "/"),
                "churn": churn,
                "complexity": complexity,
                "loc": loc,
                "language": file_path.suffix.lstrip("."),
            })

        if not raw:
            return []

        # Normalise churn and complexity to [0, 1] then combine
        max_churn = max(r["churn"] for r in raw) or 1
        max_complexity = max(r["complexity"] for r in raw) or 1

        for r in raw:
            norm_churn = r["churn"] / max_churn
            norm_complexity = r["complexity"] / max_complexity
            # Equal weighting; adjust if needed
            r["hotspot_score"] = round((norm_churn * 0.5 + norm_complexity * 0.5) * 100, 2)

        raw.sort(key=lambda r: r["hotspot_score"], reverse=True)

        return [
            FileHotspot(
                file_path=r["file_path"],
                relative_path=r["relative_path"],
                churn=r["churn"],
                complexity=r["complexity"],
                loc=r["loc"],
                hotspot_score=r["hotspot_score"],
                language=r["language"],
            )
            for r in raw[: self._top_n]
        ]
