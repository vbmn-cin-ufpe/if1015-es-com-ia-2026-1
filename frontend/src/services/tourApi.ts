import { httpGet, httpPost } from "../infrastructure/http"

export interface TourStepMetrics {
  complexity: Record<string, unknown>
  churn: Record<string, unknown>
  coupling: Record<string, unknown>
}

export interface TourStep {
  step_number: number
  module_name: string
  title: string
  score: number
  rationale: string
  metrics: TourStepMetrics
  recommendations: string[]
}

export interface TourResponse {
  tour_id: string
  repository_id: string
  title: string
  description: string
  step_count: number
  steps: TourStep[]
  created_at?: string
  config?: Record<string, unknown>
}

export interface TourSummary {
  tour_id: string
  repository_id: string
  title: string
  description: string
  step_count: number
  created_at: string
  config: Record<string, unknown>
}

export interface TourListResponse {
  repository_id: string
  tours: TourSummary[]
}

export interface GenerateTourOptions {
  topK?: number
  complexityWeight?: number
  churnWeight?: number
  couplingWeight?: number
}

export async function generateTour(
  repositoryId: string,
  options: GenerateTourOptions = {},
): Promise<TourResponse> {
  const {
    topK = 5,
    complexityWeight = 0.4,
    churnWeight = 0.3,
    couplingWeight = 0.3,
  } = options
  return await httpPost<TourResponse>("/api/tours/generate", {
    repository_id: repositoryId,
    top_k: topK,
    complexity_weight: complexityWeight,
    churn_weight: churnWeight,
    coupling_weight: couplingWeight,
  })
}

export async function getTour(tourId: string): Promise<TourResponse> {
  return await httpGet<TourResponse>(`/api/tours/${tourId}`)
}

export async function listTours(repositoryId: string): Promise<TourListResponse> {
  return await httpGet<TourListResponse>(`/api/repos/${repositoryId}/tours`)
}

