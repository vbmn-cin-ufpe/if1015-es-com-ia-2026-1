import { httpGet } from "../infrastructure/http"

export interface FileHotspot {
  file_path: string
  churn: number
  complexity: number
  loc: number
  hotspot_score: number
  language: string
}

export interface HotspotAnalysis {
  repository_id: string
  repo_root: string
  churn_months: number
  total_files_scanned: number
  hotspots: FileHotspot[]
}

export async function getHotspots(
  repositoryId: string,
  topN = 30,
  churnMonths = 6,
): Promise<HotspotAnalysis> {
  const params = new URLSearchParams({
    top_n: String(topN),
    churn_months: String(churnMonths),
  })
  return httpGet<HotspotAnalysis>(`/api/repos/${repositoryId}/hotspots?${params}`)
}
