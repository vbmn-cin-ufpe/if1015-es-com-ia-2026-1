"""Analyzers for extracting module-level metrics.

ComplexityAnalyzer:
  - Python files: uses radon (cyclomatic complexity, raw metrics) — high fidelity.
  - Other languages: uses tree-sitter AST branch-node counting — same concept,
    language-agnostic.  Falls back to LOC-based stub when grammar is unavailable.

ChurnAnalyzer: language-agnostic (git log on any file).
CouplingAnalyzer: uses tree-sitter for all languages; ast fallback for Python.

Design notes:
  - DRY: shared _loc_metrics() computes LOC/SLOC/comments for any text.
  - OCP: adding a new language only requires updating LanguageRegistry.
  - No breaking changes to existing public method signatures.
"""

import ast
import logging
from pathlib import Path
from typing import Any

from app.services.language_registry import count_branch_nodes, detect_language, parse_file

logger = logging.getLogger(__name__)

try:
    from radon.complexity import cc_visit
    from radon.raw import analyze
except ImportError:
    cc_visit = None
    analyze = None
    logger.warning("radon not installed, Python complexity will use tree-sitter fallback")


# ---------------------------------------------------------------------------
# Shared helper
# ---------------------------------------------------------------------------

def _loc_metrics(content: str, comment_prefixes: tuple[str, ...]) -> dict[str, int]:
    """Compute LOC / SLOC / comment counts for any source text."""
    lines = content.splitlines()
    loc = len(lines)
    non_empty = [l for l in lines if l.strip()]
    comments = [l for l in non_empty if any(l.strip().startswith(p) for p in comment_prefixes)]
    sloc = len(non_empty) - len(comments)
    return {"loc": loc, "lloc": len(non_empty), "sloc": max(sloc, 0), "comments": len(comments)}


class ComplexityAnalyzer:
    """Analyzes code complexity — Python via radon, other languages via tree-sitter."""

    def analyze_file(self, file_path: Path) -> dict[str, Any]:
        """Analyze complexity metrics for a single file.

        Returns:
            Dict with complexity, loc, lloc, sloc, comments.
        """
        if not file_path.exists():
            return {"complexity": 0, "max_complexity": 0, "loc": 0, "lloc": 0, "sloc": 0, "comments": 0}

        spec = detect_language(file_path)
        comment_prefixes = spec.comment_prefixes if spec else ("#",)

        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
            lm = _loc_metrics(content, comment_prefixes)

            if spec and spec.name == "python" and cc_visit and analyze:
                return self._analyze_python_radon(content, lm)

            # tree-sitter branch counting (any language)
            result = parse_file(file_path)
            if result is not None:
                tree, lang_name = result
                branch_count = count_branch_nodes(tree, lang_name)
                # Approximate McCabe: 1 + branch_count (per-file, not per-function)
                complexity = 1.0 + branch_count
                return {**lm, "complexity": complexity, "max_complexity": complexity}

            # Final fallback: LOC only
            return {**lm, "complexity": 0, "max_complexity": 0}

        except Exception as e:
            logger.warning("Error analyzing %s: %s", file_path, e)
            return {"complexity": 0, "max_complexity": 0, "loc": 0, "lloc": 0, "sloc": 0, "comments": 0}

    def _analyze_python_radon(self, content: str, lm: dict[str, int]) -> dict[str, Any]:
        complexity_results = cc_visit(content)
        raw_metrics = analyze(content)
        avg = (
            sum(item.complexity for item in complexity_results) / len(complexity_results)
            if complexity_results else 0
        )
        return {
            "complexity": avg,
            "max_complexity": max((item.complexity for item in complexity_results), default=0),
            "loc": raw_metrics.loc,
            "lloc": raw_metrics.lloc,
            "sloc": raw_metrics.sloc,
            "comments": raw_metrics.comments,
        }

    def analyze_module(self, module_files: list[Path]) -> dict[str, Any]:
        """Aggregate complexity metrics across all files in a module."""
        total_complexity = 0.0
        max_complexity = 0.0
        total_loc = total_lloc = total_sloc = total_comments = 0

        for file_path in module_files:
            m = self.analyze_file(file_path)
            total_complexity += m["complexity"]
            max_complexity = max(max_complexity, m.get("max_complexity", 0))
            total_loc += m["loc"]
            total_lloc += m["lloc"]
            total_sloc += m["sloc"]
            total_comments += m["comments"]

        avg_complexity = total_complexity / len(module_files) if module_files else 0

        return {
            "avg_complexity": avg_complexity,
            "max_complexity": max_complexity,
            "total_loc": total_loc,
            "total_lloc": total_lloc,
            "total_sloc": total_sloc,
            "total_comments": total_comments,
            "file_count": len(module_files),
        }



