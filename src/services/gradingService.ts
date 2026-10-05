import { GradeAppeal, QuestionGrade, VivaAttempt } from '../types'
import { apiRequest } from './apiClient'

let mockAttempts: VivaAttempt[] = [
  {
    attemptId: 'AT82910482',
    examId: 'AIVES_EXAM_2026_049282',
    title: 'Kiểm tra vấn đáp Kiến trúc phần mềm & AI (Đợt 1)',
    durationMinutes: 45,
    status: 'COMPLETED',
    resultStatus: 'PENDING_REVIEW', // Cần giảng viên thẩm định HITL
    totalAiScore: 8.5,
    totalFinalScore: undefined,
    startedAt: '2026-10-04T08:00:00Z',
    deadlineAt: '2026-10-04T08:45:00Z',
    completedAt: '2026-10-04T08:38:20Z',
    serverTime: new Date().toISOString(),
    remainingSeconds: 0,
    studentId: 'ST002914',
    studentName: 'Trần Minh Quang',
    studentEmail: 'quangtm@fpt.edu.vn',
  },
  {
    attemptId: 'AT77192841',
    examId: 'AIVES_EXAM_2026_049282',
    title: 'Kiểm tra vấn đáp Kiến trúc phần mềm & AI (Đợt 1)',
    durationMinutes: 45,
    status: 'COMPLETED',
    resultStatus: 'PUBLISHED', // Đã duyệt và công bố
    totalAiScore: 9.0,
    totalFinalScore: 9.2,
    startedAt: '2026-10-04T09:00:00Z',
    deadlineAt: '2026-10-04T09:45:00Z',
    completedAt: '2026-10-04T09:35:10Z',
    publishedAt: '2026-10-04T10:15:00Z',
    serverTime: new Date().toISOString(),
    remainingSeconds: 0,
    studentId: 'ST003819',
    studentName: 'Nguyễn Thị Thu Hằng',
    studentEmail: 'hangntt@fpt.edu.vn',
  },
  {
    attemptId: 'AT19283746',
    examId: 'AIVES_EXAM_2026_019284',
    title: 'Vấn đáp giữa kỳ: Trí tuệ nhân tạo (AIP491)',
    durationMinutes: 30,
    status: 'COMPLETED',
    resultStatus: 'PENDING_REVIEW',
    totalAiScore: 6.8,
    totalFinalScore: undefined,
    startedAt: '2026-10-03T14:00:00Z',
    deadlineAt: '2026-10-03T14:30:00Z',
    completedAt: '2026-10-03T14:26:00Z',
    serverTime: new Date().toISOString(),
    remainingSeconds: 0,
    studentId: 'ST009214',
    studentName: 'Lê Hoàng Nam',
    studentEmail: 'namlh@fpt.edu.vn',
  },
]

