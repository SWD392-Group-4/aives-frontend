import { Lesson, Question, Rubric, Topic } from '../types'
import { apiRequest } from './apiClient'

// Dữ liệu mẫu ban đầu để giao diện hoạt động trực tiếp khi backend đang phát triển
let mockLessons: Lesson[] = [
  {
    id: 'LS001',
    lecturerId: 'LE000001',
    title: 'Kiến trúc phần mềm nâng cao (SWD392)',
    description: 'Bao gồm kiến trúc Microservices, Clean Architecture, Design Patterns và cơ chế Real-time WebSockets.',
    topicCount: 3,
    questionCount: 8,
    createdAt: '2026-09-15T08:00:00Z',
  },
  {
    id: 'LS002',
    lecturerId: 'LE000001',
    title: 'Trí tuệ nhân tạo ứng dụng (AIP491)',
    description: 'Các mô hình ngôn ngữ lớn (LLM), RAG, Prompt Engineering, Speech-to-Text & Text-to-Speech.',
    topicCount: 2,
    questionCount: 6,
    createdAt: '2026-09-20T10:30:00Z',
  },
]

let mockTopics: Topic[] = [
  {
    id: 'TP001',
    lessonId: 'LS001',
    lessonTitle: 'Kiến trúc phần mềm nâng cao (SWD392)',
    name: 'Microservices & Event-Driven Architecture',
    description: 'Giao tiếp bất đồng bộ, Saga pattern, CQRS, Message Brokers.',
    questionCount: 4,
  },
  {
    id: 'TP002',
    lessonId: 'LS001',
    lessonTitle: 'Kiến trúc phần mềm nâng cao (SWD392)',
    name: 'State Machine & Real-Time Viva Room',
    description: 'WebSocket lifecycle, FSM điều phối trạng thái, kiểm soát latency.',
    questionCount: 4,
  },
  {
    id: 'TP003',
    lessonId: 'LS002',
    lessonTitle: 'Trí tuệ nhân tạo ứng dụng (AIP491)',
    name: 'RAG & Vector Embeddings',
    description: 'Chunking tài liệu, similarity search, pgvector, prompt grounding.',
    questionCount: 3,
  },
  {
    id: 'TP004',
    lessonId: 'LS002',
    lessonTitle: 'Trí tuệ nhân tạo ứng dụng (AIP491)',
    name: 'Human-in-the-Loop & LLM Evaluation',
    description: 'Rubric alignment, chống hallucination, chấm điểm kèm trích dẫn chứng cứ.',
    questionCount: 3,
  },
]

let mockRubrics: Rubric[] = [
  {
    id: 'RB001',
    createdBy: 'LE000001',
    name: 'Rubric Kiến trúc & Thiết kế hệ thống (Chuẩn 10 điểm)',
    description: 'Dành cho đánh giá độ sâu kiến trúc, phân tích ưu nhược điểm và xử lý bài toán chịu tải.',
    maxScore: 10,
    criteria: [
      {
        id: 'CR001',
        rubricId: 'RB001',
        name: 'Độ chính xác khái niệm & Thuật ngữ',
        description: 'Giải thích đúng bản chất thuật ngữ kỹ thuật, không mơ hồ hoặc nhầm lẫn khái niệm.',
        weightPercent: 30,
        orderNo: 1,
      },
      {
        id: 'CR002',
        rubricId: 'RB001',
        name: 'Khả năng phân tích đánh đổi (Trade-off Analysis)',
        description: 'Chỉ rõ được ưu điểm, nhược điểm và ngữ cảnh áp dụng thực tế của kiến trúc lựa chọn.',
        weightPercent: 40,
        orderNo: 2,
      },
      {
        id: 'CR003',
        rubricId: 'RB001',
        name: 'Tính lưu loát & Phản xạ khi bị hỏi xoáy',
        description: 'Bảo vệ được quan điểm khi giám khảo AI chất vấn hoặc phát hiện điểm thiếu trong câu trả lời ban đầu.',
        weightPercent: 30,
        orderNo: 3,
      },
    ],
    createdAt: '2026-09-10T14:00:00Z',
  },
  {
    id: 'RB002',
    createdBy: 'LE000001',
    name: 'Rubric Đánh giá Giải pháp AI & RAG',
    description: 'Dành cho môn học AI chuyên sâu: đánh giá hiểu biết về vector search, pipeline và metrics.',
    maxScore: 10,
    criteria: [
      {
        id: 'CR004',
        rubricId: 'RB002',
        name: 'Hiểu biết Pipeline RAG & Embeddings',
        description: 'Nêu rõ quy trình chunking, embedding, vector store và reranking.',
        weightPercent: 50,
        orderNo: 1,
      },
      {
        id: 'CR005',
        rubricId: 'RB002',
        name: 'Biện pháp kiểm soát Hallucination & Bảo mật Prompt',
        description: 'Trình bày cách áp dụng Grounding, System prompt, và kiểm tra output guardrails.',
        weightPercent: 50,
        orderNo: 2,
      },
    ],
    createdAt: '2026-09-12T09:00:00Z',
  },
]

