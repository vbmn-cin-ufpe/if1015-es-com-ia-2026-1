"""Unit tests for HotspotService — scoring algorithm and normalisation.

Strategy: patch ChurnAnalyzer and ComplexityAnalyzer so tests run without
a real git repository or radon/tree-sitter installed.  All assertions target
the pure arithmetic of the normalisation formula:

    score = round((norm_churn * 0.5 + norm_complexity * 0.5) * 100, 2)
"""

from pathlib import Path
from unittest.mock import patch

import pytest

from app.services.hotspot_service import FileHotspot, HotspotService


# ── Helpers ───────────────────────────────────────────────────────────────────


def _seed_files(root: Path, names: list[str]) -> None:
    """Write minimal stub files so rglob() can discover them."""
    for name in names:
        (root / name).write_text("pass\n", encoding="utf-8")


def _run(
    tmp_path: Path,
    churn_by_name: dict[str, int],
    metrics_by_name: dict[str, dict],
    top_n: int = 30,
) -> list[FileHotspot]:
    """
    Create stub files, patch both analysers and return HotspotService.analyse().
    """
    _seed_files(tmp_path, list(churn_by_name.keys()))

    with patch("app.services.hotspot_service.ChurnAnalyzer") as MockChurn, \
         patch("app.services.hotspot_service.ComplexityAnalyzer") as MockCC:

        MockChurn.return_value.analyze_file_churn.side_effect = (
            lambda path, months: churn_by_name.get(path.name, 0)
        )
        MockCC.return_value.analyze_file.side_effect = (
            lambda path: metrics_by_name.get(
                path.name, {"complexity": 0, "loc": 0}
            )
        )

        svc = HotspotService(churn_months=6, top_n=top_n)
        return svc.analyse(tmp_path)


# ── Scoring formula ───────────────────────────────────────────────────────────


class TestScoringFormula:
    def test_max_churn_and_complexity_gives_100(self, tmp_path):
        """File with both max metrics must score exactly 100."""
        result = _run(
            tmp_path,
            churn_by_name={"high.py": 10, "low.py": 5},
            metrics_by_name={
                "high.py": {"complexity": 20, "loc": 100},
                "low.py": {"complexity": 10, "loc": 50},
            },
        )
        high = next(r for r in result if r.relative_path.endswith("high.py"))
        assert high.hotspot_score == 100.0

    def test_formula_equal_weight(self, tmp_path):
        """
        a: churn=10, cc=5  → norm_churn=1.0, norm_cc=0.5 → score=75
        b: churn=5,  cc=10 → norm_churn=0.5, norm_cc=1.0 → score=75
        Both files have identical score despite different raw values.
        """
        result = _run(
            tmp_path,
            churn_by_name={"a.py": 10, "b.py": 5},
            metrics_by_name={
                "a.py": {"complexity": 5, "loc": 50},
                "b.py": {"complexity": 10, "loc": 50},
            },
        )
        a = next(r for r in result if r.relative_path.endswith("a.py"))
        b = next(r for r in result if r.relative_path.endswith("b.py"))
        assert abs(a.hotspot_score - 75.0) < 0.1
        assert abs(b.hotspot_score - 75.0) < 0.1

    def test_min_churn_min_complexity_scores_low(self, tmp_path):
        """
        low: churn=1, cc=1 (both at 1/10 of max)
        → score = (0.1*0.5 + 0.1*0.5) * 100 = 10
        """
        result = _run(
            tmp_path,
            churn_by_name={"low.py": 1, "high.py": 10},
            metrics_by_name={
                "low.py": {"complexity": 1, "loc": 10},
                "high.py": {"complexity": 10, "loc": 100},
            },
        )
        low = next(r for r in result if r.relative_path.endswith("low.py"))
        assert abs(low.hotspot_score - 10.0) < 0.1

    def test_single_file_always_scores_100(self, tmp_path):
        """With one file it is both the min and max → score = 100."""
        result = _run(
            tmp_path,
            churn_by_name={"only.py": 3},
            metrics_by_name={"only.py": {"complexity": 7, "loc": 40}},
        )
        assert len(result) == 1
        assert result[0].hotspot_score == 100.0

    def test_zero_churn_nonzero_complexity_included(self, tmp_path):
        """File with 0 churn but real complexity must NOT be excluded."""
        result = _run(
            tmp_path,
            churn_by_name={"nocommit.py": 0},
            metrics_by_name={"nocommit.py": {"complexity": 8, "loc": 60}},
        )
        assert len(result) == 1

    def test_zero_complexity_nonzero_churn_included(self, tmp_path):
        """File with real churn but 0 complexity must NOT be excluded."""
        result = _run(
            tmp_path,
            churn_by_name={"nocc.py": 5},
            metrics_by_name={"nocc.py": {"complexity": 0, "loc": 20}},
        )
        assert len(result) == 1


