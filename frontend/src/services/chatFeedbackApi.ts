import { httpPost } from "../infrastructure/http"

export interface AnswerFeedbackRequest {
  response_id: string
  repository_id: string
  thumbs_up: boolean
  comment?: string
}

export interface AnswerFeedbackResponse {
  feedback_id: string
  status: string
}

export async function submitAnswerFeedback(
  payload: AnswerFeedbackRequest,
): Promise<AnswerFeedbackResponse> {
  return httpPost<AnswerFeedbackResponse>("/api/chat/feedback", {
    response_id: payload.response_id,
    repository_id: payload.repository_id,
    thumbs_up: payload.thumbs_up,
    comment: payload.comment ?? "",
  })
}