let mockQuestions: Question[] = [
  {
    id: 'QS001',
    topicId: 'TP001',
    topicName: 'Microservices & Event-Driven Architecture',
    lessonTitle: 'Kiến trúc phần mềm nâng cao (SWD392)',
    rubricId: 'RB001',
    rubricName: 'Rubric Kiến trúc & Thiết kế hệ thống (Chuẩn 10 điểm)',
    content: 'Khi chuyển đổi từ Monolith sang Microservices, bạn sẽ giải quyết bài toán giao dịch phân tán (Distributed Transaction) như thế nào? So sánh 2PC và Saga Pattern.',
    bloomLevel: 'ANALYZE',
    modelAnswer: 'Cần phân tích nhược điểm 2PC (blocking, latency cao, single point of failure) và giải pháp Saga Pattern (Choreography hoặc Orchestration) kèm Compensating Transactions khi có bước lỗi.',
    expectedKeywords: ['Saga Pattern', 'Two-Phase Commit', 'Compensating Transaction', 'Choreography', 'Orchestration', 'Eventual Consistency'],
    source: 'MANUAL',
    status: 'APPROVED',
    createdAt: '2026-09-18T10:00:00Z',
  },
  {
    id: 'QS002',
    topicId: 'TP002',
    topicName: 'State Machine & Real-Time Viva Room',
    lessonTitle: 'Kiến trúc phần mềm nâng cao (SWD392)',
    rubricId: 'RB001',
    rubricName: 'Rubric Kiến trúc & Thiết kế hệ thống (Chuẩn 10 điểm)',
    content: 'Tại sao trong hệ thống phỏng vấn trực tiếp AIVES, chúng ta cần cơ chế Finite State Machine (FSM) và bộ đếm thời gian phía Server thay vì tin tưởng Client?',
    bloomLevel: 'APPLY',
    modelAnswer: 'Client có thể bị can thiệp đồng hồ hệ thống (cheat deadline), mất kết nối mạng bất ngờ, hoặc cố tình gửi audio muộn. Server FSM đảm bảo phiên thi nhất quán và duy nhất 1 kết nối active.',
    expectedKeywords: ['State Machine', 'Server-side Timer', 'Cheat Prevention', 'WebSocket Lifecycle', 'Idempotency'],
    source: 'MANUAL',
    status: 'APPROVED',
    createdAt: '2026-09-18T11:00:00Z',
  },
  {
    id: 'QS003',
    topicId: 'TP003',
    topicName: 'RAG & Vector Embeddings',
    lessonTitle: 'Trí tuệ nhân tạo ứng dụng (AIP491)',
    rubricId: 'RB002',
    rubricName: 'Rubric Đánh giá Giải pháp AI & RAG',
    content: 'Trình bày cách xử lý tài liệu khi độ dài vượt quá context window của LLM. Kỹ thuật Chunking nào giúp hạn chế mất mát ngữ cảnh giữa các đoạn?',
    bloomLevel: 'UNDERSTAND',
    modelAnswer: 'Sử dụng Recursive Character Text Splitter có chunk overlap (thường 10-20%), hoặc Semantic Chunking dựa trên khoảng cách ngữ nghĩa giữa các câu.',
    expectedKeywords: ['Chunking', 'Chunk Overlap', 'Context Window', 'Semantic Chunking', 'Vector Embedding'],
    source: 'AI_GENERATED',
    status: 'DRAFT',
    createdAt: '2026-09-22T14:30:00Z',
  },
  {
    id: 'QS004',
    topicId: 'TP004',
    topicName: 'Human-in-the-Loop & LLM Evaluation',
    lessonTitle: 'Trí tuệ nhân tạo ứng dụng (AIP491)',
    rubricId: 'RB002',
    rubricName: 'Rubric Đánh giá Giải pháp AI & RAG',
    content: 'Theo quy định BR-GRADE-002 của AIVES, giảng viên đóng vai trò gì trong việc chốt điểm và hệ thống bắt buộc điều kiện gì nếu giảng viên điều chỉnh điểm chênh lệch lớn?',
    bloomLevel: 'REMEMBER',
    modelAnswer: 'Giảng viên là người quyết định tối cao (HITL). Sinh viên không thấy điểm AI_DRAFT. Nếu giảng viên sửa điểm chênh lệch > 2.0 điểm so với gợi ý của AI, bắt buộc nhập ghi chú lý do (LecturerNote).',
    expectedKeywords: ['Human-in-the-Loop', 'BR-GRADE-002', 'Lệch > 2.0 điểm', 'LecturerNote', 'Chốt điểm'],
    source: 'AI_GENERATED',
    status: 'APPROVED',
    createdAt: '2026-09-22T15:00:00Z',
  },
]

