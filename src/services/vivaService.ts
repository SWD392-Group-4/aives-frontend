import { apiRequest } from './apiClient'

/* ---------- STUDENT: phỏng vấn AI trong 1 lượt thi (VivaInterviewController) ---------- */

/**
 * QUESTION   : đang có 1 câu hỏi chờ sinh viên trả lời (các trường về câu hỏi có giá trị)
 * PROCESSING : AI đang quyết định câu tiếp theo, gọi lại startInterview sau vài giây
 * COMPLETED  : đã hỏi hết câu hỏi, hoặc lượt thi đã kết thúc / hết giờ
 */
export type InterviewStatus = 'QUESTION' | 'PROCESSING' | 'COMPLETED'

export interface InterviewState {
  status: InterviewStatus
  // false: backend chưa có GEMINI_API_KEY nên không có câu hỏi xoáy
  aiEnabled: boolean
  // true: lần quyết định gần nhất AI bị lỗi nên hệ thống tự chuyển câu tiếp theo
  aiFallback: boolean
  totalQuestions?: number

  // Chỉ có khi status = 'QUESTION'
  exchangeId?: string
  type?: 'MAIN' | 'FOLLOW_UP'
  questionText?: string
  questionNo?: number
  followUpNo?: number
  maxFollowUps?: number
  bloomLevel?: string
  rubricName?: string
  prepareSeconds?: number
  answerSeconds?: number
}

function interviewUrl(attemptId: string, action: string): string {
  return `/exam-sessions/attempts/${encodeURIComponent(attemptId)}/interview/${action}`
}

/**
 * POST .../interview/start -> câu hỏi hiện tại.
 * Gọi lại nhiều lần (tải lại trang) vẫn nhận đúng câu đang dở, không tạo câu mới.
 */
export function startInterview(attemptId: string): Promise<InterviewState> {
  return apiRequest<InterviewState>(interviewUrl(attemptId, 'start'), { method: 'POST' })
}

/**
 * POST .../interview/answer -> câu hỏi kế tiếp (hỏi xoáy hoặc câu gốc tiếp theo) hoặc COMPLETED.
 * transcript để trống nghĩa là sinh viên không trả lời.
 */
export function submitInterviewAnswer(
  attemptId: string,
  exchangeId: string,
  transcript: string,
): Promise<InterviewState> {
  return apiRequest<InterviewState>(interviewUrl(attemptId, 'answer'), {
    method: 'POST',
    body: { exchangeId, transcript },
  })
}

/** POST .../interview/skip -> bỏ qua câu hiện tại, sang câu hỏi gốc tiếp theo hoặc COMPLETED. */
export function skipInterviewQuestion(attemptId: string, exchangeId: string): Promise<InterviewState> {
  return apiRequest<InterviewState>(interviewUrl(attemptId, 'skip'), {
    method: 'POST',
    body: { exchangeId },
  })
}
