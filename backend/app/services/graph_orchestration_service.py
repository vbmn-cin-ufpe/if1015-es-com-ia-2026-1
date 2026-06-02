"""Graph orchestration service — coordinates extraction, assembly, persistence, and retrieval."""

import logging
from pathlib import Path
from typing import Any

from app.ports import GraphRepositoryPort, RepositoryMetadataPort
from app.services.dependency_graph_service import DependencyExtractorService, GraphAssemblerService

logger = logging.getLogger(__name__)


class GraphService:
    """Orchestrates dependency graph generation and retrieval."""

    def __init__(
        self,
        metadata_adapter: RepositoryMetadataPort,
        graph_repository: GraphRepositoryPort,
        extractor: DependencyExtractorService | None = None,
        assembler: GraphAssemblerService | None = None,
    ):
        self.metadata_adapter = metadata_adapter
        self.graph_repository = graph_repository
        self.extractor = extractor or DependencyExtractorService()
        self.assembler = assembler or GraphAssemblerService()

    def generate_graph(
        self,
        repository_id: str,
        repo_root: Path,
        include_external: bool = False,
    ) -> dict[str, Any]:
        """Generate and persist a dependency graph for a repository.

        Args:
            repository_id: Repository identifier
            repo_root: Filesystem path to the repository
            include_external: Whether to include external package dependencies

        Returns:
            Complete GraphPayload dict
        """
        # Extract raw dependency edges
        edges = self.extractor.extract_repository_dependencies(repo_root, include_external)

        # Assemble into normalized graph
        graph_payload = self.assembler.assemble_graph(repository_id, edges)

        # Persist the snapshot
        self.graph_repository.save_graph(repository_id, graph_payload)

        return graph_payload

    def get_graph(
        self,
        repository_id: str,
        snapshot_id: str | None = None,
        repo_root: Path | None = None,
    ) -> dict[str, Any] | None:
        """Retrieve a graph (from persistence or generate on-the-fly).

        If no snapshot is persisted and repo_root is provided, generates a new one.
        """
        graph = self.graph_repository.get_graph(repository_id, snapshot_id)
        if graph:
            return graph

        # If repo_root provided, generate on-the-fly
        if repo_root and repo_root.exists():
            return self.generate_graph(repository_id, repo_root)

        return None

    def get_module_details(
        self,
        repository_id: str,
        module_path: str,
        snapshot_id: str | None = None,
    ) -> dict[str, Any] | None:
        """Get dependency details for a specific module."""
        graph = self.graph_repository.get_graph(repository_id, snapshot_id)
        if not graph:
            return None
        return self.assembler.get_module_details(graph, module_path)
