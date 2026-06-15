"""Architecture Drift service — compares two graph snapshots and surfaces changes."""

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class NodeChange:
    node_id: str
    label: str
    change: str   # "added" | "removed" | "unchanged"


@dataclass
class EdgeChange:
    source: str
    target: str
    change: str   # "added" | "removed" | "unchanged"


@dataclass
class DriftReport:
    repository_id: str
    snapshot_a_id: str
    snapshot_b_id: str
    snapshot_a_ts: str
    snapshot_b_ts: str
    # Node changes
    nodes_added: list[NodeChange] = field(default_factory=list)
    nodes_removed: list[NodeChange] = field(default_factory=list)
    nodes_unchanged: int = 0
    # Edge changes
    edges_added: list[EdgeChange] = field(default_factory=list)
    edges_removed: list[EdgeChange] = field(default_factory=list)
    edges_unchanged: int = 0
    # Summary
    drift_score: float = 0.0   # 0–100: 0 = identical, 100 = completely different


def _node_key(node: dict[str, Any]) -> str:
    return node.get("id") or node.get("path") or node.get("label", "")


def _edge_key(edge: dict[str, Any]) -> str:
    src = edge.get("source") or edge.get("from", "")
    tgt = edge.get("target") or edge.get("to", "")
    return f"{src}→{tgt}"


class ArchitectureDriftService:
    """Computes structural diff between two dependency graph snapshots."""

    def compare(
        self,
        repository_id: str,
        snapshot_a: dict[str, Any],
        snapshot_b: dict[str, Any],
    ) -> DriftReport:
        nodes_a: dict[str, dict] = {
            _node_key(n): n for n in snapshot_a.get("nodes", [])
        }
        nodes_b: dict[str, dict] = {
            _node_key(n): n for n in snapshot_b.get("nodes", [])
        }
        edges_a: dict[str, dict] = {
            _edge_key(e): e for e in snapshot_a.get("edges", [])
        }
        edges_b: dict[str, dict] = {
            _edge_key(e): e for e in snapshot_b.get("edges", [])
        }

        # Node diff
        all_node_keys = set(nodes_a) | set(nodes_b)
        added_nodes: list[NodeChange] = []
        removed_nodes: list[NodeChange] = []
        unchanged_nodes = 0

        for key in all_node_keys:
            in_a = key in nodes_a
            in_b = key in nodes_b
            if in_a and in_b:
                unchanged_nodes += 1
            elif in_b:
                n = nodes_b[key]
                added_nodes.append(NodeChange(node_id=key, label=n.get("label", key), change="added"))
            else:
                n = nodes_a[key]
                removed_nodes.append(NodeChange(node_id=key, label=n.get("label", key), change="removed"))

        # Edge diff
        all_edge_keys = set(edges_a) | set(edges_b)
        added_edges: list[EdgeChange] = []
        removed_edges: list[EdgeChange] = []
        unchanged_edges = 0

        for key in all_edge_keys:
            in_a = key in edges_a
            in_b = key in edges_b
            if in_a and in_b:
                unchanged_edges += 1
            elif in_b:
                e = edges_b[key]
                added_edges.append(EdgeChange(
                    source=e.get("source", e.get("from", "")),
                    target=e.get("target", e.get("to", "")),
                    change="added",
                ))
            else:
                e = edges_a[key]
                removed_edges.append(EdgeChange(
                    source=e.get("source", e.get("from", "")),
                    target=e.get("target", e.get("to", "")),
                    change="removed",
                ))

        # Drift score: % of total elements that changed
        total = len(all_node_keys) + len(all_edge_keys)
        changed = len(added_nodes) + len(removed_nodes) + len(added_edges) + len(removed_edges)
        drift_score = round((changed / total) * 100, 1) if total > 0 else 0.0

        report = DriftReport(
            repository_id=repository_id,
            snapshot_a_id=snapshot_a.get("snapshot_id", ""),
            snapshot_b_id=snapshot_b.get("snapshot_id", ""),
            snapshot_a_ts=snapshot_a.get("created_at", ""),
            snapshot_b_ts=snapshot_b.get("created_at", ""),
            nodes_added=added_nodes,
            nodes_removed=removed_nodes,
            nodes_unchanged=unchanged_nodes,
            edges_added=added_edges,
            edges_removed=removed_edges,
            edges_unchanged=unchanged_edges,
            drift_score=drift_score,
        )
        logger.info(
            "[drift] repo=%s +%d/-%d nodes, +%d/-%d edges, score=%.1f",
            repository_id,
            len(added_nodes), len(removed_nodes),
            len(added_edges), len(removed_edges),
            drift_score,
        )
        return report
