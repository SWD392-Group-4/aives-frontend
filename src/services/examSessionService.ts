import { ExamSession, ExamSessionStatus, VivaAttempt } from '../types'
import { apiRequest } from './apiClient'

/**
 * API phiên thi (module exam của backend, prefix /api/exam-sessions).
 * Thời gian gửi lên và nhận về đều là chuỗi ISO-8601 theo giờ UTC, ví dụ '2026-10-10T01:00:00Z'.
 */

export interface GetExamSessionsParams {
  status?: ExamSessionStatus | null
  keyword?: string | null
  page?: number
  size?: number
}

export interface ExamSessionPageResult {
  items: ExamSession[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

export interface CreateExamSessionPayload {
  title: string
  description?: string | null
  startAt: string
  endAt: string
  durationMinutes: number
}

/* ---------- LECTURER / ADMIN: quản lý phiên (ExamSessionController) ---------- */

/**
 * GET /exam-sessions -> { items, page, size, totalItems, totalPages }
 */
export function getExamSessions({
  status = null,
  keyword = null,
  page = 0,
  size = 10,
}: GetExamSessionsParams = {}): Promise<ExamSessionPageResult> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (status) params.set('status', status)
  if (keyword) params.set('keyword', keyword)
  return apiRequest<ExamSessionPageResult>(`/exam-sessions?${params}`)
}

/** POST /exam-sessions -> phiên vừa tạo. `id` (AIVES_EXAM_yyyy_xxxxxx) cũng là mã vào thi, kèm `passcode` */
export function createExamSession(payload: CreateExamSessionPayload): Promise<ExamSession> {
  return apiRequest<ExamSession>('/exam-sessions', {
    method: 'POST',
    body: payload,
  })
}

/** PUT /exam-sessions/{id} -> phiên sau khi sửa */
export function updateExamSession(
  id: string,
  payload: CreateExamSessionPayload
): Promise<ExamSession> {
  return apiRequest<ExamSession>(`/exam-sessions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: payload,
  })
}

/**
 * DELETE /exam-sessions/{id} -> { action }
 * action = 'DELETED': đã xoá hẳn. action = 'CANCELLED': đã có sinh viên vào nên chỉ huỷ phiên.
 */
export function deleteExamSession(id: string): Promise<{ action: 'DELETED' | 'CANCELLED' }> {
  return apiRequest<{ action: 'DELETED' | 'CANCELLED' }>(`/exam-sessions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

/** POST /exam-sessions/{id}/regenerate-passcode -> phiên với passcode mới */
export function regeneratePasscode(id: string): Promise<ExamSession> {
  return apiRequest<ExamSession>(`/exam-sessions/${encodeURIComponent(id)}/regenerate-passcode`, {
    method: 'POST',
  })
}

/* ---------- STUDENT: vào thi (ExamAttemptController) ---------- */

export interface JoinExamSessionPayload {
  examId: string
  passcode: string
}

/**
 * POST /exam-sessions/join -> lượt thi
 */
export function joinExamSession({ examId, passcode }: JoinExamSessionPayload): Promise<VivaAttempt> {
  return apiRequest<VivaAttempt>('/exam-sessions/join', {
    method: 'POST',
    body: { examId, passcode },
  })
}

/**
 * POST /exam-sessions/attempts/{attemptId}/finish -> lượt thi với status = 'COMPLETED'.
 * Sinh viên chủ động kết thúc bài thi; sau đó không vào lại phiên này được nữa.
 */
export function finishExamAttempt(attemptId: string): Promise<VivaAttempt> {
  return apiRequest<VivaAttempt>(`/exam-sessions/attempts/${encodeURIComponent(attemptId)}/finish`, {
    method: 'POST',
  })
}

/** GET /exam-sessions/attempts/{attemptId} -> lượt thi của sinh viên đang đăng nhập */
export function getExamAttempt(attemptId: string): Promise<VivaAttempt> {
  return apiRequest<VivaAttempt>(`/exam-sessions/attempts/${encodeURIComponent(attemptId)}`)
}
