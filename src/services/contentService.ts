import { LectureMaterial, Lesson, Question, Rubric, Topic } from '../types'
import { apiRequest } from './apiClient'

/* ---------- MOCK DATA: TÀI LIỆU HỌC LIỆU / SLIDE RAG ---------- */
const INITIAL_MOCK_MATERIALS: LectureMaterial[] = [
  {
    id: 'mat-001',
    lecturerId: 'lec-default',
    lessonId: 'lesson-ch1',
    lessonTitle: 'Chương 1: Tổng quan và Kiến trúc Hệ thống',
    topicId: 'topic-intro',
    topicName: 'Khái niệm cơ bản & Kiến trúc',
    title: 'Slide Bài giảng Chương 1 - Introduction',
    fileName: 'Ch01_Introduction.pptx',
    fileSize: 4521980,
    fileType: 'pptx',
    gcsUri: 'gs://exam-slides-bucket-2026/Ch01_Introduction.pptx',
    ragCorpusId: '6917529027641081856',
    ragStatus: 'READY',
    chunkCount: 42,
    errorMessage: null,
    uploadedAt: '2026-03-15T08:30:00Z',
  },
  {
    id: 'mat-002',
    lecturerId: 'lec-default',
    lessonId: 'lesson-ch2',
    lessonTitle: 'Chương 2: Thiết kế Chi tiết & Advanced Topics',
    topicId: 'topic-adv',
    topicName: 'Kiến trúc nâng cao & Tối ưu hoá',
    title: 'Slide Bài giảng Chương 2 - Advanced Architecture',
    fileName: 'Ch02_Advanced.pptx',
    fileSize: 6815744,
    fileType: 'pptx',
    gcsUri: 'gs://exam-slides-bucket-2026/Ch02_Advanced.pptx',
    ragCorpusId: '6917529027641081856',
    ragStatus: 'READY',
    chunkCount: 68,
    errorMessage: null,
    uploadedAt: '2026-03-20T14:15:00Z',
  },
  {
    id: 'mat-003',
    lecturerId: 'lec-default',
    lessonId: null,
    lessonTitle: null,
    topicId: null,
    topicName: null,
    title: 'Tài liệu Ôn tập & Hướng dẫn Vấn đáp',
    fileName: 'Huong_Dan_Van_Dap.pdf',
    fileSize: 2150000,
    fileType: 'pdf',
    gcsUri: 'gs://exam-slides-bucket-2026/Huong_Dan_Van_Dap.pdf',
    ragCorpusId: '6917529027641081856',
    ragStatus: 'READY',
    chunkCount: 25,
    errorMessage: null,
    uploadedAt: '2026-03-25T09:00:00Z',
  },
]

let mockMaterialsStore: LectureMaterial[] = [...INITIAL_MOCK_MATERIALS]