let mockQuestionGrades: Record<string, QuestionGrade[]> = {
  AT82910482: [
    {
      id: 'QG001',
      attemptId: 'AT82910482',
      questionId: 'QS001',
      questionText: 'Khi chuyển đổi từ Monolith sang Microservices, bạn sẽ giải quyết bài toán giao dịch phân tán (Distributed Transaction) như thế nào? So sánh 2PC và Saga Pattern.',
      bloomLevel: 'ANALYZE',
      weight: 1,
      aiScore: 8.5,
      finalScore: undefined,
      aiStrengths: 'Thí sinh nêu được rõ ràng 2 trường phái Choreography và Orchestration trong Saga Pattern, hiểu đúng tính chất eventual consistency.',
      aiWeaknesses: 'Chưa giải thích sâu về rủi ro của 2PC khi mạng phân vùng (Network Partition) và tại sao 2PC gây tắc nghẽn giao dịch.',
      aiFeedback: 'Câu trả lời rất tốt, mạch lạc và nắm chắc bản chất bù trừ (Compensating Transaction).',
      status: 'AI_DRAFT',
      criteriaGrades: [
        {
          id: 'CG001',
          questionGradeId: 'QG001',
          rubricCriteriaId: 'CR001',
          criterionName: 'Độ chính xác khái niệm & Thuật ngữ',
          weightPercent: 30,
          aiScore: 9.0,
          evidenceQuote: '"Trong Saga, thay vì lock tài nguyên như 2PC, ta chia thành chuỗi các local transactions và rollback bằng compensating transaction..."',
          rationale: 'Khái niệm chuẩn xác 100%, không bị nhầm lẫn.',
        },
        {
          id: 'CG002',
          questionGradeId: 'QG001',
          rubricCriteriaId: 'CR002',
          criterionName: 'Khả năng phân tích đánh đổi (Trade-off Analysis)',
          weightPercent: 40,
          aiScore: 8.0,
          evidenceQuote: '"2PC đảm bảo ACID mạnh nhưng làm tăng latency và dễ sập dây chuyền nếu coordinator chết..."',
          rationale: 'Chỉ rõ được đánh đổi giữa tính nhất quán tức thì và tính khả dụng của hệ thống.',
        },
        {
          id: 'CG003',
          questionGradeId: 'QG001',
          rubricCriteriaId: 'CR003',
          criterionName: 'Tính lưu loát & Phản xạ khi bị hỏi xoáy',
          weightPercent: 30,
          aiScore: 8.5,
          evidenceQuote: '"Khi AI hỏi về lỗi bù trừ (Compensating failure), thí sinh trả lời dùng Dead Letter Queue kết hợp Retry Idempotent."',
          rationale: 'Phản ứng nhanh và đưa ra giải pháp kỹ thuật đúng chuẩn ngành.',
        },
      ],
      exchanges: [
        {
          id: 'EX001',
          attemptId: 'AT82910482',
          questionId: 'QS001',
          depth: 0,
          questionText: 'Khi chuyển đổi từ Monolith sang Microservices, bạn sẽ giải quyết bài toán giao dịch phân tán như thế nào? So sánh 2PC và Saga Pattern.',
          transcript: 'Dạ thưa giám khảo, với microservices thì không nên dùng 2PC vì nó là giao thức khóa hai pha gây blocking. Em sẽ dùng Saga Pattern theo hướng Orchestrator để kiểm soát các local transaction qua event.',
          aiDecision: 'FOLLOW_UP',
          followUpReason: 'INCOMPLETE',
          aiDecisionReason: 'Thí sinh chưa giải thích cơ chế xử lý khi có một bước trong Saga bị thất bại.',
          latencyMs: 1240,
          createdAt: '2026-10-04T08:05:00Z',
        },
        {
          id: 'EX002',
          attemptId: 'AT82910482',
          questionId: 'QS001',
          parentExchangeId: 'EX001',
          depth: 1,
          questionText: 'Nếu một bước ở giữa Saga bị lỗi và một lệnh bù trừ (compensating transaction) cũng thất bại tiếp thì hệ thống xử lý ra sao?',
          transcript: 'Trong trường hợp đó, hệ thống phải đảm bảo tính Idempotent cho lệnh bù trừ, đẩy vào Dead Letter Queue (DLQ) để retry tự động hoặc cảnh báo dashboard cho nhân viên kỹ thuật can thiệp thủ công.',
          aiDecision: 'NEXT',
          aiDecisionReason: 'Câu trả lời bổ sung rất xuất sắc, đủ tiêu chí chuyển câu hỏi tiếp theo.',
          latencyMs: 1420,
          createdAt: '2026-10-04T08:08:30Z',
        },
      ],
    },
    {
      id: 'QG002',
      attemptId: 'AT82910482',
      questionId: 'QS002',
      questionText: 'Tại sao trong hệ thống phỏng vấn trực tiếp AIVES, chúng ta cần cơ chế Finite State Machine (FSM) và bộ đếm thời gian phía Server?',
      bloomLevel: 'APPLY',
      weight: 1,
      aiScore: 8.5,
      finalScore: undefined,
      aiStrengths: 'Nắm được vấn đề bảo mật thời gian thi và chống can thiệp đồng hồ client.',
      aiWeaknesses: 'Chưa đề cập tới tình huống rớt mạng đột ngột (network reconnection).',
      aiFeedback: 'Tốt, đáp ứng hầu hết tiêu chí rubric.',
      status: 'AI_DRAFT',
      criteriaGrades: [
        {
          id: 'CG004',
          questionGradeId: 'QG002',
          rubricCriteriaId: 'CR001',
          criterionName: 'Độ chính xác khái niệm & Thuật ngữ',
          weightPercent: 30,
          aiScore: 9.0,
          evidenceQuote: '"Server-side timer đảm bảo thời gian công bằng cho tất cả thí sinh..."',
          rationale: 'Đúng chuẩn yêu cầu nghiệp vụ.',
        },
        {
          id: 'CG005',
          questionGradeId: 'QG002',
          rubricCriteriaId: 'CR002',
          criterionName: 'Khả năng phân tích đánh đổi (Trade-off Analysis)',
          weightPercent: 40,
          aiScore: 8.0,
          evidenceQuote: '"Nếu để client đếm giờ, thí sinh có thể dùng devtools chỉnh Date.now để kéo dài thời gian."',
          rationale: 'Chỉ rõ lỗ hổng an ninh.',
        },
        {
          id: 'CG006',
          questionGradeId: 'QG002',
          rubricCriteriaId: 'CR003',
          criterionName: 'Tính lưu loát & Phản xạ khi bị hỏi xoáy',
          weightPercent: 30,
          aiScore: 8.5,
          evidenceQuote: '"Thí sinh trình bày lưu loát, dứt khoát không ngập ngừng."',
          rationale: 'Lưu loát tốt.',
        },
      ],
      exchanges: [
        {
          id: 'EX003',
          attemptId: 'AT82910482',
          questionId: 'QS002',
          depth: 0,
          questionText: 'Tại sao cần FSM và bộ đếm thời gian phía Server?',
          transcript: 'Dạ, đồng hồ máy khách không thể tin cậy vì có thể bị hack hoặc lệch múi giờ. Server timer và FSM giúp khóa trạng thái chính xác, ngăn chặn việc nộp bài muộn hoặc vào nhiều tab cùng lúc.',
          aiDecision: 'NEXT',
          aiDecisionReason: 'Câu trả lời đầy đủ, chính xác.',
          latencyMs: 1100,
          createdAt: '2026-10-04T08:14:00Z',
        },
      ],
    },
  ],
  AT77192841: [
    {
      id: 'QG003',
      attemptId: 'AT77192841',
      questionId: 'QS001',
      questionText: 'Khi chuyển đổi từ Monolith sang Microservices, bạn sẽ giải quyết bài toán giao dịch phân tán như thế nào? So sánh 2PC và Saga Pattern.',
      bloomLevel: 'ANALYZE',
      weight: 1,
      aiScore: 9.0,
      finalScore: 9.2,
      aiStrengths: 'Bài làm hoàn hảo, đối chiếu sâu sắc giữa ACID và BASE theorem.',
      aiWeaknesses: 'Không có điểm yếu đáng kể.',
      aiFeedback: 'Rất xuất sắc.',
      lecturerNote: 'Thí sinh trả lời tự tin, giọng điệu mạch lạc, tôi cộng thêm 0.2đ khuyến khích.',
      status: 'APPROVED',
      gradedBy: 'LE000001',
      gradedByName: 'TS. Nguyễn Văn Hùng',
      gradedAt: '2026-10-04T10:15:00Z',
      criteriaGrades: [
        {
          id: 'CG007',
          questionGradeId: 'QG003',
          rubricCriteriaId: 'CR001',
          criterionName: 'Độ chính xác khái niệm & Thuật ngữ',
          weightPercent: 30,
          aiScore: 9.5,
          finalScore: 9.5,
          evidenceQuote: '"Phân biệt chuẩn xác giữa ACID và BASE..."',
          rationale: 'Rất chuẩn xác.',
        },
        {
          id: 'CG008',
          questionGradeId: 'QG003',
          rubricCriteriaId: 'CR002',
          criterionName: 'Khả năng phân tích đánh đổi (Trade-off Analysis)',
          weightPercent: 40,
          aiScore: 9.0,
          finalScore: 9.0,
          evidenceQuote: '"Vẽ rõ sơ đồ chuyển đổi..."',
          rationale: 'Phân tích đa chiều.',
        },
        {
          id: 'CG009',
          questionGradeId: 'QG003',
          rubricCriteriaId: 'CR003',
          criterionName: 'Tính lưu loát & Phản xạ khi bị hỏi xoáy',
          weightPercent: 30,
          aiScore: 8.5,
          finalScore: 9.0,
          evidenceQuote: '"Trả lời tự tin và phản biện rất logic."',
          rationale: 'Xuất sắc.',
        },
      ],
      exchanges: [],
    },
  ],
}

