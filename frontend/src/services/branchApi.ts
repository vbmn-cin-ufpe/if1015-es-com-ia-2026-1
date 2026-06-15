import { httpPost } from "../infrastructure/http"

export interface BranchAnalysisRequest {
  branch: string
  base?: string
}

export interface BranchAnalysisResult {
  branch: string
  base: string
  changed_files: string[]
  added_lines: number
  removed_lines: number
  touched_modules: string[]
  diff_stat: string
  risk_score: number
  llm_summary: string
  llm_risk_notes: string
}

export async function analyseBranch(
  repositoryId: string,
  branch: string,
  base = "main",
): Promise<BranchAnalysisResult> {
  return httpPost<BranchAnalysisResult>(
    `/api/repos/${repositoryId}/analyze-branch`,
    { branch, base },
  )
}
