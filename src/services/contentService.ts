import { LectureMaterial, Lesson, Question, Rubric, Topic } from '../types'
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

/** Hình vẽ của câu hỏi, dataUrl gắn thẳng vào thẻ img. */
export interface QuestionFigureData {
  questionId: string
  dataUrl: string
  width: number
  height: number
}

/** File được nhận khi gửi câu hỏi / rubric. Giới hạn dung lượng khớp với backend. */
export const IMPORT_ACCEPT = '.pdf,.docx,.txt'
export const IMPORT_MAX_BYTES = 10 * 1024 * 1024

export interface BloomDistribution {
  REMEMBER: number
  UNDERSTAND: number
  APPLY: number
  ANALYZE: number
}

export interface GenerateQuestionsFromRagRequest {
  topicId: string
  materialIds: string[]
  questionCount: number
  bloomDistribution?: Partial<BloomDistribution>
  count?: number
  rememberCount?: number
  understandCount?: number
  applyCount?: number
  analyzeCount?: number
}

export const contentService = {
  /** GET /content/lessons -> bài học của giảng viên đang đăng nhập (admin: tất cả) */
  getLessons(): Promise<Lesson[]> {
    return apiRequest<Lesson[]>('/content/lessons')
  },

  /** POST /content/lessons -> tạo bài học mới */
  createLesson(data: { title: string; description?: string }): Promise<Lesson> {
    return apiRequest<Lesson>('/content/lessons', {
      method: 'POST',
      body: data,
    })
  },

  /** PUT /content/lessons/{id} -> cập nhật bài học */
  updateLesson(id: string, data: { title: string; description?: string }): Promise<Lesson> {
    return apiRequest<Lesson>(`/content/lessons/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: data,
    })
  },

  /** DELETE /content/lessons/{id} -> xoá bài học (khi chưa có chủ đề) */
  deleteLesson(id: string): Promise<void> {
    return apiRequest<void>(`/content/lessons/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  /** GET /content/topics?lessonId= */
  getTopics(lessonId?: string): Promise<Topic[]> {
    const query = lessonId ? `?lessonId=${encodeURIComponent(lessonId)}` : ''
    return apiRequest<Topic[]>(`/content/topics${query}`)
  },

  /** POST /content/topics -> tạo chủ đề mới thuộc bài học */
  createTopic(data: { lessonId: string; name: string; description?: string }): Promise<Topic> {
    return apiRequest<Topic>('/content/topics', {
      method: 'POST',
      body: data,
    })
  },

  /** PUT /content/topics/{id} -> cập nhật chủ đề */
  updateTopic(id: string, data: { name: string; description?: string }): Promise<Topic> {
    return apiRequest<Topic>(`/content/topics/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: data,
    })
  },

  /** DELETE /content/topics/{id} -> xoá chủ đề (khi chưa có câu hỏi) */
  deleteTopic(id: string): Promise<void> {
    return apiRequest<void>(`/content/topics/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  /** GET /content/rubrics -> rubric kèm các tiêu chí */
  async getRubrics(): Promise<Rubric[]> {
    const data = await apiRequest<Rubric[]>('/content/rubrics')
    return Array.isArray(data) ? data : []
  },

  /** GET /content/questions?topicId= */
  getQuestions(topicId?: string): Promise<Question[]> {
    const query = topicId ? `?topicId=${encodeURIComponent(topicId)}` : ''
    return apiRequest<Question[]>(`/content/questions${query}`)
  },

  /** GET /content/questions/{id}/figure -> hình vẽ của câu hỏi (chỉ câu có hasFigure = true) */
  getQuestionFigure(id: string): Promise<QuestionFigureData> {
    return apiRequest<QuestionFigureData>(`/content/questions/${encodeURIComponent(id)}/figure`)
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

  /**
   * GET /content/materials?lessonId=&topicId= -> danh sách tài liệu học liệu.
   */
  async getMaterials(lessonId?: string, topicId?: string): Promise<LectureMaterial[]> {
    const params = new URLSearchParams()
    if (lessonId) params.append('lessonId', lessonId)
    if (topicId) params.append('topicId', topicId)
    const query = params.toString() ? `?${params.toString()}` : ''

    const data = await apiRequest<LectureMaterial[]>(`/content/materials${query}`)
    return Array.isArray(data) ? data : []
  },

  /**
   * POST /content/materials/upload (multipart) -> tải slide/tài liệu lên máy chủ.
   */
  async uploadMaterial(file: File, title: string, lessonId?: string, topicId?: string): Promise<LectureMaterial> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    if (lessonId) formData.append('lessonId', lessonId)
    if (topicId) formData.append('topicId', topicId)

    const result = await apiRequest<LectureMaterial>('/content/materials/upload', {
      method: 'POST',
      formData,
    })
    if (result && result.id) {
      return result
    }
    throw new Error('Không nhận được phản hồi hợp lệ từ server sau khi tải lên.')
  },

  /**
   * POST /content/materials/sync -> đồng bộ danh sách tài liệu.
   */
  async syncMaterials(): Promise<LectureMaterial[]> {
    const data = await apiRequest<LectureMaterial[]>('/content/materials/sync', {
      method: 'POST',
    })
    return Array.isArray(data) ? data : []
  },

  /**
   * DELETE /content/materials/{id} -> xoá tài liệu.
   */
  async deleteMaterial(id: string): Promise<void> {
    await apiRequest<void>(`/content/materials/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  /**
   * POST /content/materials/{id}/reindex -> đọc lại nội dung tài liệu.
   */
  async reindexMaterial(id: string): Promise<LectureMaterial> {
    return apiRequest<LectureMaterial>(`/content/materials/${encodeURIComponent(id)}/reindex`, {
      method: 'POST',
    })
  },

  /**
   * PUT /content/materials/{id} -> cập nhật bài học / chủ đề liên kết của tài liệu.
   */
  async updateMaterial(id: string, lessonId?: string, topicId?: string): Promise<LectureMaterial> {
    return apiRequest<LectureMaterial>(`/content/materials/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: { lessonId, topicId },
    })
  },

  /**
   * POST /content/questions/generate-from-rag -> Sinh câu hỏi AI từ tài liệu.
   */
  async generateQuestionsFromRag(request: GenerateQuestionsFromRagRequest): Promise<Question[]> {
    const result = await apiRequest<Question[]>('/content/questions/generate-from-rag', {
      method: 'POST',
      body: request,
    })
    return Array.isArray(result) ? result : []
  },

  /**
   * POST /content/rubrics -> Tạo rubric thủ công hoặc cập nhật rubric cho AI
   */
  async createRubric(data: {
    name: string
    description?: string
    maxScore?: number
    criteria: { name: string; description: string; weightPercent: number }[]
  }): Promise<Rubric> {
    return apiRequest<Rubric>('/content/rubrics', {
      method: 'POST',
      body: data,
    })
  },

  /**
   * PUT /content/rubrics/{id} -> Cập nhật rubric và các tiêu chí
   */
  async updateRubric(
    id: string,
    data: {
      name: string
      description?: string
      maxScore?: number
      criteria: { name: string; description: string; weightPercent: number }[]
    }
  ): Promise<Rubric> {
    return apiRequest<Rubric>(`/content/rubrics/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: data,
    })
  },
}