# ── Filtering ─────────────────────────────────────────────────────────────────


class TestFiltering:
    def test_both_zero_metrics_excludes_file(self, tmp_path):
        """File where churn=0 AND complexity=0 must be excluded."""
        result = _run(
            tmp_path,
            churn_by_name={"dead.py": 0, "alive.py": 5},
            metrics_by_name={
                "dead.py": {"complexity": 0, "loc": 0},
                "alive.py": {"complexity": 3, "loc": 30},
            },
        )
        names = [r.relative_path for r in result]
        assert not any("dead.py" in n for n in names)
        assert any("alive.py" in n for n in names)

    def test_top_n_limits_result_count(self, tmp_path):
        """top_n=3 must return at most 3 results even with 10 files."""
        files = {f"f{i}.py": i + 1 for i in range(10)}
        result = _run(
            tmp_path,
            churn_by_name=files,
            metrics_by_name={k: {"complexity": 1, "loc": 10} for k in files},
            top_n=3,
        )
        assert len(result) <= 3

    def test_top_n_returns_highest_scored_files(self, tmp_path):
        """top_n=2 must keep the two highest scoring files."""
        result = _run(
            tmp_path,
            churn_by_name={"a.py": 10, "b.py": 5, "c.py": 1},
            metrics_by_name={
                "a.py": {"complexity": 10, "loc": 100},
                "b.py": {"complexity": 5, "loc": 50},
                "c.py": {"complexity": 1, "loc": 10},
            },
            top_n=2,
        )
        names = [r.relative_path for r in result]
        assert any("a.py" in n for n in names)
        assert any("b.py" in n for n in names)
        assert not any("c.py" in n for n in names)


# ── Ordering ──────────────────────────────────────────────────────────────────


class TestOrdering:
    def test_results_are_sorted_descending(self, tmp_path):
        """Hotspots must be returned highest score first."""
        result = _run(
            tmp_path,
            churn_by_name={"low.py": 1, "mid.py": 5, "high.py": 10},
            metrics_by_name={
                "low.py": {"complexity": 1, "loc": 10},
                "mid.py": {"complexity": 5, "loc": 30},
                "high.py": {"complexity": 10, "loc": 80},
            },
        )
        scores = [r.hotspot_score for r in result]
        assert scores == sorted(scores, reverse=True)

    def test_highest_file_is_first(self, tmp_path):
        result = _run(
            tmp_path,
            churn_by_name={"worst.py": 10, "best.py": 1},
            metrics_by_name={
                "worst.py": {"complexity": 10, "loc": 200},
                "best.py": {"complexity": 1, "loc": 10},
            },
        )
        assert result[0].relative_path.endswith("worst.py")


# ── Edge cases ────────────────────────────────────────────────────────────────


class TestEdgeCases:
    def test_empty_directory_returns_empty_list(self, tmp_path):
        """analyse() on an empty repo must return []."""
        svc = HotspotService()
        result = svc.analyse(tmp_path)
        assert result == []

    def test_filehotspot_fields_populated(self, tmp_path):
        """FileHotspot dataclass fields must be correctly filled."""
        result = _run(
            tmp_path,
            churn_by_name={"main.py": 7},
            metrics_by_name={"main.py": {"complexity": 4.0, "loc": 55}},
        )
        assert len(result) == 1
        h = result[0]
        assert h.churn == 7
        assert h.complexity == 4.0
        assert h.loc == 55
        assert h.language == "py"
        assert "main.py" in h.relative_path
        assert 0.0 <= h.hotspot_score <= 100.0

    def test_relative_path_uses_forward_slashes(self, tmp_path):
        """relative_path must use / (Unix-style) on all platforms."""
        sub = tmp_path / "src"
        sub.mkdir()
        result = _run(
            Path(tmp_path),
            churn_by_name={"a.py": 3},
            metrics_by_name={"a.py": {"complexity": 2, "loc": 20}},
        )
        for h in result:
            assert "\\" not in h.relative_path
