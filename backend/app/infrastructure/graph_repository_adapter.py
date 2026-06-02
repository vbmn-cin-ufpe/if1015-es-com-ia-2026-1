"""Graph repository adapter — persists dependency graph snapshots with in-memory fallback."""

import json
import logging
from datetime import datetime, timezone
from typing import Any

from app.infrastructure.settings import Settings

logger = logging.getLogger(__name__)


class GraphRepositoryAdapter:
    """Implements GraphRepositoryPort with PostgreSQL + in-memory fallback."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._graphs: dict[str, list[dict[str, Any]]] = {}  # repo_id -> [snapshots]
        self._conn = None
        self._init_db()

    def _init_db(self) -> None:
        if not self._settings.postgres_dsn:
            logger.info("POSTGRES_DSN not set — using in-memory graph storage")
            return
        try:
            import psycopg

            self._conn = psycopg.connect(self._settings.postgres_dsn)
            with self._conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS dependency_graphs (
                        snapshot_id TEXT PRIMARY KEY,
                        repository_id TEXT NOT NULL,
                        node_count INTEGER NOT NULL,
                        edge_count INTEGER NOT NULL,
                        payload TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    )
                    """
                )
                cur.execute(
                    "CREATE INDEX IF NOT EXISTS idx_dep_graphs_repo "
                    "ON dependency_graphs(repository_id, created_at DESC)"
                )
            self._conn.commit()
            logger.info("Graph DB table initialized")
        except Exception as exc:
            logger.warning("Graph DB init failed, using in-memory: %s", exc)
            self._conn = None

    def save_graph(self, repository_id: str, graph_payload: dict[str, Any]) -> None:
        """Persist a graph snapshot."""
        created_at = datetime.now(timezone.utc).isoformat()
        record = {**graph_payload, "created_at": created_at}

        if self._conn is None:
            self._graphs.setdefault(repository_id, []).insert(0, record)
            return

        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO dependency_graphs
                        (snapshot_id, repository_id, node_count, edge_count, payload, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (snapshot_id) DO NOTHING
                    """,
                    (
                        graph_payload["snapshot_id"],
                        repository_id,
                        graph_payload["node_count"],
                        graph_payload["edge_count"],
                        json.dumps(graph_payload),
                        created_at,
                    ),
                )
            self._conn.commit()
        except Exception as exc:
            logger.error("Failed to persist graph: %s", exc)
            self._graphs.setdefault(repository_id, []).insert(0, record)

    def get_graph(
        self, repository_id: str, snapshot_id: str | None = None
    ) -> dict[str, Any] | None:
        """Retrieve a graph snapshot (latest if snapshot_id is None)."""
        if self._conn is None:
            snapshots = self._graphs.get(repository_id, [])
            if not snapshots:
                return None
            if snapshot_id:
                return next((s for s in snapshots if s["snapshot_id"] == snapshot_id), None)
            return snapshots[0]  # latest

        try:
            with self._conn.cursor() as cur:
                if snapshot_id:
                    cur.execute(
                        "SELECT payload, created_at FROM dependency_graphs "
                        "WHERE repository_id = %s AND snapshot_id = %s",
                        (repository_id, snapshot_id),
                    )
                else:
                    cur.execute(
                        "SELECT payload, created_at FROM dependency_graphs "
                        "WHERE repository_id = %s ORDER BY created_at DESC LIMIT 1",
                        (repository_id,),
                    )
                row = cur.fetchone()
                if not row:
                    return None
                graph = json.loads(row[0])
                graph["created_at"] = row[1]
                return graph
        except Exception as exc:
            logger.error("Failed to retrieve graph: %s", exc)
            return None

    def list_snapshots(self, repository_id: str) -> list[dict[str, str]]:
        """List available snapshots for a repository."""
        if self._conn is None:
            return [
                {"snapshot_id": s["snapshot_id"], "created_at": s.get("created_at", "")}
                for s in self._graphs.get(repository_id, [])
            ]

        try:
            with self._conn.cursor() as cur:
                cur.execute(
                    "SELECT snapshot_id, created_at FROM dependency_graphs "
                    "WHERE repository_id = %s ORDER BY created_at DESC",
                    (repository_id,),
                )
                return [
                    {"snapshot_id": r[0], "created_at": r[1]} for r in cur.fetchall()
                ]
        except Exception as exc:
            logger.error("Failed to list snapshots: %s", exc)
            return []
