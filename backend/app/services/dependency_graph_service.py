"""Dependency graph extraction and assembly services."""

import ast
import logging
from pathlib import Path
from typing import Any
from uuid import uuid4

logger = logging.getLogger(__name__)


class DependencyExtractorService:
    """Parses Python imports and builds raw dependency edges."""

    def extract_file_dependencies(
        self, file_path: Path, repo_root: Path
    ) -> list[dict[str, str]]:
        """Extract import dependencies from a single Python file.

        Returns:
            List of edges: [{"source": "module.path", "target": "other.module", "type": "internal"|"external"}]
        """
        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
            tree = ast.parse(content)
        except (SyntaxError, UnicodeDecodeError):
            return []

        source_module = self._path_to_module(file_path, repo_root)
        edges: list[dict[str, str]] = []

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    dep_type = "internal" if self._is_internal(alias.name, repo_root) else "external"
                    edges.append({"source": source_module, "target": alias.name, "type": dep_type})
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    dep_type = "internal" if self._is_internal(node.module, repo_root) else "external"
                    edges.append({"source": source_module, "target": node.module, "type": dep_type})

        return edges

    def extract_repository_dependencies(
        self, repo_root: Path, include_external: bool = False
    ) -> list[dict[str, str]]:
        """Extract all dependency edges from a repository.

        Args:
            repo_root: Root path of the repository
            include_external: Whether to include external (3rd party) imports

        Returns:
            List of all dependency edges
        """
        all_edges: list[dict[str, str]] = []

        for py_file in repo_root.rglob("*.py"):
            if any(part in py_file.parts for part in [".git", "venv", ".venv", "__pycache__", "node_modules"]):
                continue
            file_edges = self.extract_file_dependencies(py_file, repo_root)
            all_edges.extend(file_edges)

        if not include_external:
            all_edges = [e for e in all_edges if e["type"] == "internal"]

        return all_edges

    def _path_to_module(self, file_path: Path, repo_root: Path) -> str:
        """Convert file path to a dotted module path."""
        try:
            relative = file_path.relative_to(repo_root)
            parts = list(relative.parts)
            if parts[-1] == "__init__.py":
                parts = parts[:-1]
            else:
                parts[-1] = parts[-1].replace(".py", "")
            return ".".join(parts)
        except ValueError:
            return file_path.stem

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
