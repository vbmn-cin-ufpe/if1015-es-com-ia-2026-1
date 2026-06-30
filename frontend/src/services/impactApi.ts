import { httpGet } from "../infrastructure/http"

export interface ModuleItem {
  id: string
  label: string
  module_path: string
  in_degree: number
  out_degree: number
  total_degree: number
}

export interface ImpactEntry {
  module_path: string
  label: string
  distance: number
  direct: boolean
}

export interface ImpactAnalysis {
  module_path: string
  label: string
  affected_count: number
  max_depth_reached: number
  affected: ImpactEntry[]
}

export async function getGraphModules(repositoryId: string): Promise<ModuleItem[]> {
  return httpGet<ModuleItem[]>(`/api/repos/${repositoryId}/graph/modules`)
}

export async function getImpactAnalysis(
  repositoryId: string,
  module: string,
  maxDepth = 5,
): Promise<ImpactAnalysis> {
  const params = new URLSearchParams({ module, max_depth: String(maxDepth) })
  return httpGet<ImpactAnalysis>(`/api/repos/${repositoryId}/graph/impact?${params}`)
}
