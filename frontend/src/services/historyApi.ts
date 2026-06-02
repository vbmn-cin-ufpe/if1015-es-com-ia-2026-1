import { http } from "../infrastructure/http";

export interface TimelineEntry {
  id: string;
  position: number;
  commit_id: string;
  repository_id: string;
  timestamp: string;
  category: string;
  confidence: number;
  summary: string;
  touched_modules: string[];
}

export interface TimelineResponse {
  repository_id: string;
  module_path: string | null;
  category: string | null;
  total: number;
  entries: TimelineEntry[];
}

export interface SupportingCommit {
  commit_id: string;
  timestamp: string;
  category: string;
  summary: string;
  confidence: number;
}

export interface WhyResponse {
  module_path: string;
  question: string;
  explanation: string;
  supporting_commits: SupportingCommit[];
  confidence: number;
}

export async function getTimeline(
  repositoryId: string,
  options?: { modulePath?: string; category?: string; limit?: number }
): Promise<TimelineResponse> {
  const params = new URLSearchParams();
  if (options?.modulePath) params.set("module_path", options.modulePath);
  if (options?.category) params.set("category", options.category);
  if (options?.limit) params.set("limit", String(options.limit));
  const qs = params.toString();
  const url = `/api/repos/${repositoryId}/history/timeline${qs ? `?${qs}` : ""}`;
  return http.get(url);
}

export async function getWhyExplanation(
  repositoryId: string,
  modulePath: string,
  question: string
): Promise<WhyResponse> {
  return http.post(`/api/repos/${repositoryId}/history/why`, {
    module_path: modulePath,
    question,
  });
}
