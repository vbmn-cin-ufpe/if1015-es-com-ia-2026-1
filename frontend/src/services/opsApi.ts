import { httpGet } from "../infrastructure/http";

export interface DependencyStatus {
  name: string;
  status: string;
  latency_ms: number | null;
  message: string;
}

export interface ReadinessResponse {
  status: string;
  dependencies: DependencyStatus[];
}

export interface OperationalSummary {
  status: string;
  uptime_info: string;
  total_metric_points: number;
  operations: Record<string, { request_count: number; error_count: number; avg_latency: number }>;
  recent_errors: Array<{ name: string; dimensions: Record<string, string>; timestamp: string }>;
  alert_status: string;
}

export async function getLiveness(): Promise<{ status: string }> {
  return httpGet("/api/ops/health/live");
}

export async function getReadiness(): Promise<ReadinessResponse> {
  return httpGet("/api/ops/health/ready");
}

export async function getOperationalSummary(): Promise<OperationalSummary> {
  return httpGet("/api/ops/summary");
}
