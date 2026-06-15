import { httpGet, httpPost } from "../infrastructure/http";

export interface MetricsPayload {
  total_events: number;
  total_feedback: number;
  response_latency_p50: number;
  response_latency_p95: number;
  onboarding_flow_completion_rate: number;
  answer_usefulness_rate: number;
  answer_correctness_rate: number;
  feedback_coverage_rate: number;
}

export interface MetricsResponse {
  repository_id: string;
  period_start: string | null;
  period_end: string | null;
  metrics: MetricsPayload;
}

export interface QualityReport {
  repository_id: string;
  period_start: string;
  period_end: string;
  metrics: MetricsPayload;
  quality_label: string;
  overall_quality_score: number;
  summary: string;
}

export interface FeedbackPayload {
  repository_id: string;
  response_id: string;
  usefulness_score: number;
  correctness_score: number;
  comment?: string;
}

export interface FeedbackResult {
  feedback_id: string;
  status: string;
}

export async function getMetrics(
  repositoryId: string,
  options?: { from?: string; to?: string }
): Promise<MetricsResponse> {
  const params = new URLSearchParams();
  if (options?.from) params.set("from_ts", options.from);
  if (options?.to) params.set("to_ts", options.to);
  const qs = params.toString();
  return httpGet<MetricsResponse>(`/api/repos/${repositoryId}/metrics${qs ? `?${qs}` : ""}`);
}

export async function getQualityReport(
  repositoryId: string,
  options?: { from?: string; to?: string }
): Promise<QualityReport> {
  const params = new URLSearchParams();
  if (options?.from) params.set("from_ts", options.from);
  if (options?.to) params.set("to_ts", options.to);
  const qs = params.toString();
  return httpGet<QualityReport>(
    `/api/repos/${repositoryId}/metrics/quality-report${qs ? `?${qs}` : ""}`
  );
}

export async function submitFeedback(
  payload: FeedbackPayload
): Promise<FeedbackResult> {
  return httpPost<FeedbackResult>("/api/feedback", payload);
}
