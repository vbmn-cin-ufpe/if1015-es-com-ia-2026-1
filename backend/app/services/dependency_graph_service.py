"""Dependency graph extraction and assembly services.

Uses tree-sitter for multi-language import parsing.
Python's built-in `ast` module is kept as a high-fidelity fallback for Python
(since radon is already a project dependency and ast gives exact symbol names).

Design:
  - DependencyExtractorService is the single public interface (unchanged signature).
  - _extract_imports_ts()  — generic tree-sitter path (all languages)
  - _extract_imports_py()  — Python-specific fallback via ast (more accurate)
  - OCP: new languages need only an entry in LanguageRegistry; no code changes here.
"""

import ast
import logging
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.services.language_registry import detect_language, parse_file

logger = logging.getLogger(__name__)

_EXCLUDED = {".git", "venv", ".venv", "__pycache__", "node_modules", "dist", "build", "vendor"}


def _path_to_module(file_path: Path, repo_root: Path) -> str:
    """Convert a file path to a dotted or slash-delimited module identifier."""
    try:
        relative = file_path.relative_to(repo_root)
        parts = list(relative.parts)
        if parts[-1] == "__init__.py":
            parts = parts[:-1]
        else:
            parts[-1] = parts[-1].rsplit(".", 1)[0]  # strip extension
        return ".".join(parts)
    except ValueError:
        return file_path.stem


def _is_internal(module_name: str, repo_root: Path) -> bool:
    """Check whether a module name refers to something inside the repository."""
    # Dotted name: check if first component exists as a directory or file
    top = module_name.split(".")[0].split("/")[0]
    return (repo_root / top).exists() or (repo_root / f"{top}.py").exists()


# ---------------------------------------------------------------------------
# Python-specific extraction via ast (precise symbol names)
# ---------------------------------------------------------------------------

def _extract_imports_py(file_path: Path, repo_root: Path) -> list[dict[str, str]]:
    """Extract import edges from a Python file using the builtin ast module."""
    try:
        content = file_path.read_text(encoding="utf-8", errors="ignore")
        tree = ast.parse(content)
    except (SyntaxError, UnicodeDecodeError):
        return []

    source = _path_to_module(file_path, repo_root)
    edges: list[dict[str, str]] = []

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                dep_type = "internal" if _is_internal(alias.name, repo_root) else "external"
                edges.append({"source": source, "target": alias.name, "type": dep_type})
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                dep_type = "internal" if _is_internal(node.module, repo_root) else "external"
                edges.append({"source": source, "target": node.module, "type": dep_type})

    return edges


# ---------------------------------------------------------------------------
# Generic tree-sitter extraction (all other languages)
# ---------------------------------------------------------------------------

def _text_of(node: Any) -> str:
    """Extract text content from a tree-sitter node."""
    try:
        return node.text.decode("utf-8", errors="ignore")
    except Exception:
        return ""


def _extract_imports_ts(file_path: Path, repo_root: Path) -> list[dict[str, str]]:
    """Extract import edges from any tree-sitter-supported file."""
    result = parse_file(file_path)
    if result is None:
        return []

    tree, lang_name = result
    source = _path_to_module(file_path, repo_root)
    edges: list[dict[str, str]] = []

    def _walk(node: Any) -> None:
        # Collect string literals that are direct children of import nodes
        if node.type in ("import_statement", "import_from_statement",
                         "import_declaration", "use_declaration",
                         "import_spec", "import_require_clause"):
            for child in node.children:
                raw = _text_of(child).strip().strip('"\'`')
                if raw and not raw.startswith(("(", ")", "{", "}", ",", ";")):
                    dep_type = "external" if raw.startswith((".", "/")) is False and "/" not in raw.split("/")[0] else "internal"
                    # Heuristic: relative paths ("./" "../") are internal
                    if raw.startswith((".", "/")):
                        dep_type = "internal"
                    edges.append({"source": source, "target": raw, "type": dep_type})
        for child in node.children:
            _walk(child)

    _walk(tree.root_node)
    return edges


# ---------------------------------------------------------------------------
# Public service (unchanged external interface)
# ---------------------------------------------------------------------------

