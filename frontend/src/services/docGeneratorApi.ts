import { httpPost } from "../infrastructure/http"

export interface DocGenerateRequest {
  module_path: string
}

export interface DocGenerateResult {
  repository_id: string
  module_path: string
  documentation: string  // Markdown
}

export async function generateModuleDoc(
  repositoryId: string,
  modulePath: string,
): Promise<DocGenerateResult> {
  return httpPost<DocGenerateResult>(
    `/api/repos/${repositoryId}/generate-doc`,
    { module_path: modulePath },
  )
}
