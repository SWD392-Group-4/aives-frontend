import { GradeAppeal, QuestionGrade, VivaAttempt } from '../types'
import { apiRequest } from './apiClient'

/* ---------- Thẩm định điểm (GradingController) và kết quả của sinh viên (StudentResultController) ---------- */

export interface AttemptReview {
  attempt: VivaAttempt
  questionGrades: QuestionGrade[]
}

/**
 * Backend trả `null` cho trường chưa có giá trị (vd totalFinalScore khi chưa chốt điểm),
 * còn các trang đang kiểm tra bằng `=== undefined` và `??`. Bỏ hết các trường null để hai bên khớp nhau.
 */
function dropNulls<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => dropNulls(item)) as unknown as T
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item !== null) result[key] = dropNulls(item)
    }
    return result as T
  }
  return value
}

export const gradingService = {
  /** GET /grading/attempts -> các lượt thi đã thi xong của những phiên thi do mình tạo (admin: mọi phiên) */
  async getExamAttempts(examId?: string): Promise<VivaAttempt[]> {
    const attempts = dropNulls(await apiRequest<VivaAttempt[]>('/grading/attempts'))
    return examId ? attempts.filter((attempt) => attempt.examId === examId) : attempts
  },

  /** GET /grading/attempts/{attemptId} -> điểm từng câu, từng tiêu chí và nội dung hỏi - đáp */
  async getAttemptReviewDetail(attemptId: string): Promise<AttemptReview> {
    return dropNulls(await apiRequest<AttemptReview>(`/grading/attempts/${encodeURIComponent(attemptId)}`))
  },

  /**
   * PUT /grading/question-grades/{id} -> giảng viên chốt điểm 1 câu.
   * Lệch quá 2 điểm so với điểm AI gợi ý thì backend bắt buộc có ghi chú (BR-GRADE-002).
   */
  async saveQuestionGrade(
    questionGradeId: string,
    data: { finalScore: number; lecturerNote?: string },
  ): Promise<QuestionGrade> {
    return dropNulls(
      await apiRequest<QuestionGrade>(`/grading/question-grades/${encodeURIComponent(questionGradeId)}`, {
        method: 'PUT',
        body: { finalScore: data.finalScore, lecturerNote: data.lecturerNote ?? '' },
      }),
    )
  },

  /** POST /grading/attempts/{attemptId}/publish -> công bố kết quả, mọi câu phải được chốt điểm trước (BR-GRADE-003) */
  async publishAttemptResults(attemptId: string): Promise<VivaAttempt> {
    return dropNulls(
      await apiRequest<VivaAttempt>(`/grading/attempts/${encodeURIComponent(attemptId)}/publish`, { method: 'POST' }),
    )
  },

  /**
   * POST /grading/attempts/{attemptId}/regrade -> AI chấm lại các câu giảng viên chưa chốt điểm.
   * AI chấm ngầm: lượt thi về trạng thái NONE rồi GRADING, vài giây sau tải lại để xem kết quả.
   */
  async requestRegrade(attemptId: string): Promise<VivaAttempt> {
    return dropNulls(
      await apiRequest<VivaAttempt>(`/grading/attempts/${encodeURIComponent(attemptId)}/regrade`, { method: 'POST' }),
    )
  },

  /** GET /student/attempts/{attemptId}/result -> kết quả lượt thi của mình, chỉ khi đã công bố */
  async getStudentAttemptResult(attemptId: string, _studentId?: string): Promise<AttemptReview> {
    return dropNulls(await apiRequest<AttemptReview>(`/student/attempts/${encodeURIComponent(attemptId)}/result`))
  },

  /** GET /student/attempts -> các lượt thi đã thi xong của mình (điểm chỉ có khi đã công bố) */
  async getStudentCompletedAttempts(_studentId?: string): Promise<VivaAttempt[]> {
    return dropNulls(await apiRequest<VivaAttempt[]>('/student/attempts'))
  },

  /* ---------- Phúc khảo (StudentAppealController và GradingController) ---------- */

  /**
   * POST /student/appeals -> sinh viên gửi đơn phúc khảo điểm 1 câu của lượt thi đã công bố.
   * Mỗi câu chỉ có 1 đơn đang chờ xử lý; lý do tối thiểu 15 ký tự.
   */
  async submitAppeal(data: { questionGradeId: string; reason: string }): Promise<GradeAppeal> {
    return dropNulls(
      await apiRequest<GradeAppeal>('/student/appeals', {
        method: 'POST',
        body: { questionGradeId: data.questionGradeId, reason: data.reason },
      }),
    )
  },

  /** GET /student/appeals -> các đơn phúc khảo của mình, mới nhất trước */
  async getMyAppeals(): Promise<GradeAppeal[]> {
    return dropNulls(await apiRequest<GradeAppeal[]>('/student/appeals'))
  },

  /** GET /grading/appeals -> đơn phúc khảo của các phiên thi do mình tạo (admin: mọi phiên) */
  async getAppeals(): Promise<GradeAppeal[]> {
    return dropNulls(await apiRequest<GradeAppeal[]>('/grading/appeals'))
  },

  /**
   * PUT /grading/appeals/{appealId} -> giảng viên xử lý đơn.
   * ACCEPTED: bắt buộc có scoreAfter, điểm câu hỏi và tổng điểm lượt thi được cập nhật theo.
   * REJECTED: điểm giữ nguyên.
   */
  async resolveAppeal(
    appealId: string,
    action: 'ACCEPTED' | 'REJECTED',
    data: { scoreAfter?: number; response: string },
  ): Promise<GradeAppeal> {
    return dropNulls(
      await apiRequest<GradeAppeal>(`/grading/appeals/${encodeURIComponent(appealId)}`, {
        method: 'PUT',
        body: {
          status: action,
          scoreAfter: action === 'ACCEPTED' ? data.scoreAfter : undefined,
          response: data.response,
        },
      }),
    )
  },
}