class ChurnAnalyzer:
    """Analyzes code churn (change frequency) from git history."""

    def __init__(self, repo_path: Path):
        self.repo_path = repo_path

    def analyze_file_churn(self, file_path: Path, months: int = 6) -> int:
        """Count commits that touched this file in the last N months.
        
        Args:
            file_path: Path to the file (relative to repo root)
            months: Number of months to look back
            
        Returns:
            Number of commits
        """
        try:
            import subprocess
            from datetime import datetime, timedelta
            
            since_date = (datetime.now() - timedelta(days=months * 30)).strftime("%Y-%m-%d")
            relative_path = file_path.relative_to(self.repo_path)
            
            result = subprocess.run(
                ["git", "log", f"--since={since_date}", "--oneline", "--", str(relative_path)],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                check=False,
            )
            
            if result.returncode == 0:
                return len(result.stdout.strip().splitlines())
            return 0
        except Exception as e:
            logger.warning(f"Error analyzing churn for {file_path}: {e}")
            return 0

    def analyze_module_churn(self, module_files: list[Path], months: int = 6) -> dict[str, Any]:
        """Analyze churn for an entire module.
        
        Returns:
            Dict with total commits, avg commits per file, max commits
        """
        churns = [self.analyze_file_churn(f, months) for f in module_files]
        
        return {
            "total_commits": sum(churns),
            "avg_commits_per_file": sum(churns) / len(churns) if churns else 0,
            "max_commits": max(churns) if churns else 0,
        }


class CouplingAnalyzer:
    """Analyzes coupling between modules by examining import statements.

    Uses ast for Python (precise module names) and tree-sitter for everything
    else (string literals extracted from import nodes).
    """

    def analyze_file_coupling(self, file_path: Path, repo_root: Path) -> dict[str, Any]:
        """Analyze imports and dependencies for a file."""
        spec = detect_language(file_path)
        if spec is None:
            return {"internal_imports": 0, "external_imports": 0, "total_imports": 0, "internal_modules": []}

        if spec.name == "python":
            return self._coupling_python(file_path, repo_root)
        return self._coupling_ts(file_path, repo_root)

    def _coupling_python(self, file_path: Path, repo_root: Path) -> dict[str, Any]:
        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
            tree = ast.parse(content)
        except Exception as e:
            logger.warning("Error analyzing coupling for %s: %s", file_path, e)
            return {"internal_imports": 0, "external_imports": 0, "total_imports": 0, "internal_modules": []}

        internal: set[str] = set()
        external: set[str] = set()

        repo_top = repo_root.name  # heuristic: repo folder name is the package root

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    (internal if alias.name.startswith(repo_top) else external).add(alias.name)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    (internal if node.module.startswith(repo_top) else external).add(node.module)

        return {
            "internal_imports": len(internal),
            "external_imports": len(external),
            "total_imports": len(internal) + len(external),
            "internal_modules": sorted(internal),
        }

    def _coupling_ts(self, file_path: Path, repo_root: Path) -> dict[str, Any]:
        result = parse_file(file_path)
        if result is None:
            return {"internal_imports": 0, "external_imports": 0, "total_imports": 0, "internal_modules": []}

        tree, _ = result
        internal: set[str] = set()
        external: set[str] = set()

        def _walk(node: Any) -> None:
            if node.type in ("import_statement", "import_from_statement",
                             "import_declaration", "use_declaration", "import_spec"):
                for child in node.children:
                    raw = ""
                    try:
                        raw = child.text.decode("utf-8", errors="ignore").strip().strip('"\'`')
                    except Exception:
                        pass
                    if raw and len(raw) > 1 and not raw[0] in "(){},;":
                        if raw.startswith((".", "/")):
                            internal.add(raw)
                        else:
                            external.add(raw)
            for child in node.children:
                _walk(child)

        _walk(tree.root_node)

        return {
            "internal_imports": len(internal),
            "external_imports": len(external),
            "total_imports": len(internal) + len(external),
            "internal_modules": sorted(internal),
        }

    def analyze_module_coupling(self, module_files: list[Path], repo_root: Path) -> dict[str, Any]:
        """Aggregate coupling metrics across all files in a module."""
        total_internal = 0
        total_external = 0
        all_dependencies: set[str] = set()

        for file_path in module_files:
            m = self.analyze_file_coupling(file_path, repo_root)
            total_internal += m["internal_imports"]
            total_external += m["external_imports"]
            all_dependencies.update(m["internal_modules"])

        return {
            "total_internal_imports": total_internal,
            "total_external_imports": total_external,
            "avg_imports_per_file": (total_internal + total_external) / len(module_files) if module_files else 0,
            "unique_dependencies": len(all_dependencies),
            "dependency_list": sorted(all_dependencies),
        }

