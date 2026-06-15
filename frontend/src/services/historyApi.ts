import { httpGet, httpPost, httpDelete } from "../infrastructure/http"

export interface TimelineEntry {
  id: string
  position: number
  commit_id: string
  repository_id: string
  timestamp: string
  author: string
  category: string
  confidence: number
  summary: string
  touched_modules: string[]
}

export interface TimelineResponse {
  repository_id: string
  module_path: string | null
  category: string | null
  total: number
  offset: number
  entries: TimelineEntry[]
}

export interface SupportingCommit {
  commit_id: string
  timestamp: string
  category: string
  summary: string
  confidence: number
}

export interface WhyResponse {
  module_path: string
  question: string
  explanation: string
  supporting_commits: SupportingCommit[]
  confidence: number
}

export async function getTimeline(
  repositoryId: string,
  options?: { modulePath?: string; category?: string; search?: string; limit?: number; offset?: number }
): Promise<TimelineResponse> {
  const params = new URLSearchParams()
  if (options?.modulePath) params.set("module_path", options.modulePath)
  if (options?.category) params.set("category", options.category)
  if (options?.search) params.set("search", options.search)
  if (options?.limit) params.set("limit", String(options.limit))
  if (options?.offset) params.set("offset", String(options.offset))
  const qs = params.toString()
  return httpGet<TimelineResponse>(
    `/api/repos/${repositoryId}/history/timeline${qs ? "?" + qs : ""}`
  )
}

export async function clearHistoryCache(repositoryId: string): Promise<{ deleted: number; message: string }> {
  return httpDelete(`/api/repos/${repositoryId}/history/cache`)
}

export async function getWhyExplanation(
  repositoryId: string,
  modulePath: string,
  question: string
): Promise<WhyResponse> {
  return httpPost<WhyResponse>(`/api/repos/${repositoryId}/history/why`, {
    module_path: modulePath,
    question,
  })
}