import { httpGet } from "../infrastructure/http"

export interface SearchResult {
  chunk_id: string
  file_path: string
  start_line: number
  end_line: number
  score: number
  snippet: string
  language: string
}

export interface SearchResponse {
  repository_id: string
  query: string
  total: number
  results: SearchResult[]
}

export async function semanticSearch(
  repositoryId: string,
  query: string,
  topK = 10,
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, top_k: String(topK) })
  return httpGet<SearchResponse>(`/api/repos/${repositoryId}/search?${params}`)
}
