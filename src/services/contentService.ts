import { Lesson, Question, Rubric, Topic } from '../types'
import { apiRequest } from './apiClient'

/* ---------- LECTURER / ADMIN: ngân hàng câu hỏi và rubric (ContentController) ---------- */

/**
 * Kết quả đọc 1 file giảng viên gửi lên.
 * File câu hỏi: lesson, topic, questions (NHÁP) và rubric đã chọn (nếu có). File rubric: chỉ có rubrics.
 */
export interface ContentImportResult {
  fileName: string
  lesson?: Lesson | null
  topic?: Topic | null
  rubrics: Rubric[]
  questions: Question[]
}

/** File được nhận khi gửi câu hỏi / rubric. Giới hạn dung lượng khớp với backend. */
export const IMPORT_ACCEPT = '.pdf,.docx,.txt'
export const IMPORT_MAX_BYTES = 10 * 1024 * 1024

export const contentService = {
  /** GET /content/lessons -> bài học của giảng viên đang đăng nhập (admin: tất cả) */
  getLessons(): Promise<Lesson[]> {
    return apiRequest<Lesson[]>('/content/lessons')
  },

  /** GET /content/topics?lessonId= */
  getTopics(lessonId?: string): Promise<Topic[]> {
    const query = lessonId ? `?lessonId=${encodeURIComponent(lessonId)}` : ''
    return apiRequest<Topic[]>(`/content/topics${query}`)
  },

  /** GET /content/rubrics -> rubric kèm các tiêu chí */
  getRubrics(): Promise<Rubric[]> {
    return apiRequest<Rubric[]>('/content/rubrics')
  },

  /** GET /content/questions?topicId= */
  getQuestions(topicId?: string): Promise<Question[]> {
    const query = topicId ? `?topicId=${encodeURIComponent(topicId)}` : ''
    return apiRequest<Question[]>(`/content/questions${query}`)
  },

  /**
   * PUT /content/questions/{id}/status -> câu hỏi sau khi đổi trạng thái.
   * Duyệt (APPROVED) thì câu hỏi phải có rubric: truyền rubricId nếu câu hỏi chưa gắn rubric (BR-BANK-001).
   */
  updateQuestionStatus(id: string, status: Question['status'], rubricId?: string): Promise<Question> {
    return apiRequest<Question>(`/content/questions/${encodeURIComponent(id)}/status`, {
      method: 'PUT',
      body: { status, rubricId },
    })
  },

  /**
   * POST /content/imports/questions (multipart) -> AI đọc file (.pdf, .docx, .txt) chứa câu hỏi + đáp án,
   * tách ra và lưu thành câu hỏi NHÁP. rubricId: rubric gắn cho mọi câu hỏi trong file (bỏ trống thì chọn lúc duyệt).
   * Có thể mất tới khoảng 1 phút với file dài.
   */
  importQuestionFile(file: File, rubricId?: string): Promise<ContentImportResult> {
    const formData = new FormData()
    formData.append('file', file)
    if (rubricId) formData.append('rubricId', rubricId)
    return apiRequest<ContentImportResult>('/content/imports/questions', { method: 'POST', formData })
  },

  /** POST /content/imports/rubrics (multipart) -> AI đọc file tiêu chí chấm điểm và tạo 1 hoặc nhiều rubric. */
  importRubricFile(file: File): Promise<ContentImportResult> {
    const formData = new FormData()
    formData.append('file', file)
    return apiRequest<ContentImportResult>('/content/imports/rubrics', { method: 'POST', formData })
  },
}
