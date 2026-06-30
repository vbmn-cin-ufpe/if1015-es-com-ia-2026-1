import { httpGet, httpPost } from "../infrastructure/http"
import { useAuthStore } from "../store/authStore"

function authHeader(): Record<string, string> {
  const token = useAuthStore.getState().token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export interface BranchListResult {
  branches: string[]
  current: string | null
}

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

export async function listBranches(repositoryId: string): Promise<BranchListResult> {
  return httpGet<BranchListResult>(`/api/repos/${repositoryId}/branches`, {
    headers: authHeader(),
  })
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
