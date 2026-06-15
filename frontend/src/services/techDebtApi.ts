import { httpGet } from "../infrastructure/http";

export interface TechDebtSnapshot {
  id: string;
  repository_id: string;
  snapshot_ts: string;
  avg_score: number;
  total_files: number;
  critical_count: number;
  high_count: number;
  top_files: Array<{
    file_path: string;
    relative_path: string;
    churn: number;
    complexity: number;
    loc: number;
    hotspot_score: number;
    language: string;
  }>;
}

export async function getTechDebtHistory(
  repositoryId: string,
  limit = 30
): Promise<TechDebtSnapshot[]> {
  return httpGet<TechDebtSnapshot[]>(
    `/api/repos/${repositoryId}/tech-debt?limit=${limit}`
  );
}