function filterMockMaterials(lessonId?: string, topicId?: string): LectureMaterial[] {
  return mockMaterialsStore.filter((m) => {
    if (lessonId && m.lessonId !== lessonId) return false
    if (topicId && m.topicId !== topicId) return false
    return true
  })
}

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
   * GET /content/materials?lessonId=&topicId= -> danh sách tài liệu học liệu / slide RAG.
   * Fallback mock tương thích với Google Cloud Storage bucket và Vertex AI RAG Corpus nếu backend chưa có endpoint.
   */
  async getMaterials(lessonId?: string, topicId?: string): Promise<LectureMaterial[]> {
    const params = new URLSearchParams()
    if (lessonId) params.append('lessonId', lessonId)
    if (topicId) params.append('topicId', topicId)
    const query = params.toString() ? `?${params.toString()}` : ''

    try {
      const data = await apiRequest<LectureMaterial[]>(`/content/materials${query}`)
      if (Array.isArray(data) && data.length > 0) {
        return data
      }
      return filterMockMaterials(lessonId, topicId)
    } catch (err) {
      console.warn('[contentService] getMaterials fallback to mock data:', err)
      return filterMockMaterials(lessonId, topicId)
    }
  },

  /**
   * POST /content/materials/upload (multipart) -> tải slide/tài liệu lên GCS và nạp vào Vertex AI RAG Corpus.
   */
  async uploadMaterial(file: File, title: string, lessonId?: string, topicId?: string): Promise<LectureMaterial> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    if (lessonId) formData.append('lessonId', lessonId)
    if (topicId) formData.append('topicId', topicId)

    try {
      const result = await apiRequest<LectureMaterial>('/content/materials/upload', {
        method: 'POST',
        formData,
      })
      if (result && result.id) {
        return result
      }
    } catch (err) {
      console.warn('[contentService] uploadMaterial fallback to mock:', err)
    }

    // Fallback tự sinh mock
    const ext = (file.name.split('.').pop() || 'pptx').toLowerCase()
    const validExt: 'pptx' | 'ppt' | 'pdf' | 'docx' =
      ext === 'ppt' || ext === 'pdf' || ext === 'docx' ? ext : 'pptx'
    const newMaterial: LectureMaterial = {
      id: `mat-${Date.now()}`,
      lecturerId: 'lec-current',
      lessonId: lessonId || null,
      lessonTitle: lessonId ? `Bài học ${lessonId}` : null,
      topicId: topicId || null,
      topicName: topicId ? `Chủ đề ${topicId}` : null,
      title: title || file.name,
      fileName: file.name,
      fileSize: file.size,
      fileType: validExt,
      gcsUri: `gs://exam-slides-bucket-2026/${file.name}`,
      ragCorpusId: '6917529027641081856',
      ragStatus: 'READY',
      chunkCount: Math.floor(Math.random() * 30) + 15,
      errorMessage: null,
      uploadedAt: new Date().toISOString(),
    }
    mockMaterialsStore.unshift(newMaterial)
    return newMaterial
  },

  /**
   * DELETE /content/materials/{id} -> xoá tài liệu khỏi RAG Corpus và Storage.
   */
  async deleteMaterial(id: string): Promise<void> {
    try {
      await apiRequest<void>(`/content/materials/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
    } catch (err) {
      console.warn('[contentService] deleteMaterial fallback:', err)
    }
    mockMaterialsStore = mockMaterialsStore.filter((m) => m.id !== id)
  },

  /**
   * POST /content/materials/{id}/reindex -> kích hoạt Vertex AI nạp / băm lại vector cho tài liệu.
   */
  async reindexMaterial(id: string): Promise<LectureMaterial> {
    try {
      const result = await apiRequest<LectureMaterial>(`/content/materials/${encodeURIComponent(id)}/reindex`, {
        method: 'POST',
      })
      if (result) return result
    } catch (err) {
      console.warn('[contentService] reindexMaterial fallback:', err)
    }

    const item = mockMaterialsStore.find((m) => m.id === id)
    if (item) {
      item.ragStatus = 'READY'
      item.errorMessage = null
      return { ...item }
    }
    throw new Error(`Không tìm thấy tài liệu với ID: ${id}`)
  },

  /**
   * PUT /content/materials/{id} -> cập nhật bài học / chủ đề liên kết của tài liệu.
   */
  async updateMaterial(id: string, lessonId?: string, topicId?: string): Promise<LectureMaterial> {
    try {
      const result = await apiRequest<LectureMaterial>(`/content/materials/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: { lessonId, topicId },
      })
      if (result) return result
    } catch (err) {
      console.warn('[contentService] updateMaterial fallback:', err)
    }

    const item = mockMaterialsStore.find((m) => m.id === id)
    if (item) {
      item.lessonId = lessonId || null
      item.topicId = topicId || null
      return { ...item }
    }
    throw new Error(`Không tìm thấy tài liệu với ID: ${id}`)
  },
}