let mockAppeals: GradeAppeal[] = [
  {
    id: 'AP001',
    questionGradeId: 'QG001',
    questionText: 'Khi chuyển đổi từ Monolith sang Microservices, bạn sẽ giải quyết bài toán giao dịch phân tán như thế nào?',
    attemptId: 'AT82910482',
    examTitle: 'Kiểm tra vấn đáp Kiến trúc phần mềm & AI (Đợt 1)',
    studentId: 'ST002914',
    studentName: 'Trần Minh Quang',
    reason: 'Kính thưa thầy/cô, ở lượt hỏi xoáy câu 1, em đã nêu rõ giải pháp sử dụng Idempotent Message Receiver và Dead Letter Queue, tuy nhiên điểm AI cho tiêu chí phản xạ chỉ được 8.5. Kính mong thầy cô xem lại đoạn transcript giúp em ạ.',
    status: 'PENDING',
    scoreBefore: 8.5,
    createdAt: '2026-10-04T11:00:00Z',
  },
]

export const gradingService = {
  // Lấy danh sách lượt thi của một phiên thi (cho giảng viên)
  async getExamAttempts(examId?: string): Promise<VivaAttempt[]> {
    try {
      const url = examId ? `/exam-sessions/${examId}/attempts` : '/grading/attempts'
      const res = await apiRequest<VivaAttempt[] | { data: VivaAttempt[] }>(url)
      const list = Array.isArray(res) ? res : res?.data ?? []
      if (list.length > 0) {
        return examId ? list.filter((a) => a.examId === examId) : list
      }
      return examId ? mockAttempts.filter((a) => a.examId === examId) : [...mockAttempts]
    } catch {
      if (examId) {
        return mockAttempts.filter((a) => a.examId === examId)
      }
      return [...mockAttempts]
    }
  },

  // Lấy chi tiết lượt thi để chấm điểm HITL
  async getAttemptReviewDetail(attemptId: string): Promise<{
    attempt: VivaAttempt
    questionGrades: QuestionGrade[]
  }> {
    const attempt = mockAttempts.find((a) => a.attemptId === attemptId)
    if (!attempt) throw new Error('Không tìm thấy lượt thi')

    const questionGrades = mockQuestionGrades[attemptId] || []
    return {
      attempt,
      questionGrades,
    }
  },

  // Giảng viên lưu điểm thẩm định & duyệt từng câu (BR-GRADE-002)
  async saveQuestionGrade(
    questionGradeId: string,
    data: {
      finalScore: number
      lecturerNote?: string
    }
  ): Promise<QuestionGrade> {
    for (const key of Object.keys(mockQuestionGrades)) {
      const qg = mockQuestionGrades[key].find((q) => q.id === questionGradeId)
      if (qg) {
        const diff = Math.abs(data.finalScore - (qg.aiScore || 0))
        // BR-GRADE-002: Nếu chênh lệch > 2.0 điểm bắt buộc nhập lecturerNote
        if (diff > 2.0 && (!data.lecturerNote || data.lecturerNote.trim().length < 5)) {
          throw new Error('BR-GRADE-002: Điểm điều chỉnh lệch trên 2.0 so với gợi ý AI. Bắt buộc nhập ghi chú giải trình!')
        }

        qg.finalScore = data.finalScore
        qg.lecturerNote = data.lecturerNote
        qg.status = 'APPROVED'
        qg.gradedAt = new Date().toISOString()
        qg.gradedByName = 'Giảng viên chấm thi'
        return qg
      }
    }
    throw new Error('Không tìm thấy câu hỏi chấm điểm')
  },

  // Giảng viên chốt và công bố kết quả (BR-GRADE-003)
  async publishAttemptResults(attemptId: string): Promise<VivaAttempt> {
    const attempt = mockAttempts.find((a) => a.attemptId === attemptId)
    if (!attempt) throw new Error('Không tìm thấy lượt thi')

    const qgs = mockQuestionGrades[attemptId] || []
    const unapproved = qgs.filter((q) => q.status !== 'APPROVED')
    if (unapproved.length > 0) {
      throw new Error(`Còn ${unapproved.length} câu chưa được giảng viên duyệt điểm. Vui lòng duyệt tất cả trước khi công bố!`)
    }

    // Tính điểm tổng kết
    const sumFinal = qgs.reduce((sum, q) => sum + (q.finalScore ?? q.aiScore ?? 0) * q.weight, 0)
    const sumWeight = qgs.reduce((sum, q) => sum + q.weight, 0)
    const total = sumWeight > 0 ? Number((sumFinal / sumWeight).toFixed(2)) : 0

    attempt.totalFinalScore = total
    attempt.resultStatus = 'PUBLISHED'
    attempt.publishedAt = new Date().toISOString()
    return attempt
  },

  // Sinh viên xem kết quả lượt thi của mình
  async getStudentAttemptResult(attemptId: string, _studentId: string): Promise<{
    attempt: VivaAttempt
    questionGrades: QuestionGrade[]
  }> {
    const attempt = mockAttempts.find((a) => a.attemptId === attemptId)
    if (!attempt) throw new Error('Không tìm thấy kết quả lượt thi')

    // BR-AUTH-002 & BR-GRADE-003: Sinh viên chỉ xem được khi đã PUBLISHED
    if (attempt.resultStatus !== 'PUBLISHED') {
      throw new Error('Kết quả bài thi đang trong quá trình thẩm định của Giảng viên (Chưa công bố).')
    }

    return {
      attempt,
      questionGrades: mockQuestionGrades[attemptId] || [],
    }
  },

  // Lấy các bài thi sinh viên đã hoàn thành
  async getStudentCompletedAttempts(_studentId?: string): Promise<VivaAttempt[]> {
    return mockAttempts.filter((a) => a.status === 'COMPLETED')
  },

  // Sinh viên nộp đơn phúc khảo
  async submitAppeal(data: {
    questionGradeId: string
    attemptId: string
    reason: string
    scoreBefore: number
  }): Promise<GradeAppeal> {
    const newAppeal: GradeAppeal = {
      id: `AP${String(mockAppeals.length + 1).padStart(3, '0')}`,
      questionGradeId: data.questionGradeId,
      attemptId: data.attemptId,
      studentId: 'ST002914',
      studentName: 'Trần Minh Quang',
      reason: data.reason,
      status: 'PENDING',
      scoreBefore: data.scoreBefore,
      createdAt: new Date().toISOString(),
    }
    mockAppeals.unshift(newAppeal)
    return newAppeal
  },

  // Giảng viên lấy danh sách phúc khảo
  async getAppeals(): Promise<GradeAppeal[]> {
    return [...mockAppeals]
  },

  // Giảng viên xử lý phúc khảo
  async resolveAppeal(
    appealId: string,
    action: 'ACCEPTED' | 'REJECTED',
    data: { scoreAfter?: number; response: string }
  ): Promise<GradeAppeal> {
    const appeal = mockAppeals.find((a) => a.id === appealId)
    if (!appeal) throw new Error('Không tìm thấy đơn phúc khảo')

    appeal.status = action
    appeal.scoreAfter = action === 'ACCEPTED' ? data.scoreAfter : appeal.scoreBefore
    appeal.response = data.response
    appeal.resolvedAt = new Date().toISOString()
    appeal.resolvedByName = 'TS. Nguyễn Văn Hùng'

    if (action === 'ACCEPTED' && data.scoreAfter !== undefined) {
      // Cập nhật lại điểm câu hỏi
      for (const key of Object.keys(mockQuestionGrades)) {
        const qg = mockQuestionGrades[key].find((q) => q.id === appeal.questionGradeId)
        if (qg) {
          qg.finalScore = data.scoreAfter
        }
      }
    }

    return appeal
  },
}
