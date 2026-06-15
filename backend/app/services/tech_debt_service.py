"""Tech Debt service — wraps HotspotService and persists score snapshots."""

import logging
from dataclasses import asdict
from pathlib import Path

from app.infrastructure.tech_debt_repository import TechDebtRepository, TechDebtSnapshot
from app.services.hotspot_service import HotspotService

logger = logging.getLogger(__name__)


class TechDebtService:
    """Orchestrates hotspot analysis, saves snapshots, and exposes history."""

    def __init__(self, tech_debt_repo: TechDebtRepository) -> None:
        self._repo = tech_debt_repo

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def take_snapshot(self, repository_id: str, repo_root: Path) -> TechDebtSnapshot:
        """Run hotspot analysis and persist a snapshot for *repository_id*."""
        hs = HotspotService()
        hotspots = hs.analyse(repo_root)

        if not hotspots:
            snapshot = TechDebtRepository.create(
                repository_id=repository_id,
                avg_score=0.0,
                total_files=0,
                critical_count=0,
                high_count=0,
                top_files=[],
            )
            self._repo.save(snapshot)
            return snapshot

        avg_score = sum(h.hotspot_score for h in hotspots) / len(hotspots)
        critical = sum(1 for h in hotspots if h.hotspot_score >= 75)
        high = sum(1 for h in hotspots if 50 <= h.hotspot_score < 75)
        top_files = [asdict(h) for h in hotspots[:20]]

        snapshot = TechDebtRepository.create(
            repository_id=repository_id,
            avg_score=round(avg_score, 2),
            total_files=len(hotspots),
            critical_count=critical,
            high_count=high,
            top_files=top_files,
        )
        self._repo.save(snapshot)
        logger.info(
            "[tech-debt] snapshot saved | repo=%s | avg=%.1f | critical=%d",
            repository_id, avg_score, critical,
        )
        return snapshot

    def get_history(self, repository_id: str, limit: int = 30) -> list[TechDebtSnapshot]:
        """Return the snapshot timeline for *repository_id* (oldest-first)."""
        return self._repo.list_history(repository_id, limit=limit)
