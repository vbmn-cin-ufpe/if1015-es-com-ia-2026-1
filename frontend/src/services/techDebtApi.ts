import { httpGet, httpPost } from "../infrastructure/http";

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
  // Extended metrics (v2)
  avg_complexity: number;
  avg_churn: number;
  avg_loc: number;
  comment_ratio: number;
  coupling_score: number;
  debt_trend: "improving" | "stable" | "degrading";
  llm_summary: string;
  debt_breakdown: {
    complexity?: number;
    churn?: number;
    size?: number;
    coupling?: number;
    documentation?: number;
  };
}

export async function getTechDebtHistory(
  repositoryId: string,
  limit = 30
): Promise<TechDebtSnapshot[]> {
  return httpGet<TechDebtSnapshot[]>(
    `/api/repos/${repositoryId}/tech-debt?limit=${limit}`
  );
}

export async function analyseTechDebt(
  repositoryId: string
): Promise<TechDebtSnapshot> {
  return httpPost<TechDebtSnapshot>(
    `/api/repos/${repositoryId}/tech-debt/analyse`,
    {}
  );
}
