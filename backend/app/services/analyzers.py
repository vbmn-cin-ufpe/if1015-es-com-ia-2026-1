"""Analyzers for extracting module-level metrics."""

import ast
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

try:
    from radon.complexity import cc_visit
    from radon.raw import analyze
except ImportError:
    cc_visit = None
    analyze = None
    logger.warning("radon not installed, complexity metrics will be unavailable")


class ComplexityAnalyzer:
    """Analyzes code complexity using cyclomatic complexity metrics."""

    def analyze_file(self, file_path: Path) -> dict[str, Any]:
        """Analyze complexity metrics for a single file.
        
        Returns:
            Dict with complexity, loc, lloc, sloc, comments
        """
        if not file_path.exists():
            return {"complexity": 0, "loc": 0, "lloc": 0, "sloc": 0, "comments": 0}
        
        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
            
            # Radon complexity analysis
            if cc_visit and analyze:
                complexity_results = cc_visit(content)
                raw_metrics = analyze(content)
                
                # Average complexity of all functions/methods
                avg_complexity = (
                    sum(item.complexity for item in complexity_results) / len(complexity_results)
                    if complexity_results
                    else 0
                )
                
                return {
                    "complexity": avg_complexity,
                    "max_complexity": max((item.complexity for item in complexity_results), default=0),
                    "loc": raw_metrics.loc,
                    "lloc": raw_metrics.lloc,
                    "sloc": raw_metrics.sloc,
                    "comments": raw_metrics.comments,
                }
            else:
                # Fallback: simple LOC count
                lines = content.splitlines()
                return {
                    "complexity": 0,
                    "max_complexity": 0,
                    "loc": len(lines),
                    "lloc": len([l for l in lines if l.strip()]),
                    "sloc": len([l for l in lines if l.strip() and not l.strip().startswith("#")]),
                    "comments": len([l for l in lines if l.strip().startswith("#")]),
                }
        except Exception as e:
            logger.warning(f"Error analyzing {file_path}: {e}")
            return {"complexity": 0, "loc": 0, "lloc": 0, "sloc": 0, "comments": 0}

    def analyze_module(self, module_files: list[Path]) -> dict[str, Any]:
        """Analyze complexity metrics for an entire module (multiple files).
        
        Returns aggregated metrics across all files in the module.
        """
        total_complexity = 0.0
        max_complexity = 0.0
        total_loc = 0
        total_lloc = 0
        total_sloc = 0
        total_comments = 0
        
        for file_path in module_files:
            metrics = self.analyze_file(file_path)
            total_complexity += metrics["complexity"]
            max_complexity = max(max_complexity, metrics.get("max_complexity", 0))
            total_loc += metrics["loc"]
            total_lloc += metrics["lloc"]
            total_sloc += metrics["sloc"]
            total_comments += metrics["comments"]
        
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
    """Analyzes coupling between modules by examining imports."""

    def analyze_file_coupling(self, file_path: Path, repo_root: Path) -> dict[str, Any]:
        """Analyze imports and dependencies for a file.
        
        Returns:
            Dict with import counts and dependency info
        """
        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
            tree = ast.parse(content)
            
            internal_imports = []
            external_imports = []
            
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if alias.name.startswith("app."):
                            internal_imports.append(alias.name)
                        else:
                            external_imports.append(alias.name)
                elif isinstance(node, ast.ImportFrom):
                    if node.module and node.module.startswith("app."):
                        internal_imports.append(node.module)
                    elif node.module:
                        external_imports.append(node.module)
            
            return {
                "internal_imports": len(set(internal_imports)),
                "external_imports": len(set(external_imports)),
                "total_imports": len(set(internal_imports)) + len(set(external_imports)),
                "internal_modules": list(set(internal_imports)),
            }
        except Exception as e:
            logger.warning(f"Error analyzing coupling for {file_path}: {e}")
            return {
                "internal_imports": 0,
                "external_imports": 0,
                "total_imports": 0,
                "internal_modules": [],
            }

    def analyze_module_coupling(self, module_files: list[Path], repo_root: Path) -> dict[str, Any]:
        """Analyze coupling for an entire module.
        
        Returns:
            Aggregated coupling metrics
        """
        total_internal = 0
        total_external = 0
        all_dependencies = set()
        
        for file_path in module_files:
            metrics = self.analyze_file_coupling(file_path, repo_root)
            total_internal += metrics["internal_imports"]
            total_external += metrics["external_imports"]
            all_dependencies.update(metrics["internal_modules"])
        
        return {
            "total_internal_imports": total_internal,
            "total_external_imports": total_external,
            "avg_imports_per_file": (total_internal + total_external) / len(module_files) if module_files else 0,
            "unique_dependencies": len(all_dependencies),
            "dependency_list": sorted(list(all_dependencies)),
        }
