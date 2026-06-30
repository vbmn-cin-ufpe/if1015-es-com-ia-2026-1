"""Tech Debt service — wraps HotspotService, persists snapshots, and generates LLM summaries."""

import logging
from dataclasses import asdict
from pathlib import Path
from typing import Any

from app.infrastructure.tech_debt_repository import TechDebtRepository, TechDebtSnapshot
from app.ports import LLMPort
from app.services.hotspot_service import FileHotspot, HotspotService

logger = logging.getLogger(__name__)

# PROMPT-007: Tech Debt Analysis with Code Quality Standards
_SYSTEM_PROMPT_007 = (
    "Voce e especialista em qualidade de software e arquitetura. "
    "Analise dados de divida tecnica e responda em Portugues do Brasil de forma CONCISA. "
    "Use Markdown simples: **negrito**, bullet com -, listas numeradas. Limite: ~450 tokens."
)


class TechDebtService:
    """Orchestrates hotspot analysis, saves snapshots, and exposes history."""

    def __init__(
        self,
        tech_debt_repo: TechDebtRepository,
        llm_client: LLMPort | None = None,
    ) -> None:
        self._repo = tech_debt_repo
        self._llm = llm_client

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def take_snapshot(self, repository_id: str, repo_root: Path) -> TechDebtSnapshot:
        """Run hotspot analysis and persist a snapshot (called during indexation, no LLM)."""
        return self._build_snapshot(repository_id, repo_root, with_llm=False)

    def analyse_and_save(self, repository_id: str, repo_root: Path) -> TechDebtSnapshot:
        """Full analysis with LLM summary — called via POST /tech-debt/analyse endpoint."""
        return self._build_snapshot(repository_id, repo_root, with_llm=True)

    def get_history(self, repository_id: str, limit: int = 30) -> list[TechDebtSnapshot]:
        """Return the snapshot timeline for *repository_id* (oldest-first)."""
        return self._repo.list_history(repository_id, limit=limit)

    # ------------------------------------------------------------------
    # Internal — snapshot construction
    # ------------------------------------------------------------------

    def _build_snapshot(
        self, repository_id: str, repo_root: Path, with_llm: bool
    ) -> TechDebtSnapshot:
        hs = HotspotService(top_n=50)
        hotspots = hs.analyse(repo_root)

        if not hotspots:
            snapshot = TechDebtRepository.create(
                repository_id=repository_id,
                avg_score=0.0,
                total_files=0,
                critical_count=0,
                high_count=0,
                top_files=[],
                debt_trend=self._compute_trend(repository_id, 0.0),
            )
            self._repo.save(snapshot)
            return snapshot

        # --- Basic metrics ---
        avg_score = round(sum(h.hotspot_score for h in hotspots) / len(hotspots), 2)
        critical = sum(1 for h in hotspots if h.hotspot_score >= 75)
        high = sum(1 for h in hotspots if 50 <= h.hotspot_score < 75)
        top_files = [asdict(h) for h in hotspots[:20]]

        # --- Extended metrics derived from hotspot data (fast) ---
        avg_complexity = round(
            sum(h.complexity for h in hotspots) / len(hotspots), 2
        )
        avg_churn = round(sum(h.churn for h in hotspots) / len(hotspots), 2)
        avg_loc = round(sum(h.loc for h in hotspots) / len(hotspots), 1)

        # --- File-level I/O metrics for top files (slightly slower) ---
        comment_ratio, coupling_score = self._compute_file_metrics(hotspots[:10], repo_root)

        # --- Debt breakdown and trend ---
        debt_breakdown = self._compute_debt_breakdown(
            avg_complexity, avg_churn, avg_loc, coupling_score, comment_ratio
        )
        trend = self._compute_trend(repository_id, avg_score)

        # --- Optional LLM summary ---
        llm_summary = ""
        if with_llm:
            llm_summary = self._generate_llm_summary(
                hotspots[:10], avg_complexity, avg_churn, avg_loc, coupling_score, trend
            )

        snapshot = TechDebtRepository.create(
            repository_id=repository_id,
            avg_score=avg_score,
            total_files=len(hotspots),
            critical_count=critical,
            high_count=high,
            top_files=top_files,
            avg_complexity=avg_complexity,
            avg_churn=avg_churn,
            avg_loc=avg_loc,
            comment_ratio=comment_ratio,
            coupling_score=coupling_score,
            debt_trend=trend,
            llm_summary=llm_summary,
            debt_breakdown=debt_breakdown,
        )
        self._repo.save(snapshot)
        logger.info(
            "[tech-debt] snapshot saved | repo=%s | avg=%.1f | critical=%d | trend=%s | llm=%s",
            repository_id, avg_score, critical, trend, "yes" if llm_summary else "no",
        )
        return snapshot

    # ------------------------------------------------------------------
    # Internal — helpers
    # ------------------------------------------------------------------

    def _compute_file_metrics(
        self, hotspots: list[FileHotspot], repo_root: Path
    ) -> tuple[float, float]:
        """Compute comment_ratio and coupling_score from top-N files."""
        from app.services.analyzers import ComplexityAnalyzer, CouplingAnalyzer

        complexity_a = ComplexityAnalyzer()
        coupling_a = CouplingAnalyzer()

        total_comments = 0
        total_loc = 0
        total_coupling = 0.0
        n = 0

        for h in hotspots:
            fp = Path(h.file_path)
            if not fp.exists():
                continue
            try:
                cm = complexity_a.analyze_file(fp)
                comments = cm.get("comments", 0)
                loc = cm.get("loc", h.loc) or 1
                total_comments += comments
                total_loc += loc

                cp = coupling_a.analyze_file_coupling(fp, repo_root)
                total_coupling += cp.get("total_imports", 0)
                n += 1
            except Exception as exc:
                logger.debug("File metrics error for %s: %s", h.relative_path, exc)

        if n == 0:
            return 0.0, 0.0

        comment_ratio = round(total_comments / total_loc if total_loc > 0 else 0.0, 3)
        avg_coupling = round(total_coupling / n, 2)
        return comment_ratio, avg_coupling

    def _compute_debt_breakdown(
        self,
        avg_complexity: float,
        avg_churn: float,
        avg_loc: float,
        coupling_score: float,
        comment_ratio: float,
    ) -> dict[str, float]:
        """Map raw metrics to 0-100 debt scores per category."""
        # Complexity: CC=1 simple, CC=15 critical → normalize over 20
        complexity_debt = min(100.0, avg_complexity / 20.0 * 100)
        # Churn: 0 inactive, 30+ very hot → normalize over 30
        churn_debt = min(100.0, avg_churn / 30.0 * 100)
        # Size: 300+ LOC/file is large → normalize over 400
        size_debt = min(100.0, avg_loc / 400.0 * 100)
        # Coupling: 15+ imports per file is high → normalize over 20
        coupling_debt = min(100.0, coupling_score / 20.0 * 100)
        # Documentation: low comment ratio = high debt; scale comment_ratio 0-0.2 to 0-100
        docs_debt = max(0.0, (1.0 - min(1.0, comment_ratio * 5.0)) * 100)

        return {
            "complexity": round(complexity_debt, 1),
            "churn": round(churn_debt, 1),
            "size": round(size_debt, 1),
            "coupling": round(coupling_debt, 1),
            "documentation": round(docs_debt, 1),
        }

    def _compute_trend(self, repository_id: str, current_score: float) -> str:
        """Compare current score against the previous snapshot to determine trend."""
        history = self._repo.list_history(repository_id, limit=3)
        if not history:
            return "stable"
        prev_score = history[-1].avg_score
        delta = current_score - prev_score
        if delta < -2.0:
            return "improving"
        if delta > 2.0:
            return "degrading"
        return "stable"

    def _generate_llm_summary(
        self,
        hotspots: list[FileHotspot],
        avg_complexity: float,
        avg_churn: float,
        avg_loc: float,
        coupling: float,
        trend: str,
    ) -> str:
        """Generate AI analysis using PROMPT-007 (code quality standards evaluation)."""
        if not self._llm:
            return ""

        trend_label = {
            "improving": "melhorando",
            "degrading": "degradando",
            "stable": "estavel",
        }.get(trend, "estavel")

        files_lines = "\n".join(
            f"- {h.relative_path} | score: {h.hotspot_score:.0f} | CC: {h.complexity:.1f}"
            f" | churn: {h.churn} commits | {h.loc} LOC"
            for h in hotspots[:8]
        )

        user_prompt = (
            f"Score medio de divida: {sum(h.hotspot_score for h in hotspots) / max(len(hotspots), 1):.1f}/100 | "
            f"Tendencia: {trend_label}\n"
            f"CC media: {avg_complexity:.1f} | Churn medio: {avg_churn:.1f} commits/arquivo | "
            f"LOC medio: {avg_loc:.0f} | Acoplamento: {coupling:.1f} imports/arquivo\n\n"
            f"Arquivos criticos analisados:\n{files_lines}\n\n"
            "Avalie considerando: Clean Code, SOLID, DRY, KISS, YAGNI, Clean Architecture e Design Patterns.\n\n"
            "Responda neste formato exato:\n"
            "**Score de Divida:** [0-100] - [2 frases de justificativa]\n\n"
            "**Principais Problemas:**\n"
            "- [Categoria SOLID/Clean Code/etc]: [descricao com arquivo de exemplo]\n"
            "- [Categoria]: [descricao]\n"
            "- [Categoria]: [descricao]\n\n"
            "**Acoes Priorizadas:**\n"
            "1. [acao concreta] - Impacto: alto/medio/baixo\n"
            "2. [acao concreta] - Impacto: alto/medio/baixo\n"
            "3. [acao concreta] - Impacto: alto/medio/baixo\n\n"
            f"**Diagnostico:** {trend_label} - [1 frase explicando o motivo]"
        )

        try:
            return self._llm.generate_raw(user_prompt, _SYSTEM_PROMPT_007)
        except Exception as exc:
            logger.warning("[tech-debt] LLM summary failed: %s", exc)
            return ""
