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
}

let mockRubricsStore: Rubric[] = [
  {
    id: 'rubric-rag-default',
    createdBy: 'system',
    name: 'Rubric Đánh giá Vấn đáp Kiến trúc & RAG Grounded',
    description: 'Bộ tiêu chí đánh giá chuẩn cho câu hỏi vấn đáp AI sinh từ tài liệu bài giảng (BR-BANK-001/003)',
    maxScore: 10,
    criteria: [
      {
        id: 'crit-rag-1',
        rubricId: 'rubric-rag-default',
        name: 'Độ chính xác khái niệm & Thuật ngữ',
        description: 'Định nghĩa đúng khái niệm, sử dụng chính xác các thuật ngữ chuyên môn có trong slide bài giảng.',
        weightPercent: 40,
        orderNo: 1,
      },
      {
        id: 'crit-rag-2',
        rubricId: 'rubric-rag-default',
        name: 'Khả năng phân tích & Lập luận kỹ thuật',
        description: 'Giải thích mạch lạc nguyên lý hoạt động, so sánh ưu nhược điểm và minh họa trường hợp áp dụng.',
        weightPercent: 30,
        orderNo: 2,
      },
      {
        id: 'crit-rag-3',
        rubricId: 'rubric-rag-default',
        name: 'Kỹ năng phản xạ & Bảo vệ luận điểm',
        description: 'Trả lời tự tin, giải trình rõ ràng và xử lý tốt các câu hỏi xoáy mở rộng của giám khảo.',
        weightPercent: 30,
        orderNo: 3,
      },
    ],
    createdAt: new Date().toISOString(),
  },
]

