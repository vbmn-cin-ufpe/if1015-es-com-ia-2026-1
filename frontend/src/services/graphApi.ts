import { httpGet } from "../infrastructure/http"

export interface GraphNodeMetrics {
  in_degree: number
  out_degree: number
  total_degree: number
}

export interface GraphNode {
  id: string
  label: string
  module_path: string
  metrics: GraphNodeMetrics
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: string
}

export interface GraphPayload {
  repository_id: string
  snapshot_id: string
  node_count: number
  edge_count: number
  nodes: GraphNode[]
  edges: GraphEdge[]
  created_at?: string
}

export interface ModuleDependencyDetail {
  source?: string
  target?: string
  type: string
}

export interface ModuleDetails {
  module_path: string
  label: string
  metrics: GraphNodeMetrics
  inbound_dependencies: ModuleDependencyDetail[]
  outbound_dependencies: ModuleDependencyDetail[]
}

export async function getDependencyGraph(
  repositoryId: string,
  snapshotId?: string,
): Promise<GraphPayload> {
  const params = snapshotId ? `?snapshot_id=${snapshotId}` : ""
  return await httpGet<GraphPayload>(`/api/repos/${repositoryId}/dependency-graph${params}`)
}

export async function getModuleDetails(
  repositoryId: string,
  modulePath: string,
  snapshotId?: string,
): Promise<ModuleDetails> {
  const params = snapshotId ? `?snapshot_id=${snapshotId}` : ""
  return await httpGet<ModuleDetails>(
    `/api/repos/${repositoryId}/modules/${modulePath}/dependencies${params}`,
  )
}
