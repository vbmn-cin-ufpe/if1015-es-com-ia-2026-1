"""Ingestion service — collects source files from a repository.

Supports all languages registered in LanguageRegistry.
Backwards-compatible: collect_python_files() kept as a convenience alias.
"""

import logging
from pathlib import Path

from app.services.language_registry import LanguageSpec, all_languages, detect_repo_languages

logger = logging.getLogger(__name__)

# Directories that never contain useful source code for search/analysis
_EXCLUDED_DIRS = {
    ".git", "node_modules", "venv", ".venv", "__pycache__",
    "dist", "build", "vendor", "target",          # compiled output
    ".next", ".nuxt", ".svelte-kit",               # framework caches
    "coverage", ".nyc_output", ".pytest_cache",    # test reports
    "fixtures", "testdata", "test-data",            # test fixtures
    "migrations",                                   # DB migrations (rarely need semantic search)
    ".idea", ".vscode", ".github",                 # IDE/CI config
}

# File suffixes that are always machine-generated or binary
_EXCLUDED_SUFFIXES = {
    ".min.js", ".min.css",   # minified
    ".map",                  # source maps
    ".lock",                 # lockfiles  (package-lock, yarn.lock, Cargo.lock, go.sum)
    ".sum",                  # go.sum
    ".pb.go", "_pb2.py",     # protobuf generated
    ".generated.ts",         # generated TS
    ".d.ts",                 # TypeScript declaration files (rarely useful for semantic search)
}

# Exact filenames to skip
_EXCLUDED_FILENAMES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "Cargo.lock", "go.sum", "poetry.lock", "Pipfile.lock",
    "composer.lock",
}


class IngestionService:
    """Collects source files for indexing.

    By default collects *all* supported languages found in the repository.
    Pass ``languages`` to restrict to a specific subset.
    """

    def collect_files(
        self,
        repo_path: Path,
        languages: list[str] | None = None,
        max_file_size_kb: int = 200,
    ) -> list[Path]:
        """Return all source files for the given languages (or all if None).

        Skips:
        - Excluded directories (node_modules, dist, build, …)
        - Machine-generated / minified files (.min.js, .lock, .map, …)
        - Files larger than *max_file_size_kb* (prevents indexing giant generated files)

        Args:
            repo_path: Root of the cloned repository.
            languages: Optional list of canonical language names, e.g. ["python", "go"].
                       When None, collects files for every registered language.
            max_file_size_kb: Maximum allowed file size in KB.

        Returns:
            Sorted list of matching Path objects.
        """
        specs: list[LanguageSpec] = all_languages()
        if languages:
            lang_set = set(languages)
            specs = [s for s in specs if s.name in lang_set]

        extensions = {ext for spec in specs for ext in spec.extensions}
        max_bytes = max_file_size_kb * 1024
        files: list[Path] = []
        skipped_dir = skipped_suffix = skipped_name = skipped_size = 0

        for f in repo_path.rglob("*"):
            if not f.is_file():
                continue

            # ── Directory filter ──────────────────────────────────────
            rel_parts = set(f.relative_to(repo_path).parts[:-1])  # exclude filename
            if rel_parts & _EXCLUDED_DIRS:
                skipped_dir += 1
                continue

            # ── Extension filter ──────────────────────────────────────
            if f.suffix.lower() not in extensions:
                continue

            # ── Filename / generated-file filter ─────────────────────
            fname = f.name
            if fname in _EXCLUDED_FILENAMES:
                skipped_name += 1
                continue
            # check compound suffixes like .min.js, .pb.go
            name_lower = fname.lower()
            if any(name_lower.endswith(s) for s in _EXCLUDED_SUFFIXES):
                skipped_suffix += 1
                continue

            # ── Size filter ───────────────────────────────────────────
            try:
                if f.stat().st_size > max_bytes:
                    skipped_size += 1
                    logger.debug("skip large file | path=%s | size=%.1fKB", f, f.stat().st_size / 1024)
                    continue
            except OSError:
                continue

            files.append(f)

        logger.info(
            "collect_files | found=%d | skipped(dir=%d name=%d suffix=%d size=%d)",
            len(files), skipped_dir, skipped_name, skipped_suffix, skipped_size,
        )
        return sorted(files)

    # ------------------------------------------------------------------
    # Backwards-compatible alias used by existing callers
    # ------------------------------------------------------------------

    def collect_python_files(self, repo_path: Path) -> list[Path]:
        """Collect only Python files (legacy alias for collect_files)."""
        return self.collect_files(repo_path, languages=["python"])

    # ------------------------------------------------------------------
    # Discovery helpers
    # ------------------------------------------------------------------

    def detect_languages(self, repo_path: Path) -> dict[str, int]:
        """Return {language_name: file_count} for the repository."""
        counts = detect_repo_languages(repo_path)
        logger.info("detect_languages | root=%s | result=%s", repo_path, counts)
        return counts