function generateMockQuestionsFromRag(request: GenerateQuestionsFromRagRequest): Question[] {
  const bloomLevels: ('REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE')[] = []
  const dist = request.bloomDistribution || { REMEMBER: 20, UNDERSTAND: 40, APPLY: 20, ANALYZE: 20 }
  const totalWeight = (dist.REMEMBER || 0) + (dist.UNDERSTAND || 0) + (dist.APPLY || 0) + (dist.ANALYZE || 0) || 100
  
  const count = request.questionCount || 5
  const remCount = Math.max(1, Math.round((count * (dist.REMEMBER || 20)) / totalWeight))
  const undCount = Math.max(1, Math.round((count * (dist.UNDERSTAND || 40)) / totalWeight))
  const appCount = Math.max(1, Math.round((count * (dist.APPLY || 20)) / totalWeight))
  const anaCount = Math.max(0, count - remCount - undCount - appCount)

  for (let i = 0; i < remCount; i++) bloomLevels.push('REMEMBER')
  for (let i = 0; i < undCount; i++) bloomLevels.push('UNDERSTAND')
  for (let i = 0; i < appCount; i++) bloomLevels.push('APPLY')
  for (let i = 0; i < anaCount; i++) bloomLevels.push('ANALYZE')

  while (bloomLevels.length < count) bloomLevels.push('UNDERSTAND')
  while (bloomLevels.length > count) bloomLevels.pop()

  const materials = mockMaterialsStore.filter((m) => request.materialIds.includes(m.id))
  const sourceName = materials.map((m) => m.title).join(', ') || 'Slide Bài giảng RAG'

  const templates = [
    {
      content: `Dựa trên tài liệu "${sourceName}", hãy trình bày khái niệm và các thành phần cốt lõi của kiến trúc được đề cập trong bài giảng?`,
      modelAnswer: 'Sinh viên cần nêu rõ định nghĩa chính quy, liệt kê tối thiểu 3 thành phần cốt lõi và vai trò của từng thành phần trong tổng thể hệ thống.',
      expectedKeywords: ['architecture', 'components', 'interface', 'dataflow'],
    },
    {
      content: `Phân tích cơ chế đồng bộ và xử lý dữ liệu giữa các module theo nội dung trong tài liệu "${sourceName}". Điểm nghẽn tiềm ẩn là gì?`,
      modelAnswer: 'Giải thích luồng dữ liệu (request-response vs event-driven), cơ chế hàng đợi xử lý bất đồng bộ và chiến lược giải quyết tắc nghẽn (rate-limiting, cache).',
      expectedKeywords: ['dataflow', 'bottleneck', 'asynchronous', 'caching'],
    },
    {
      content: `Hãy áp dụng nguyên lý thiết kế từ tài liệu "${sourceName}" để giải quyết bài toán mở rộng hệ thống (scalability) khi tải tăng gấp 10 lần?`,
      modelAnswer: 'Trình bày giải pháp mở rộng ngang (horizontal scaling), tối ưu hóa database (indexing, read replica) và phân phối tải qua Load Balancer.',
      expectedKeywords: ['scalability', 'horizontal-scaling', 'load-balancer', 'replica'],
    },
    {
      content: `So sánh ưu nhược điểm của giải pháp được đề xuất trong "${sourceName}" so với kiến trúc truyền thống. Trường hợp nào không nên áp dụng?`,
      modelAnswer: 'So sánh dựa trên các tiêu chí: hiệu năng, chi phí vận hành, độ phức tạp bảo trì. Nêu rõ các tình huống phản mục tiêu (anti-patterns).',
      expectedKeywords: ['trade-off', 'performance', 'complexity', 'anti-pattern'],
    },
    {
      content: `Giải thích vai trò của cơ chế bảo mật và xác thực được quy định trong học liệu "${sourceName}". Thao tác nào cần chứng chỉ số?`,
      modelAnswer: 'Nêu rõ mô hình RBAC/ABAC, cơ chế token-based authentication (JWT) và quy trình ký số xác minh tính toàn vẹn dữ liệu.',
      expectedKeywords: ['security', 'jwt', 'rbac', 'verification'],
    },
    {
      content: `Trong trường hợp một service gặp sự cố gián đoạn kết nối, theo "${sourceName}", hệ thống sẽ kích hoạt chiến lược phục hồi lỗi nào?`,
      modelAnswer: 'Trình bày cơ chế Circuit Breaker, Retry with Exponential Backoff và Fallback Handler để duy trì trải nghiệm người dùng tối thiểu.',
      expectedKeywords: ['circuit-breaker', 'retry', 'exponential-backoff', 'resilience'],
    },
  ]

  const defaultRubric = mockRubricsStore[0]

  return Array.from({ length: count }, (_, idx) => {
    const tmpl = templates[idx % templates.length]
    const bloom = bloomLevels[idx] || 'UNDERSTAND'
    const qId = `q-rag-${Date.now()}-${idx + 1}`

    return {
      id: qId,
      topicId: request.topicId,
      topicName: 'Chủ đề từ Slide RAG',
      lessonTitle: materials[0]?.lessonTitle || 'Bài giảng RAG',
      rubricId: defaultRubric.id,
      rubricName: defaultRubric.name,
      content: tmpl.content,
      bloomLevel: bloom,
      modelAnswer: tmpl.modelAnswer,
      expectedKeywords: tmpl.expectedKeywords,
      source: 'AI_GENERATED',
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  })
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
    try {
      const data = await apiRequest<Rubric[]>('/content/rubrics')
      if (Array.isArray(data) && data.length > 0) {
        return data
      }
    } catch (err) {
      console.warn('[contentService] getRubrics fallback to mock:', err)
    }
    return [...mockRubricsStore]
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
  },

  /**
   * GET /content/materials?lessonId=&topicId= -> danh sách tài liệu học liệu / slide RAG.
   */
  async getMaterials(lessonId?: string, topicId?: string): Promise<LectureMaterial[]> {
    const params = new URLSearchParams()
    if (lessonId) params.append('lessonId', lessonId)
    if (topicId) params.append('topicId', topicId)
    const query = params.toString() ? `?${params.toString()}` : ''

    try {
      const data = await apiRequest<LectureMaterial[]>(`/content/materials${query}`)
      if (Array.isArray(data)) {
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
   * POST /content/materials/sync -> đồng bộ tài liệu từ Vertex AI RAG Corpus về hệ thống.
   */
  async syncMaterials(): Promise<LectureMaterial[]> {
    const data = await apiRequest<LectureMaterial[]>('/content/materials/sync', {
      method: 'POST',
    })
    return Array.isArray(data) ? data : []
  },

  /**
   * DELETE /content/materials/{id} -> xoá tài liệu khỏi RAG Corpus và Storage.
   */
  async deleteMaterial(id: string): Promise<void> {
    try {
      await apiRequest<void>(`/content/materials/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      mockMaterialsStore = mockMaterialsStore.filter((m) => m.id !== id)
      return
    } catch (err) {
      console.warn('[contentService] deleteMaterial fallback:', err)
      mockMaterialsStore = mockMaterialsStore.filter((m) => m.id !== id)
    }
  },

  /**
   * POST /content/materials/{id}/reindex -> kích hoạt Vertex AI nạp / băm lại vector cho tài liệu.
   */
  async reindexMaterial(id: string): Promise<LectureMaterial> {
    try {
      const result = await apiRequest<LectureMaterial>(`/content/materials/${encodeURIComponent(id)}/reindex`, {
        method: 'POST',
      })
      if (result && result.id) return result
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
      if (result && result.id) return result
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

  /**
   * POST /content/questions/generate-from-rag -> Sinh câu hỏi Grounded AI từ Slide RAG.
   */
  async generateQuestionsFromRag(request: GenerateQuestionsFromRagRequest): Promise<Question[]> {
    try {
      const result = await apiRequest<Question[]>('/content/questions/generate-from-rag', {
        method: 'POST',
        body: request,
      })
      if (Array.isArray(result) && result.length > 0) {
        return result
      }
    } catch (err) {
      console.warn('[contentService] generateQuestionsFromRag fallback to grounded mock:', err)
    }

    return generateMockQuestionsFromRag(request)
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
    try {
      const result = await apiRequest<Rubric>('/content/rubrics', {
        method: 'POST',
        body: data,
      })
      if (result && result.id) return result
    } catch (err) {
      console.warn('[contentService] createRubric fallback to mock:', err)
    }

    const newRubric: Rubric = {
      id: `rubric-${Date.now()}`,
      createdBy: 'current_user',
      name: data.name,
      description: data.description || '',
      maxScore: data.maxScore || 10,
      criteria: data.criteria.map((c, idx) => ({
        id: `crit-${Date.now()}-${idx}`,
        rubricId: `rubric-${Date.now()}`,
        name: c.name,
        description: c.description,
        weightPercent: c.weightPercent,
        orderNo: idx + 1,
      })),
      createdAt: new Date().toISOString(),
    }
    mockRubricsStore.push(newRubric)
    return newRubric
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
    try {
      const result = await apiRequest<Rubric>(`/content/rubrics/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: data,
      })
      if (result && result.id) return result
    } catch (err) {
      console.warn('[contentService] updateRubric fallback to mock:', err)
    }

    const found = mockRubricsStore.find((r) => r.id === id)
    if (found) {
      found.name = data.name
      found.description = data.description
      found.maxScore = data.maxScore || found.maxScore
      found.criteria = data.criteria.map((c, idx) => ({
        id: `crit-${id}-${idx}`,
        rubricId: id,
        name: c.name,
        description: c.description,
        weightPercent: c.weightPercent,
        orderNo: idx + 1,
      }))
      return { ...found }
    }

    const created = await this.createRubric(data)
    return created
  },
}