class DependencyExtractorService:
    """Parses source imports and builds raw dependency edges.

    Supports Python (via ast) and all other languages registered in
    LanguageRegistry (via tree-sitter).  The external API is unchanged.
    """

    def extract_file_dependencies(
        self, file_path: Path, repo_root: Path
    ) -> list[dict[str, str]]:
        """Extract import dependencies from a single source file.

        Returns:
            List of edges: [{"source": "mod.path", "target": "other.mod", "type": "internal"|"external"}]
        """
        spec = detect_language(file_path)
        if spec is None:
            return []

        if spec.name == "python":
            return _extract_imports_py(file_path, repo_root)
        return _extract_imports_ts(file_path, repo_root)

    def extract_repository_dependencies(
        self, repo_root: Path, include_external: bool = False
    ) -> list[dict[str, str]]:
        """Extract all dependency edges from a repository (all supported languages).

        Args:
            repo_root: Root path of the repository.
            include_external: Whether to include 3rd-party import edges.

        Returns:
            List of all dependency edges.
        """
        all_edges: list[dict[str, str]] = []

        for f in repo_root.rglob("*"):
            if not f.is_file():
                continue
            if any(part in _EXCLUDED for part in f.parts):
                continue
            spec = detect_language(f)
            if spec is None:
                continue
            all_edges.extend(self.extract_file_dependencies(f, repo_root))

        if not include_external:
            all_edges = [e for e in all_edges if e["type"] == "internal"]

        return all_edges

    # ------------------------------------------------------------------
    # Helpers used by GraphOrchestrationService (unchanged signatures)
    # ------------------------------------------------------------------

    def _path_to_module(self, file_path: Path, repo_root: Path) -> str:
        return _path_to_module(file_path, repo_root)

    def _is_internal(self, module_name: str, repo_root: Path) -> bool:
        return _is_internal(module_name, repo_root)


    def _is_internal(self, module_name: str, repo_root: Path) -> bool:
        """Check if a module is internal to the repository."""
        parts = module_name.split(".")
        # Check if any prefix of the module exists as a package
        for i in range(1, len(parts) + 1):
            candidate = repo_root / "/".join(parts[:i])
            if candidate.exists() or candidate.with_suffix(".py").exists():
                return True
            # Also check as __init__.py
            if (candidate / "__init__.py").exists():
                return True
        return False


class GraphAssemblerService:
    """Normalizes edges into a full graph payload with nodes and metadata."""

    def assemble_graph(
        self,
        repository_id: str,
        edges: list[dict[str, str]],
    ) -> dict[str, Any]:
        """Assemble a graph payload from dependency edges.

        Returns:
            GraphPayload with nodes, edges, and metadata
        """
        snapshot_id = str(uuid4())

        # Deduplicate edges
        seen_edges: set[tuple[str, str, str]] = set()
        unique_edges: list[dict[str, Any]] = []
        for edge in edges:
            key = (edge["source"], edge["target"], edge["type"])
            if key not in seen_edges:
                seen_edges.add(key)
                unique_edges.append({
                    "id": str(uuid4()),
                    "source": edge["source"],
                    "target": edge["target"],
                    "type": edge["type"],
                })

        # Extract unique nodes
        node_names: set[str] = set()
        for edge in unique_edges:
            node_names.add(edge["source"])
            node_names.add(edge["target"])

        # Build nodes with in/out degree
        nodes: list[dict[str, Any]] = []
        for name in sorted(node_names):
            in_degree = sum(1 for e in unique_edges if e["target"] == name)
            out_degree = sum(1 for e in unique_edges if e["source"] == name)
            nodes.append({
                "id": name,
                "label": name.split(".")[-1],
                "module_path": name,
                "metrics": {
                    "in_degree": in_degree,
                    "out_degree": out_degree,
                    "total_degree": in_degree + out_degree,
                },
            })

        return {
            "repository_id": repository_id,
            "snapshot_id": snapshot_id,
            "node_count": len(nodes),
            "edge_count": len(unique_edges),
            "nodes": nodes,
            "edges": unique_edges,
        }

    def get_module_details(
        self,
        graph_payload: dict[str, Any],
        module_path: str,
    ) -> dict[str, Any] | None:
        """Get detailed dependencies for a specific module from a graph payload.

        Returns:
            Module metadata with inbound/outbound dependencies
        """
        nodes = graph_payload["nodes"]
        edges = graph_payload["edges"]

        node = next((n for n in nodes if n["module_path"] == module_path), None)
        if not node:
            return None

        inbound = [e for e in edges if e["target"] == module_path]
        outbound = [e for e in edges if e["source"] == module_path]

        return {
            "module_path": module_path,
            "label": node["label"],
            "metrics": node["metrics"],
            "inbound_dependencies": [
                {"source": e["source"], "type": e["type"]} for e in inbound
            ],
            "outbound_dependencies": [
                {"target": e["target"], "type": e["type"]} for e in outbound
            ],
        }
