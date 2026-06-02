"""Unit tests for dependency extractor and graph assembler."""

from pathlib import Path

import pytest

from app.services.dependency_graph_service import (
    DependencyExtractorService,
    GraphAssemblerService,
)


class TestDependencyExtractor:
    """Test import dependency extraction."""

    def setup_method(self):
        self.extractor = DependencyExtractorService()

    def test_extract_file_dependencies(self):
        """Test extraction from a known source file."""
        app_path = Path(__file__).parent.parent.parent / "app"
        ports_file = app_path / "ports.py"
        if not ports_file.exists():
            pytest.skip("Source file not found")

        edges = self.extractor.extract_file_dependencies(ports_file, app_path)
        assert isinstance(edges, list)
        # ports.py should have minimal dependencies (stdlib only)
        for edge in edges:
            assert "source" in edge
            assert "target" in edge
            assert "type" in edge
            assert edge["type"] in ("internal", "external")

    def test_extract_repository_dependencies(self):
        """Test full repository extraction."""
        app_path = Path(__file__).parent.parent.parent / "app"
        if not app_path.exists():
            pytest.skip("App path not found")

        edges = self.extractor.extract_repository_dependencies(app_path, include_external=False)
        assert isinstance(edges, list)
        assert len(edges) > 0
        # All should be internal (we excluded external)
        for edge in edges:
            assert edge["type"] == "internal"

    def test_extract_includes_external(self):
        """Test extraction with external imports included."""
        app_path = Path(__file__).parent.parent.parent / "app"
        if not app_path.exists():
            pytest.skip("App path not found")

        edges = self.extractor.extract_repository_dependencies(app_path, include_external=True)
        types = {e["type"] for e in edges}
        # Should have both
        assert "internal" in types
        assert "external" in types

    def test_determinism(self):
        """Same repo produces the same edge set (RQ-008)."""
        app_path = Path(__file__).parent.parent.parent / "app"
        if not app_path.exists():
            pytest.skip("App path not found")

        edges_a = self.extractor.extract_repository_dependencies(app_path)
        edges_b = self.extractor.extract_repository_dependencies(app_path)

        # Convert to comparable sets
        set_a = {(e["source"], e["target"], e["type"]) for e in edges_a}
        set_b = {(e["source"], e["target"], e["type"]) for e in edges_b}
        assert set_a == set_b


class TestGraphAssembler:
    """Test graph assembly and normalization."""

    def setup_method(self):
        self.assembler = GraphAssemblerService()

    def test_assemble_basic_graph(self):
        """Test basic graph assembly from edges."""
        edges = [
            {"source": "mod_a", "target": "mod_b", "type": "internal"},
            {"source": "mod_a", "target": "mod_c", "type": "internal"},
            {"source": "mod_b", "target": "mod_c", "type": "internal"},
        ]
        graph = self.assembler.assemble_graph("repo-1", edges)

        assert graph["repository_id"] == "repo-1"
        assert graph["node_count"] == 3
        assert graph["edge_count"] == 3
        assert len(graph["nodes"]) == 3
        assert len(graph["edges"]) == 3

    def test_deduplication(self):
        """Duplicate edges should be removed."""
        edges = [
            {"source": "mod_a", "target": "mod_b", "type": "internal"},
            {"source": "mod_a", "target": "mod_b", "type": "internal"},  # duplicate
            {"source": "mod_a", "target": "mod_b", "type": "internal"},  # duplicate
        ]
        graph = self.assembler.assemble_graph("repo-1", edges)

        assert graph["edge_count"] == 1
        assert len(graph["edges"]) == 1

    def test_node_metrics(self):
        """Nodes should have correct in/out degree."""
        edges = [
            {"source": "a", "target": "b", "type": "internal"},
            {"source": "a", "target": "c", "type": "internal"},
            {"source": "b", "target": "c", "type": "internal"},
        ]
        graph = self.assembler.assemble_graph("repo-1", edges)

        node_a = next(n for n in graph["nodes"] if n["id"] == "a")
        node_b = next(n for n in graph["nodes"] if n["id"] == "b")
        node_c = next(n for n in graph["nodes"] if n["id"] == "c")

        assert node_a["metrics"]["out_degree"] == 2
        assert node_a["metrics"]["in_degree"] == 0
        assert node_b["metrics"]["in_degree"] == 1
        assert node_b["metrics"]["out_degree"] == 1
        assert node_c["metrics"]["in_degree"] == 2
        assert node_c["metrics"]["out_degree"] == 0

    def test_get_module_details(self):
        """Module details should list inbound/outbound deps."""
        edges = [
            {"source": "a", "target": "b", "type": "internal"},
            {"source": "c", "target": "b", "type": "internal"},
        ]
        graph = self.assembler.assemble_graph("repo-1", edges)
        details = self.assembler.get_module_details(graph, "b")

        assert details is not None
        assert details["module_path"] == "b"
        assert len(details["inbound_dependencies"]) == 2
        assert len(details["outbound_dependencies"]) == 0

    def test_get_module_details_not_found(self):
        """Nonexistent module returns None."""
        graph = self.assembler.assemble_graph("repo-1", [])
        details = self.assembler.get_module_details(graph, "unknown")
        assert details is None

    def test_schema_validation(self):
        """Graph payload should match expected schema (RQ-002)."""
        edges = [{"source": "x", "target": "y", "type": "internal"}]
        graph = self.assembler.assemble_graph("repo-id", edges)

        # Top-level keys
        required_keys = {"repository_id", "snapshot_id", "node_count", "edge_count", "nodes", "edges"}
        assert required_keys.issubset(set(graph.keys()))

        # Node schema
        node = graph["nodes"][0]
        assert "id" in node
        assert "label" in node
        assert "module_path" in node
        assert "metrics" in node
        assert "in_degree" in node["metrics"]
        assert "out_degree" in node["metrics"]

        # Edge schema
        edge = graph["edges"][0]
        assert "id" in edge
        assert "source" in edge
        assert "target" in edge
        assert "type" in edge
