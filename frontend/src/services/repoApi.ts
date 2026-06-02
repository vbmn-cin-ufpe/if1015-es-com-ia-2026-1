import { httpGet, httpPost } from "../infrastructure/http"

export type IndexResponse = {
  repository_id: string
  job_status: string
}

export type RepoStatusResponse = {
  repository_id: string
  index_status: string
  stats: Record<string, unknown>
  error_message?: string | null
}

export async function indexRepository(repositoryUrl: string): Promise<IndexResponse> {
  return await httpPost<IndexResponse>("/api/repos/index", { repository_url: repositoryUrl })
}

export async function getRepositoryStatus(repositoryId: string): Promise<RepoStatusResponse> {
  return await httpGet<RepoStatusResponse>(`/api/repos/${repositoryId}/status`)
}