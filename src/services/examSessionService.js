import { apiRequest } from './apiClient.js'

/**
 * API phiên thi (module exam của backend, prefix /api/exam-sessions).
 * Thời gian gửi lên và nhận về đều là chuỗi ISO-8601 theo giờ UTC, ví dụ '2026-10-10T01:00:00Z'.
 */

/* ---------- LECTURER / ADMIN: quản lý phiên (ExamSessionController) ---------- */

/**
 * GET /exam-sessions -> { items, page, size, totalItems, totalPages }
 * status: 'UPCOMING' | 'ONGOING' | 'ENDED' | 'CANCELLED' | null (tất cả)
 */
export function getExamSessions({ status, keyword, page = 0, size = 10 } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (status) params.set('status', status)
  if (keyword) params.set('keyword', keyword)
  return apiRequest(`/exam-sessions?${params}`)
}

/** POST /exam-sessions -> phiên vừa tạo. `id` (AIVES_EXAM_yyyy_xxxxxx) cũng là mã vào thi, kèm `passcode` */
export function createExamSession({ title, description, startAt, endAt, durationMinutes }) {
  return apiRequest('/exam-sessions', {
    method: 'POST',
    body: { title, description, startAt, endAt, durationMinutes },
  })
}

/** PUT /exam-sessions/{id} -> phiên sau khi sửa */
export function updateExamSession(id, { title, description, startAt, endAt, durationMinutes }) {
  return apiRequest(`/exam-sessions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: { title, description, startAt, endAt, durationMinutes },
  })
}

/**
 * DELETE /exam-sessions/{id} -> { action }
 * action = 'DELETED': đã xoá hẳn. action = 'CANCELLED': đã có sinh viên vào nên chỉ huỷ phiên.
 */
export function deleteExamSession(id) {
  return apiRequest(`/exam-sessions/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** POST /exam-sessions/{id}/regenerate-passcode -> phiên với passcode mới */
export function regeneratePasscode(id) {
  return apiRequest(`/exam-sessions/${encodeURIComponent(id)}/regenerate-passcode`, { method: 'POST' })
}

/* ---------- STUDENT: vào thi (ExamAttemptController) ---------- */

/**
 * POST /exam-sessions/join -> lượt thi
 * { attemptId, examId, title, durationMinutes, status, startedAt, deadlineAt, serverTime, remainingSeconds }
 */
export function joinExamSession({ examId, passcode }) {
  return apiRequest('/exam-sessions/join', {
    method: 'POST',
    body: { examId, passcode },
  })
}

/**
 * POST /exam-sessions/attempts/{attemptId}/finish -> lượt thi với status = 'COMPLETED'.
 * Sinh viên chủ động kết thúc bài thi; sau đó không vào lại phiên này được nữa.
 */
export function finishExamAttempt(attemptId) {
  return apiRequest(`/exam-sessions/attempts/${encodeURIComponent(attemptId)}/finish`, { method: 'POST' })
}

/** GET /exam-sessions/attempts/{attemptId} -> lượt thi của sinh viên đang đăng nhập */
export function getExamAttempt(attemptId) {
  return apiRequest(`/exam-sessions/attempts/${encodeURIComponent(attemptId)}`)
}
