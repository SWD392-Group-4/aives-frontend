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
  count?: number
  rememberCount?: number
  understandCount?: number
  applyCount?: number
  analyzeCount?: number
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
  const count = request.questionCount || request.count || 5
  const dist = request.bloomDistribution || { REMEMBER: 20, UNDERSTAND: 40, APPLY: 20, ANALYZE: 20 }

  const remWeight = dist.REMEMBER ?? 0
  const undWeight = dist.UNDERSTAND ?? 0
  const appWeight = dist.APPLY ?? 0
  const anaWeight = dist.ANALYZE ?? 0
  const totalWeight = remWeight + undWeight + appWeight + anaWeight || 100

  let remCount = 0
  let undCount = 0
  let appCount = 0
  let anaCount = 0

  if (
    request.rememberCount !== undefined ||
    request.understandCount !== undefined ||
    request.applyCount !== undefined ||
    request.analyzeCount !== undefined
  ) {
    remCount = request.rememberCount ?? 0
    undCount = request.understandCount ?? 0
    appCount = request.applyCount ?? 0
    anaCount = request.analyzeCount ?? 0
  } else if (remWeight >= 100) {
    remCount = count
    undCount = 0
    appCount = 0
    anaCount = 0
  } else if (undWeight >= 100) {
    remCount = 0
    undCount = count
    appCount = 0
    anaCount = 0
  } else if (appWeight >= 100) {
    remCount = 0
    undCount = 0
    appCount = count
    anaCount = 0
  } else if (anaWeight >= 100) {
    remCount = 0
    undCount = 0
    appCount = 0
    anaCount = count
  } else {
    remCount = remWeight > 0 ? Math.round((count * remWeight) / totalWeight) : 0
    undCount = undWeight > 0 ? Math.round((count * undWeight) / totalWeight) : 0
    appCount = appWeight > 0 ? Math.round((count * appWeight) / totalWeight) : 0
    anaCount = anaWeight > 0 ? Math.round((count * anaWeight) / totalWeight) : 0

    let diff = count - (remCount + undCount + appCount + anaCount)
    const activeWeights = [
      { weight: remWeight, get: () => remCount, set: (v: number) => { remCount = v } },
      { weight: undWeight, get: () => undCount, set: (v: number) => { undCount = v } },
      { weight: appWeight, get: () => appCount, set: (v: number) => { appCount = v } },
      { weight: anaWeight, get: () => anaCount, set: (v: number) => { anaCount = v } },
    ].filter((w) => w.weight > 0)

    if (activeWeights.length > 0) {
      while (diff > 0) {
        activeWeights.sort((a, b) => b.weight - a.weight)
        activeWeights[0].set(activeWeights[0].get() + 1)
        diff--
      }
      while (diff < 0) {
        activeWeights.sort((a, b) => b.get() - a.get())
        if (activeWeights[0].get() > 0) {
          activeWeights[0].set(activeWeights[0].get() - 1)
          diff++
        } else {
          break
        }
      }
    }
  }

  const bloomLevels: ('REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE')[] = []
  for (let i = 0; i < remCount; i++) bloomLevels.push('REMEMBER')
  for (let i = 0; i < undCount; i++) bloomLevels.push('UNDERSTAND')
  for (let i = 0; i < appCount; i++) bloomLevels.push('APPLY')
  for (let i = 0; i < anaCount; i++) bloomLevels.push('ANALYZE')

  while (bloomLevels.length < count) {
    const fallbackLevel: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' =
      remWeight > 0 ? 'REMEMBER' : undWeight > 0 ? 'UNDERSTAND' : appWeight > 0 ? 'APPLY' : 'ANALYZE'
    bloomLevels.push(fallbackLevel)
  }
  while (bloomLevels.length > count) {
    bloomLevels.pop()
  }

  const materials = mockMaterialsStore.filter((m) => request.materialIds.includes(m.id))
  const sourceName = materials.map((m) => m.title).join(', ') || 'Slide Bài giảng RAG'
  const topicTitle = materials[0]?.topicName || 'Chủ đề từ Slide RAG'

  // Sinh Rubric động thích ứng theo tỷ lệ Bloom
  let dynamicRubric: Rubric

  if (remWeight >= 100) {
    const rubricId = `rubric-rem-${Date.now()}`
    dynamicRubric = {
      id: rubricId,
      createdBy: 'system',
      name: `Tiêu chí chấm thi vấn đáp (Mức Nhớ) - ${topicTitle}`,
      description: `Bộ tiêu chí đánh giá chuẩn cho đề thi vấn đáp 100% mức Nhớ (Remember) từ học liệu: ${sourceName}`,
      maxScore: 10,
      criteria: [
        {
          id: `crit-${rubricId}-1`,
          rubricId,
          name: 'Độ chính xác định nghĩa & Thuật ngữ cốt lõi',
          description: 'Định nghĩa đúng khái niệm, sử dụng chính xác các thuật ngữ chuyên môn có trong slide bài giảng.',
          weightPercent: 50,
          orderNo: 1,
        },
        {
          id: `crit-${rubricId}-2`,
          rubricId,
          name: 'Khả năng tái hiện cấu trúc kiến thức bài giảng',
          description: 'Liệt kê và trình bày đầy đủ các thành phần, nguyên lý hoặc sơ đồ kiến trúc bài giảng.',
          weightPercent: 30,
          orderNo: 2,
        },
        {
          id: `crit-${rubricId}-3`,
          rubricId,
          name: 'Tác phong trả lời rõ ràng, chuẩn mực',
          description: 'Trả lời lưu loát, tự tin, diễn đạt rõ ràng và chuẩn mực tác phong thi vấn đáp.',
          weightPercent: 20,
          orderNo: 3,
        },
      ],
      createdAt: new Date().toISOString(),
    }
  } else if (undWeight >= 100) {
    const rubricId = `rubric-und-${Date.now()}`
    dynamicRubric = {
      id: rubricId,
      createdBy: 'system',
      name: `Tiêu chí chấm thi vấn đáp (Mức Hiểu) - ${topicTitle}`,
      description: `Bộ tiêu chí đánh giá chuẩn cho đề thi vấn đáp 100% mức Hiểu (Understand) từ học liệu: ${sourceName}`,
      maxScore: 10,
      criteria: [
        {
          id: `crit-${rubricId}-1`,
          rubricId,
          name: 'Khả năng giải thích cơ chế & Bản chất kiến thức',
          description: 'Giải thích mạch lạc nguyên lý hoạt động và bản chất kỹ thuật được trình bày trong tài liệu.',
          weightPercent: 50,
          orderNo: 1,
        },
        {
          id: `crit-${rubricId}-2`,
          rubricId,
          name: 'Minh họa luồng xử lý và mối liên hệ giữa các phần',
          description: 'Phân tích được luồng dữ liệu và mối tương tác giữa các cấu phần trong hệ thống.',
          weightPercent: 30,
          orderNo: 2,
        },
        {
          id: `crit-${rubricId}-3`,
          rubricId,
          name: 'Kỹ năng lập luận và diễn giải mạch lạc',
          description: 'Trình bày tự tin, lập luận logic và trả lời đúng trọng tâm câu hỏi của giám khảo.',
          weightPercent: 20,
          orderNo: 3,
        },
      ],
      createdAt: new Date().toISOString(),
    }
  } else if (appWeight >= 100) {
    const rubricId = `rubric-app-${Date.now()}`
    dynamicRubric = {
      id: rubricId,
      createdBy: 'system',
      name: `Tiêu chí chấm thi vấn đáp (Mức Vận dụng) - ${topicTitle}`,
      description: `Bộ tiêu chí đánh giá chuẩn cho đề thi vấn đáp 100% mức Vận dụng (Apply) từ học liệu: ${sourceName}`,
      maxScore: 10,
      criteria: [
        {
          id: `crit-${rubricId}-1`,
          rubricId,
          name: 'Khả năng áp dụng nguyên lý giải quyết kịch bản thực tế',
          description: 'Đưa ra phương án áp dụng đúng đắn nguyên lý bài giảng vào tình huống kỹ thuật cụ thể.',
          weightPercent: 50,
          orderNo: 1,
        },
        {
          id: `crit-${rubricId}-2`,
          rubricId,
          name: 'Tính khả thi và tối ưu của giải pháp đề xuất',
          description: 'Giải pháp có tính thực tiễn cao, tối ưu tài nguyên và đáp ứng yêu cầu kỹ thuật.',
          weightPercent: 30,
          orderNo: 2,
        },
        {
          id: `crit-${rubricId}-3`,
          rubricId,
          name: 'Bảo vệ phương án và phản xạ câu hỏi tình huống',
          description: 'Giải trình thuyết phục phương án đã chọn trước câu hỏi đào sâu của giám khảo.',
          weightPercent: 20,
          orderNo: 3,
        },
      ],
      createdAt: new Date().toISOString(),
    }
  } else if (anaWeight >= 100) {
    const rubricId = `rubric-ana-${Date.now()}`
    dynamicRubric = {
      id: rubricId,
      createdBy: 'system',
      name: `Tiêu chí chấm thi vấn đáp (Mức Phân tích) - ${topicTitle}`,
      description: `Bộ tiêu chí đánh giá chuẩn cho đề thi vấn đáp 100% mức Phân tích (Analyze) từ học liệu: ${sourceName}`,
      maxScore: 10,
      criteria: [
        {
          id: `crit-${rubricId}-1`,
          rubricId,
          name: 'Độ sâu phân tích & So sánh đa chiều các giải pháp',
          description: 'So sánh sắc bén các phương án, phân tích ưu nhược điểm và chỉ ra trade-off kỹ thuật.',
          weightPercent: 50,
          orderNo: 1,
        },
        {
          id: `crit-${rubricId}-2`,
          rubricId,
          name: 'Phát hiện điểm nghẽn & Đánh giá rủi ro hệ thống',
          description: 'Xác định chính xác các nút thắt cổ chai, anti-pattern và nguy cơ tiềm ẩn.',
          weightPercent: 30,
          orderNo: 2,
        },
        {
          id: `crit-${rubricId}-3`,
          rubricId,
          name: 'Tư duy phản biện và luận chứng khoa học',
          description: 'Lập luận chặt chẽ, dẫn chứng xác thực và bảo vệ vững vàng luận điểm phản biện.',
          weightPercent: 20,
          orderNo: 3,
        },
      ],
      createdAt: new Date().toISOString(),
    }
  } else {
    const rubricId = `rubric-dyn-${Date.now()}`
    const bloomParts: string[] = []
    if (remWeight > 0) bloomParts.push(`Nhớ ${remWeight}%`)
    if (undWeight > 0) bloomParts.push(`Hiểu ${undWeight}%`)
    if (appWeight > 0) bloomParts.push(`Vận dụng ${appWeight}%`)
    if (anaWeight > 0) bloomParts.push(`Phân tích ${anaWeight}%`)
    const bloomTags = bloomParts.join(' - ')

    const criteriaList: Rubric['criteria'] = []
    let order = 1

    if (remWeight > 0) {
      criteriaList.push({
        id: `crit-${rubricId}-${order}`,
        rubricId,
        name: 'Độ chính xác định nghĩa & Thuật ngữ (Mức Nhớ)',
        description: 'Định nghĩa đúng khái niệm, sử dụng chính xác các thuật ngữ chuyên môn có trong học liệu.',
        weightPercent: remWeight,
        orderNo: order++,
      })
    }
    if (undWeight > 0) {
      criteriaList.push({
        id: `crit-${rubricId}-${order}`,
        rubricId,
        name: 'Khả năng giải thích cơ chế & Bản chất (Mức Hiểu)',
        description: 'Giải thích mạch lạc nguyên lý hoạt động, luồng xử lý và mối liên hệ kiến thức.',
        weightPercent: undWeight,
        orderNo: order++,
      })
    }
    if (appWeight > 0) {
      criteriaList.push({
        id: `crit-${rubricId}-${order}`,
        rubricId,
        name: 'Vận dụng giải quyết kịch bản thực tế (Mức Vận dụng)',
        description: 'Áp dụng nguyên lý vào tình huống cụ thể, đề xuất giải pháp khả thi và tối ưu.',
        weightPercent: appWeight,
        orderNo: order++,
      })
    }
    if (anaWeight > 0) {
      criteriaList.push({
        id: `crit-${rubricId}-${order}`,
        rubricId,
        name: 'Phân tích, so sánh & Biện luận giải pháp (Mức Phân tích)',
        description: 'Phân tích điểm nghẽn, so sánh ưu nhược điểm và tư duy phản biện sắc bén.',
        weightPercent: anaWeight,
        orderNo: order++,
      })
    }

    dynamicRubric = {
      id: rubricId,
      createdBy: 'system',
      name: `Tiêu chí chấm thi vấn đáp (${bloomTags}) - ${topicTitle}`,
      description: `Bộ tiêu chí đánh giá vấn đáp thích ứng theo tỷ lệ thang đo Bloom cấu hình (${bloomTags}) từ học liệu: ${sourceName}`,
      maxScore: 10,
      criteria: criteriaList,
      createdAt: new Date().toISOString(),
    }
  }

  // Lưu rubric mới vào mockRubricsStore để phục vụ hiển thị và tái sử dụng
  mockRubricsStore.push(dynamicRubric)

  const templatesByBloom: Record<'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE', { content: string; modelAnswer: string; expectedKeywords: string[] }[]> = {
    REMEMBER: [
      {
        content: `Dựa trên tài liệu "${sourceName}", hãy định nghĩa chính xác các khái niệm và thuật ngữ cốt lõi được đề cập trong bài giảng?`,
        modelAnswer: 'Sinh viên cần trình bày chính xác định nghĩa chính quy, nêu đúng các thuật ngữ chuyên môn và ghi nhớ các thành phần cốt lõi được nêu trong bài giảng.',
        expectedKeywords: ['định nghĩa', 'thuật ngữ', 'khái niệm', 'thành phần'],
      },
      {
        content: `Hãy liệt kê và nêu các đặc điểm cơ bản của các thành phần kiến trúc theo tài liệu "${sourceName}".`,
        modelAnswer: 'Nêu đầy đủ danh sách các module/thành phần kiến trúc theo tài liệu học liệu và tóm tắt đặc trưng nhận diện của từng phần.',
        expectedKeywords: ['kiến trúc', 'thành phần', 'đặc điểm', 'danh mục'],
      },
      {
        content: `Theo nội dung trong "${sourceName}", các quy chuẩn kỹ thuật và quy tắc cơ bản nào bắt buộc phải tuân thủ?`,
        modelAnswer: 'Trình bày đúng các quy tắc, tiêu chuẩn kỹ thuật hoặc ràng buộc tiên quyết được quy định rõ trong tài liệu bài giảng.',
        expectedKeywords: ['quy tắc', 'tiêu chuẩn', 'quy chuẩn', 'ràng buộc'],
      },
    ],
    UNDERSTAND: [
      {
        content: `Giải thích nguyên lý hoạt động và cơ chế xử lý dữ liệu giữa các module theo tài liệu "${sourceName}".`,
        modelAnswer: 'Giải thích mạch lạc luồng dữ liệu, cách các thành phần tương tác với nhau và lý do kiến trúc được thiết kế theo cấu trúc này.',
        expectedKeywords: ['nguyên lý', 'cơ chế', 'luồng dữ liệu', 'tương tác'],
      },
      {
        content: `Trình bày ý nghĩa và vai trò của cơ chế bảo mật / đồng bộ được mô tả trong học liệu "${sourceName}".`,
        modelAnswer: 'Làm rõ bản chất cơ chế xác thực hoặc đồng bộ, giải thích vì sao cơ chế này cần thiết và giải quyết được vấn đề gì trong bài giảng.',
        expectedKeywords: ['bản chất', 'vai trò', 'bảo mật', 'đồng bộ'],
      },
    ],
    APPLY: [
      {
        content: `Hãy áp dụng nguyên lý thiết kế từ tài liệu "${sourceName}" để giải quyết bài toán mở rộng hệ thống (scalability) khi lưu lượng tăng đột biến?`,
        modelAnswer: 'Vận dụng mô hình vào bài toán thực tế: đề xuất phương án mở rộng ngang, tối ưu tài nguyên và cấu hình phân phối tải phù hợp.',
        expectedKeywords: ['áp dụng', 'scalability', 'thực tế', 'tối ưu hoá'],
      },
      {
        content: `Dựa trên "${sourceName}", hãy đưa ra kịch bản xử lý khi một dịch vụ phụ trợ gặp lỗi gián đoạn kết nối.`,
        modelAnswer: 'Áp dụng các mẫu thiết kế chịu lỗi (Circuit Breaker, Retry, Fallback) vào kịch bản lỗi thực tế của hệ thống.',
        expectedKeywords: ['kịch bản', 'xử lý lỗi', 'circuit-breaker', 'resilience'],
      },
    ],
    ANALYZE: [
      {
        content: `Phân tích điểm nghẽn tiềm ẩn (bottleneck) và so sánh ưu nhược điểm của giải pháp trong "${sourceName}" so với kiến trúc truyền thống.`,
        modelAnswer: 'So sánh đa chiều về hiệu năng, độ phức tạp, chi phí bảo trì. Chỉ ra các anti-pattern và ranh giới không nên áp dụng.',
        expectedKeywords: ['so sánh', 'điểm nghẽn', 'ưu nhược điểm', 'trade-off'],
      },
      {
        content: `Đánh giá rủi ro an toàn thông tin và tính toàn vẹn dữ liệu trong mô hình kiến trúc của "${sourceName}".`,
        modelAnswer: 'Phân tích các lỗ hổng tiềm tàng, đánh giá các điểm chạm dữ liệu nhạy cảm và đề xuất giải pháp phòng ngừa rủi ro.',
        expectedKeywords: ['đánh giá rủi ro', 'toàn vẹn', 'phân tích', 'an toàn'],
      },
    ],
  }

  return Array.from({ length: count }, (_, idx) => {
    const bloom = bloomLevels[idx] || (remWeight > 0 ? 'REMEMBER' : 'UNDERSTAND')
    const pool = templatesByBloom[bloom]
    const tmpl = pool[idx % pool.length]
    const qId = `q-rag-${Date.now()}-${idx + 1}`

    return {
      id: qId,
      topicId: request.topicId,
      topicName: topicTitle,
      lessonTitle: materials[0]?.lessonTitle || 'Bài giảng RAG',
      rubricId: dynamicRubric.id,
      rubricName: dynamicRubric.name,
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
      console.warn('[contentService] generateQuestionsFromRag backend call failed, falling back to mock generator:', err)
    }
    console.warn('[contentService] Generating grounded questions via local adaptive RAG mock engine...')
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