export const contentService = {
  // Lessons
  async getLessons(): Promise<Lesson[]> {
    try {
      const res = await apiRequest<{ data: Lesson[] }>('/content/lessons')
      return res.data
    } catch {
      return [...mockLessons]
    }
  },

  async createLesson(data: { title: string; description?: string }): Promise<Lesson> {
    const newLesson: Lesson = {
      id: `LS${String(mockLessons.length + 1).padStart(3, '0')}`,
      lecturerId: 'LE000001',
      title: data.title,
      description: data.description,
      topicCount: 0,
      questionCount: 0,
      createdAt: new Date().toISOString(),
    }
    mockLessons.unshift(newLesson)
    return newLesson
  },

  // Topics
  async getTopics(lessonId?: string): Promise<Topic[]> {
    try {
      const url = lessonId ? `/content/topics?lessonId=${lessonId}` : '/content/topics'
      const res = await apiRequest<{ data: Topic[] }>(url)
      return res.data
    } catch {
      if (lessonId) {
        return mockTopics.filter((t) => t.lessonId === lessonId)
      }
      return [...mockTopics]
    }
  },

  async createTopic(data: { lessonId: string; name: string; description?: string }): Promise<Topic> {
    const lesson = mockLessons.find((l) => l.id === data.lessonId)
    const newTopic: Topic = {
      id: `TP${String(mockTopics.length + 1).padStart(3, '0')}`,
      lessonId: data.lessonId,
      lessonTitle: lesson?.title,
      name: data.name,
      description: data.description,
      questionCount: 0,
    }
    mockTopics.push(newTopic)
    if (lesson && lesson.topicCount !== undefined) {
      lesson.topicCount += 1
    }
    return newTopic
  },

  // Rubrics
  async getRubrics(): Promise<Rubric[]> {
    try {
      const res = await apiRequest<{ data: Rubric[] }>('/content/rubrics')
      return res.data
    } catch {
      return [...mockRubrics]
    }
  },

  async createRubric(data: {
    name: string
    description?: string
    maxScore?: number
    criteria: Array<{ name: string; description: string; weightPercent: number }>
  }): Promise<Rubric> {
    const totalWeight = data.criteria.reduce((sum, c) => sum + Number(c.weightPercent), 0)
    if (Math.round(totalWeight) !== 100) {
      throw new Error(`Tổng trọng số các tiêu chí phải bằng 100% (Hiện tại: ${totalWeight}%)`)
    }

    const newRubricId = `RB${String(mockRubrics.length + 1).padStart(3, '0')}`
    const newRubric: Rubric = {
      id: newRubricId,
      createdBy: 'LE000001',
      name: data.name,
      description: data.description,
      maxScore: data.maxScore || 10,
      createdAt: new Date().toISOString(),
      criteria: data.criteria.map((c, idx) => ({
        id: `CR${newRubricId}_${idx + 1}`,
        rubricId: newRubricId,
        name: c.name,
        description: c.description,
        weightPercent: Number(c.weightPercent),
        orderNo: idx + 1,
      })),
    }
    mockRubrics.push(newRubric)
    return newRubric
  },

  // Questions
  async getQuestions(topicId?: string): Promise<Question[]> {
    try {
      const url = topicId ? `/content/questions?topicId=${topicId}` : '/content/questions'
      const res = await apiRequest<{ data: Question[] }>(url)
      return res.data
    } catch {
      if (topicId) {
        return mockQuestions.filter((q) => q.topicId === topicId)
      }
      return [...mockQuestions]
    }
  },

  async createQuestion(data: {
    topicId: string
    rubricId?: string
    content: string
    bloomLevel: Question['bloomLevel']
    modelAnswer?: string
    expectedKeywords?: string[]
    source?: Question['source']
    status?: Question['status']
  }): Promise<Question> {
    const topic = mockTopics.find((t) => t.id === data.topicId)
    const rubric = mockRubrics.find((r) => r.id === data.rubricId)

    // BR-BANK-001: Không cho phép APPROVED nếu chưa gán Rubric
    if (data.status === 'APPROVED' && !data.rubricId) {
      throw new Error('Không thể duyệt (APPROVED) câu hỏi nếu chưa gán Rubric chấm điểm!')
    }

    const newQ: Question = {
      id: `QS${String(mockQuestions.length + 1).padStart(3, '0')}`,
      topicId: data.topicId,
      topicName: topic?.name,
      lessonTitle: topic?.lessonTitle,
      rubricId: data.rubricId,
      rubricName: rubric?.name,
      content: data.content,
      bloomLevel: data.bloomLevel,
      modelAnswer: data.modelAnswer,
      expectedKeywords: data.expectedKeywords || [],
      source: data.source || 'MANUAL',
      status: data.status || 'DRAFT',
      createdAt: new Date().toISOString(),
    }
    mockQuestions.unshift(newQ)
    return newQ
  },

  async updateQuestionStatus(id: string, status: Question['status'], rubricId?: string): Promise<Question> {
    const q = mockQuestions.find((item) => item.id === id)
    if (!q) throw new Error('Không tìm thấy câu hỏi')

    if (status === 'APPROVED') {
      const finalRubricId = rubricId || q.rubricId
      if (!finalRubricId) {
        throw new Error('BR-BANK-001: Câu hỏi phải được gắn Rubric trước khi phê duyệt (APPROVED)!')
      }
      const rubric = mockRubrics.find((r) => r.id === finalRubricId)
      q.rubricId = finalRubricId
      q.rubricName = rubric?.name
    }

    q.status = status
    q.updatedAt = new Date().toISOString()
    return q
  },

  // AI Question Generator (RAG workflow)
  async generateAiQuestions(params: {
    topicId: string
    promptKeywords: string
    bloomLevel: Question['bloomLevel']
    count: number
  }): Promise<Question[]> {
    // Giả lập độ trễ gọi AI Service
    await new Promise((res) => setTimeout(res, 1200))

    const topic = mockTopics.find((t) => t.id === params.topicId)
    const generated: Question[] = []

    for (let i = 0; i < params.count; i++) {
      const newId = `QS_AI_${Date.now()}_${i + 1}`
      const item: Question = {
        id: newId,
        topicId: params.topicId,
        topicName: topic?.name || 'Chủ đề môn học',
        lessonTitle: topic?.lessonTitle || 'Môn học AIVES',
        content: `[AI Gợi ý theo ${params.bloomLevel}] Phân tích tầm quan trọng và phương thức triển khai thực tế của "${params.promptKeywords}" trong dự án lớn?`,
        bloomLevel: params.bloomLevel,
        modelAnswer: `Sinh viên cần trình bày rõ cơ chế hoạt động của ${params.promptKeywords}, các tình huống lỗi thường gặp, và giải pháp khắc phục.`,
        expectedKeywords: params.promptKeywords.split(',').map((s) => s.trim()),
        source: 'AI_GENERATED',
        status: 'DRAFT', // BR-BANK-002: AI sinh ra mặc định DRAFT
        createdAt: new Date().toISOString(),
      }
      mockQuestions.unshift(item)
      generated.push(item)
    }

    return generated
  },
}
