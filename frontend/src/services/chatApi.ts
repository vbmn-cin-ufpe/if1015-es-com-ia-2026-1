import { httpPost } from "../infrastructure/http"

export type ChatSource = {
  chunk_id: string
  file_path: string
  start_line: number
  end_line: number
  score: number
}

export type ChatAskResponse = {
  answer: string
  sources: ChatSource[]
}

export async function askQuestion(
  repositoryId: string,
  question: string,
  token: string,
  locale: string = "pt-BR",
): Promise<ChatAskResponse> {
  return await httpPost<ChatAskResponse>(
    "/api/chat/ask",
    { repository_id: repositoryId, question, locale },
    { headers: { Authorization: `Bearer ${token}` } },
  )
}