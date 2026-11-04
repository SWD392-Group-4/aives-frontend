import { API_BASE_URL, ApiError, apiRequest } from './apiClient'
import { getAccessToken } from './tokenStorage'

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
  sttEnabled?: boolean
  ttsEnabled?: boolean
  totalQuestions?: number

  // Chỉ có khi status = 'QUESTION'
  exchangeId?: string
  type?: 'MAIN' | 'FOLLOW_UP'
  questionText?: string
  // Hình vẽ của câu hỏi gốc (data:image/png;base64,...), câu hỏi xoáy vẫn kèm hình của câu gốc
  questionImage?: string
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

/**
 * Trả về đường dẫn audio MP3 của câu hỏi từ backend.
 * Kèm token qua query param nếu có để hỗ trợ stream trực tiếp.
 */
export function getQuestionAudioUrl(attemptId: string, exchangeId: string): string {
  const token = getAccessToken()
  const base = `${API_BASE_URL}${interviewUrl(attemptId, 'question-audio')}?exchangeId=${encodeURIComponent(exchangeId)}`
  return token ? `${base}&token=${encodeURIComponent(token)}` : base
}

/**
 * Gọi GET .../interview/question-audio?exchangeId=... kèm Authorization Bearer token để lấy binary MP3 Blob.
 */
export async function getQuestionAudioBlob(attemptId: string, exchangeId: string): Promise<Blob> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    Accept: 'audio/mpeg, audio/*',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const url = `${API_BASE_URL}${interviewUrl(attemptId, 'question-audio')}?exchangeId=${encodeURIComponent(exchangeId)}`
  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      code: 'AUDIO_FETCH_FAILED',
      message: 'Không tải được âm thanh câu hỏi từ máy chủ.',
    })
  }

  return await response.blob()
}

/**
 * Gửi file WebM/Opus thu âm từ micro của sinh viên qua POST .../interview/answer-audio (FormData).
 * Backend chuyển đổi bằng Google STT rồi xử lý như submitInterviewAnswer.
 */
export function submitInterviewAudioAnswer(
  attemptId: string,
  exchangeId: string,
  audioBlob: Blob,
): Promise<InterviewState> {
  const formData = new FormData()
  formData.append('exchangeId', exchangeId)
  formData.append('file', audioBlob, 'answer.webm')

  return apiRequest<InterviewState>(interviewUrl(attemptId, 'answer-audio'), {
    method: 'POST',
    formData,
  })
}

/** POST .../interview/skip -> bỏ qua câu hiện tại, sang câu hỏi gốc tiếp theo hoặc COMPLETED. */
export function skipInterviewQuestion(attemptId: string, exchangeId: string): Promise<InterviewState> {
  return apiRequest<InterviewState>(interviewUrl(attemptId, 'skip'), {
    method: 'POST',
    body: { exchangeId },
  })
}
