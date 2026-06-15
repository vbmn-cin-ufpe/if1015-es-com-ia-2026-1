import { httpGet, httpPost } from "../infrastructure/http"

export type IndexResponse = {
  repository_id: string
  job_status: string
}

export type RepoStatusResponse = {
  repository_id: string
  repository_url: string
  index_status: string
  stats: {
    source_files?: number
    languages?: Record<string, number>
    chunks?: number
    vectors?: number
    elapsed_seconds?: number
    total_size_kb?: number
    repository_url?: string
    repo_name?: string
    [key: string]: unknown
  }
  error_message?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export async function indexRepository(repositoryUrl: string, token: string): Promise<IndexResponse> {
  return await httpPost<IndexResponse>("/api/repos/index", { repository_url: repositoryUrl }, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function getRepositoryStatus(repositoryId: string, token: string): Promise<RepoStatusResponse> {
  return await httpGet<RepoStatusResponse>(`/api/repos/${repositoryId}/status`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}