import { httpGet, httpPost } from "../infrastructure/http";
import { useAuthStore } from "../store/authStore";

function authHeader() {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface SnapshotMeta {
  snapshot_id: string;
  created_at: string;
  node_count: number;
  edge_count: number;
}

export interface NodeChange {
  node_id: string;
  label: string;
  change: "added" | "removed" | "unchanged";
}

export interface EdgeChange {
  source: string;
  target: string;
  change: "added" | "removed" | "unchanged";
}

export interface DriftReport {
  repository_id: string;
  snapshot_a_id: string;
  snapshot_b_id: string;
  snapshot_a_ts: string;
  snapshot_b_ts: string;
  nodes_added: NodeChange[];
  nodes_removed: NodeChange[];
  nodes_unchanged: number;
  edges_added: EdgeChange[];
  edges_removed: EdgeChange[];
  edges_unchanged: number;
  drift_score: number;
}

export async function listGraphSnapshots(repositoryId: string): Promise<SnapshotMeta[]> {
  return httpGet<SnapshotMeta[]>(`/api/repos/${repositoryId}/graph/snapshots`, {
    headers: authHeader(),
  });
}

export async function getGraphDiff(
  repositoryId: string,
  snapshotA: string,
  snapshotB: string
): Promise<DriftReport> {
  return httpGet<DriftReport>(
    `/api/repos/${repositoryId}/graph/diff?snapshot_a=${snapshotA}&snapshot_b=${snapshotB}`,
    { headers: authHeader() }
  );
}

export async function interpretDrift(
  repositoryId: string,
  snapshotA: string,
  snapshotB: string
): Promise<{ interpretation: string }> {
  return httpPost<{ interpretation: string }>(
    `/api/repos/${repositoryId}/graph/diff/interpret`,
    { snapshot_a: snapshotA, snapshot_b: snapshotB },
    { headers: authHeader() }
  );
}
