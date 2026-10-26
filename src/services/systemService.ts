import { AuditLog, SystemSetting } from '../types'
import { apiRequest } from './apiClient'

export interface AuditLogFilters {
  actorId?: string
  action?: string
  entityName?: string
  page?: number
  size?: number
}

export interface AuditLogPageResult {
  items: AuditLog[]
  totalItems: number
  totalPages: number
  page: number
  size: number
}

function normalizeAuditLog(item: any): AuditLog {
  return {
    id: item.id || `LOG-${Date.now()}`,
    actorId: item.actorId || 'AD000001',
    actorName: item.actorName || item.actorEmail || item.actorId || 'Hệ thống',
    actorEmail: item.actorEmail,
    actorRole: item.actorRole,
    action: item.action || 'UNKNOWN',
    entityType: item.entityType || item.entityName || 'system',
    entityId: item.entityId || '-',
    oldValue: item.oldValue,
    newValue: item.newValue,
    reason: item.reason,
    timestamp: item.timestamp || item.createdAt || new Date().toISOString(),
    ipAddress: item.ipAddress,
    metadata: item.metadata,
  }
}

let mockSettings: SystemSetting[] = [
  {
    settingKey: 'AI_LLM_MODEL',
    settingValue: 'gemini-2.5-flash',
    description: 'Mô hình ngôn ngữ chính dùng cho RAG, hỏi xoáy và chấm điểm rubric.',
    category: 'AI_MODELS',
    updatedAt: '2026-10-01T08:00:00Z',
    updatedBy: 'AD000001',
  },
  {
    settingKey: 'STT_LANGUAGE_CODE',
    settingValue: 'vi-VN',
    description: 'Mã ngôn ngữ nhận dạng giọng nói tiếng Việt từ micro sinh viên.',
    category: 'SPEECH_RECOGNITION',
    updatedAt: '2026-10-01T08:00:00Z',
    updatedBy: 'AD000001',
  },
  {
    settingKey: 'TTS_VOICE_NAME',
    settingValue: 'vi-VN-Neural2-A',
    description: 'Giọng đọc Text-to-Speech tự nhiên cho Giám khảo AI.',
    category: 'TEXT_TO_SPEECH',
    updatedAt: '2026-10-01T08:00:00Z',
    updatedBy: 'AD000001',
  },
  {
    settingKey: 'SILENCE_AUTO_SUBMIT_SECONDS',
    settingValue: '10',
    description: 'Khoảng lặng liên tục tối đa trước khi tự động khóa mic (BR-VIVA-003).',
    category: 'VIVA_LIMITS',
    updatedAt: '2026-10-01T08:00:00Z',
    updatedBy: 'AD000001',
  },
  {
    settingKey: 'MAX_FOLLOW_UP_PER_QUESTION',
    settingValue: '2',
    description: 'Trần số lượt hỏi xoáy tối đa cho mỗi câu hỏi chính (BR-VIVA-001).',
    category: 'VIVA_LIMITS',
    updatedAt: '2026-10-01T08:00:00Z',
    updatedBy: 'AD000001',
  },
]

let mockAuditLogs: AuditLog[] = [
  {
    id: 'LOG-2026-1018-001',
    actorId: 'LE000001',
    actorName: 'TS. Nguyễn Văn Hùng',
    actorEmail: 'hung.nv@fe.edu.vn',
    actorRole: 'LECTURER',
    action: 'OVERRIDE_SCORE',
    entityType: 'question_grades',
    entityId: 'QG003',
    oldValue: '7.0',
    newValue: '8.5',
    reason: 'Thí sinh bổ sung giải thích mạch lạc về kiến trúc Microservices và cơ chế Saga trong phần hỏi xoáy (Follow-up 2). Nâng điểm tiêu chí Kiến trúc & Thiết kế.',
    timestamp: '2026-10-18T09:42:15Z',
    ipAddress: '118.69.182.44',
    metadata: {
      attemptId: 'AT77192841',
      questionId: 'Q-ARCH-01',
      diffDelta: '+1.5',
      justificationMandatory: true,
    },
  },
  {
    id: 'LOG-2026-1018-002',
    actorId: 'AD000001',
    actorName: 'Quản trị viên Hệ thống',
    actorEmail: 'admin@aives.edu.vn',
    actorRole: 'ADMIN',
    action: 'CREATE_USER',
    entityType: 'users',
    entityId: 'LE260192',
    oldValue: '-',
    newValue: 'ThS. Lê Hoàng Long (long.lh@fe.edu.vn)',
    reason: 'Cấp tài khoản mới cho giảng viên Bộ môn Kỹ thuật Phần mềm (SE)',
    timestamp: '2026-10-18T09:15:00Z',
    ipAddress: '14.225.211.89',
    metadata: {
      role: 'LECTURER',
      emailSent: true,
      provisionMethod: 'ADMIN_CONSOLE',
    },
  },
  {
    id: 'LOG-2026-1018-003',
    actorId: 'AD000001',
    actorName: 'Quản trị viên Hệ thống',
    actorEmail: 'admin@aives.edu.vn',
    actorRole: 'ADMIN',
    action: 'UPDATE_STATUS',
    entityType: 'users',
    entityId: 'ST240019',
    oldValue: 'INACTIVE',
    newValue: 'ACTIVE',
    reason: 'Mở khóa tài khoản sau khi sinh viên hoàn tất thủ tục xác minh thông tin sinh viên kỳ Fall 2026',
    timestamp: '2026-10-18T08:50:30Z',
    ipAddress: '14.225.211.89',
    metadata: {
      studentName: 'Nguyễn Văn An',
      studentEmail: 'an.nv@fpt.edu.vn',
    },
  },
  {
    id: 'LOG-2026-1018-004',
    actorId: 'LE000002',
    actorName: 'PGS.TS Trần Bảo Trọng',
    actorEmail: 'trong.tb@fe.edu.vn',
    actorRole: 'LECTURER',
    action: 'PUBLISH_RESULT',
    entityType: 'viva_exams',
    entityId: 'AIVES_EXAM_2026_SE1801',
    oldValue: 'EVALUATING',
    newValue: 'PUBLISHED',
    reason: 'Đã hoàn tất thẩm định toàn bộ 45 bài thi vấn đáp lớp SE1801, phê duyệt công bố bảng điểm chính thức',
    timestamp: '2026-10-18T08:12:44Z',
    ipAddress: '118.69.182.50',
    metadata: {
      totalCandidates: 45,
      passRate: '93.3%',
      averageScore: 7.82,
    },
  },
  {
    id: 'LOG-2026-1017-005',
    actorId: 'LE000001',
    actorName: 'TS. Nguyễn Văn Hùng',
    actorEmail: 'hung.nv@fe.edu.vn',
    actorRole: 'LECTURER',
    action: 'RESOLVE_APPEAL',
    entityType: 'grade_appeals',
    entityId: 'AP0042',
    oldValue: 'PENDING (Điểm: 6.0)',
    newValue: 'ACCEPTED (Điểm mới: 7.5)',
    reason: 'Chấp thuận phúc khảo: Sau khi nghe lại audio turn 3, sinh viên đã nêu đúng định nghĩa ACID và isolation levels',
    timestamp: '2026-10-17T16:30:00Z',
    ipAddress: '118.69.182.44',
    metadata: {
      studentId: 'ST240055',
      studentName: 'Đặng Quốc Huy',
      scoreBefore: 6.0,
      scoreAfter: 7.5,
      reviewedExchangeId: 'EX-Turn-3',
    },
  },
  {
    id: 'LOG-2026-1017-006',
    actorId: 'LE000003',
    actorName: 'ThS. Đỗ Thu Hà',
    actorEmail: 'ha.dt@fe.edu.vn',
    actorRole: 'LECTURER',
    action: 'OVERRIDE_SCORE',
    entityType: 'question_grades',
    entityId: 'QG019',
    oldValue: '8.0',
    newValue: '6.5',
    reason: 'Điều chỉnh hạ điểm: AI tính điểm cao nhưng thí sinh có dấu hiệu đọc tài liệu bên ngoài khi trả lời câu hỏi phụ (độ trễ bất thường)',
    timestamp: '2026-10-17T14:22:10Z',
    ipAddress: '123.30.55.12',
    metadata: {
      attemptId: 'AT88291044',
      questionId: 'Q-DB-04',
      diffDelta: '-1.5',
      justificationMandatory: true,
    },
  },
  {
    id: 'LOG-2026-1017-007',
    actorId: 'AD000001',
    actorName: 'Quản trị viên Hệ thống',
    actorEmail: 'admin@aives.edu.vn',
    actorRole: 'ADMIN',
    action: 'UPDATE_SETTING',
    entityType: 'system_settings',
    entityId: 'AI_LLM_CONFIG',
    oldValue: JSON.stringify(
      {
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        maxOutputTokens: 2048,
        topP: 0.95,
        systemInstruction: 'Giám khảo hỏi thi viva viva-exam chuẩn mực.',
        enforceJsonSchema: false,
      },
      null,
      2,
    ),
    newValue: JSON.stringify(
      {
        model: 'gemini-2.5-flash',
        temperature: 0.4,
        maxOutputTokens: 4096,
        topP: 0.95,
        systemInstruction: 'Giám khảo hỏi thi viva AIVES tuân thủ BR-VIVA-001 và BR-VIVA-003.',
        enforceJsonSchema: true,
        streamingChunkSize: 128,
      },
      null,
      2,
    ),
    reason: 'Nâng cấp mô hình LLM lên phiên bản Gemini 2.5 Flash tối ưu tốc độ và hỗ trợ JSON Schema Enforced theo BR-VIVA-001',
    timestamp: '2026-10-17T10:05:00Z',
    ipAddress: '14.225.211.89',
    metadata: {
      category: 'AI_MODELS',
      previousLatencyMs: 1400,
      targetLatencyMs: 800,
    },
  },
  {
    id: 'LOG-2026-1016-013',
    actorId: 'LE000001',
    actorName: 'TS. Nguyễn Văn Hùng',
    actorEmail: 'hung.nv@fe.edu.vn',
    actorRole: 'LECTURER',
    action: 'UPDATE_RUBRIC',
    entityType: 'course_rubrics',
    entityId: 'RUBRIC-SWE301',
    oldValue: JSON.stringify(
      {
        rubricName: 'Rubric Đánh Giá Vấn Đáp Kiến Trúc Phần Mềm',
        passingThreshold: 5.0,
        criteria: [
          { code: 'CR-01', name: 'Hiểu biết kiến trúc', weight: 40, maxScore: 10 },
          { code: 'CR-02', name: 'Khả năng phản biện', weight: 30, maxScore: 10 },
          { code: 'CR-03', name: 'Kỹ năng trình bày', weight: 30, maxScore: 10 },
        ],
        strictMode: false,
      },
      null,
      2,
    ),
    newValue: JSON.stringify(
      {
        rubricName: 'Rubric Đánh Giá Vấn Đáp Kiến Trúc Phần Mềm Chuẩn Fall 2026',
        passingThreshold: 5.5,
        criteria: [
          { code: 'CR-01', name: 'Hiểu biết kiến trúc hệ thống', weight: 40, maxScore: 10 },
          { code: 'CR-02', name: 'Khả năng phản biện & bảo vệ giải pháp', weight: 40, maxScore: 10 },
          { code: 'CR-03', name: 'Kỹ năng giao tiếp kỹ thuật', weight: 20, maxScore: 10 },
        ],
        strictMode: true,
        aiConfidenceThreshold: 0.85,
      },
      null,
      2,
    ),
    reason: 'Điều chỉnh trọng số tiêu chí phản biện lên 40% và bổ sung ngưỡng tin cậy AI theo phê duyệt của Chủ nhiệm bộ môn',
    timestamp: '2026-10-16T16:20:00Z',
    ipAddress: '118.69.182.44',
    metadata: {
      courseCode: 'SWE301',
      version: 2,
    },
  },
  {
    id: 'LOG-2026-1016-008',
    actorId: 'AD000001',
    actorName: 'Quản trị viên Hệ thống',
    actorEmail: 'admin@aives.edu.vn',
    actorRole: 'ADMIN',
    action: 'UPDATE_SETTING',
    entityType: 'system_settings',
    entityId: 'SILENCE_AUTO_SUBMIT_SECONDS',
    oldValue: '15',
    newValue: '10',
    reason: 'Rút ngắn thời gian đệm im lặng theo đề xuất Hội đồng chuyên môn (BR-VIVA-003)',
    timestamp: '2026-10-16T15:40:00Z',
    ipAddress: '14.225.211.89',
    metadata: {
      category: 'VIVA_LIMITS',
      silenceRule: 'BR-VIVA-003',
    },
  },
  {
    id: 'LOG-2026-1016-009',
    actorId: 'LE000001',
    actorName: 'TS. Nguyễn Văn Hùng',
    actorEmail: 'hung.nv@fe.edu.vn',
    actorRole: 'LECTURER',
    action: 'UPDATE_STATUS',
    entityType: 'viva_exams',
    entityId: 'AIVES_EXAM_2026_IA1702',
    oldValue: 'ONGOING',
    newValue: 'ENDED',
    reason: 'Kết thúc giờ thi ca sáng môn An toàn Thông tin (Information Assurance)',
    timestamp: '2026-10-16T11:35:12Z',
    ipAddress: '118.69.182.44',
    metadata: {
      submittedAttempts: 32,
      scheduledEnd: '11:30:00Z',
    },
  },
  {
    id: 'LOG-2026-1015-010',
    actorId: 'AD000001',
    actorName: 'Quản trị viên Hệ thống',
    actorEmail: 'admin@aives.edu.vn',
    actorRole: 'ADMIN',
    action: 'CREATE_USER',
    entityType: 'users',
    entityId: 'ST240188',
    oldValue: '-',
    newValue: 'Hoàng Đức Minh (minh.hd@fpt.edu.vn)',
    reason: 'Nhập bổ sung danh sách sinh viên lớp Chuyên ngành SE kỳ Fall 2026',
    timestamp: '2026-10-15T14:10:00Z',
    ipAddress: '14.225.211.89',
    metadata: {
      role: 'STUDENT',
      emailSent: true,
      cohort: 'K17',
    },
  },
  {
    id: 'LOG-2026-1015-011',
    actorId: 'LE000002',
    actorName: 'PGS.TS Trần Bảo Trọng',
    actorEmail: 'trong.tb@fe.edu.vn',
    actorRole: 'LECTURER',
    action: 'RESOLVE_APPEAL',
    entityType: 'grade_appeals',
    entityId: 'AP0039',
    oldValue: 'PENDING (Điểm: 5.5)',
    newValue: 'REJECTED (Giữ nguyên: 5.5)',
    reason: 'Từ chối phúc khảo: Câu trả lời chưa làm rõ sự khác biệt giữa Mutex và Semaphore trong môi trường phân tán',
    timestamp: '2026-10-15T09:20:18Z',
    ipAddress: '118.69.182.50',
    metadata: {
      studentId: 'ST240091',
      studentName: 'Vũ Hải Đăng',
      scoreBefore: 5.5,
      scoreAfter: 5.5,
    },
  },
  {
    id: 'LOG-2026-1014-012',
    actorId: 'LE000003',
    actorName: 'ThS. Đỗ Thu Hà',
    actorEmail: 'ha.dt@fe.edu.vn',
    actorRole: 'LECTURER',
    action: 'PUBLISH_RESULT',
    entityType: 'viva_exams',
    entityId: 'AIVES_EXAM_2026_DS1604',
    oldValue: 'EVALUATING',
    newValue: 'PUBLISHED',
    reason: 'Duyệt công bố bảng điểm đợt 1 cho 38 thí sinh môn Cấu trúc dữ liệu & Giải thuật',
    timestamp: '2026-10-14T17:00:00Z',
    ipAddress: '123.30.55.12',
    metadata: {
      totalCandidates: 38,
      passRate: '89.5%',
    },
  },
]

const mockMetrics: import('../types').AdminOperationalMetrics = {
  totalUsers: 1420,
  studentCount: 1200,
  lecturerCount: 210,
  adminCount: 10,
  activeExamsCount: 8,
  onlineCandidatesCount: 142,
  health: {
    database: {
      name: 'PostgreSQL Supabase Cloud',
      status: 'HEALTHY',
      latencyMs: 28,
      detail: 'Kết nối ổn định, Connection Pool: 14/50, Read replica sẵn sàng.',
      uptime: '99.99%',
    },
    speechApi: {
      name: 'Google Cloud Speech (STT / TTS)',
      status: 'HEALTHY',
      latencyMs: 1120,
      detail: 'Streaming gRPC 2 chiều ổn định, nhận dạng vi-VN đạt chuẩn độ trễ <1.5s.',
      uptime: '99.98%',
    },
    geminiModel: {
      name: 'Gemini 2.5 Flash API (JSON Schema)',
      status: 'HEALTHY',
      latencyMs: 840,
      detail: 'Đang phục vụ sinh câu hỏi, hỏi xoáy và chấm điểm rubric đạt chuẩn structured output.',
      uptime: '99.95%',
    },
    backgroundJobs: {
      name: 'Async Evaluation Worker (Spring Batch)',
      status: 'HEALTHY',
      latencyMs: 15,
      detail: '0 tác vụ lỗi, 2 tác vụ đang xử lý, 412 bài thi hoàn tất chấm điểm hôm nay.',
      uptime: '100%',
    },
  },
  quota: {
    stt: {
      name: 'Google Cloud STT (Nhận dạng giọng nói)',
      used: 1450,
      total: 5000,
      unit: 'phút',
      percent: 29,
    },
    tts: {
      name: 'Google Cloud TTS (Giọng đọc Giám khảo AI)',
      used: 480000,
      total: 2000000,
      unit: 'ký tự',
      percent: 24,
    },
    llm: {
      name: 'Gemini 2.5 Flash Token Quota',
      used: 8400000,
      total: 20000000,
      unit: 'tokens',
      percent: 42,
    },
  },
}

export const systemService = {
  async getSettings(): Promise<SystemSetting[]> {
    try {
      const res = await apiRequest<SystemSetting[] | { data: SystemSetting[] }>('/admin/settings')
      return Array.isArray(res) ? res : res?.data ?? [...mockSettings]
    } catch {
      return [...mockSettings]
    }
  },

  async updateSetting(key: string, value: string): Promise<SystemSetting> {
    const s = mockSettings.find((item) => item.settingKey === key)
    if (!s) throw new Error('Không tìm thấy cấu hình')
    s.settingValue = value
    s.updatedAt = new Date().toISOString()
    return s
  },

  async getAuditLogs(params?: AuditLogFilters): Promise<AuditLog[]> {
    try {
      const query = new URLSearchParams()
      if (params?.actorId) query.append('actorId', params.actorId)
      if (params?.action && params.action !== 'ALL') query.append('action', params.action)
      if (params?.entityName && params.entityName !== 'ALL') query.append('entityName', params.entityName)
      if (params?.page !== undefined) query.append('page', String(params.page))
      if (params?.size !== undefined) query.append('size', String(params.size))
      const qs = query.toString() ? `?${query.toString()}` : ''

      const res = await apiRequest<any>(`/admin/audit-logs${qs}`)
      let list: any[] = []
      if (Array.isArray(res)) {
        list = res
      } else if (res && Array.isArray(res.items)) {
        list = res.items
      } else if (res?.data && Array.isArray(res.data.items)) {
        list = res.data.items
      } else if (res?.data && Array.isArray(res.data)) {
        list = res.data
      } else {
        list = [...mockAuditLogs]
      }
      return list.map(normalizeAuditLog)
    } catch {
      let filtered = [...mockAuditLogs]
      if (params?.actorId) {
        const needle = params.actorId.toLowerCase()
        filtered = filtered.filter(
          (l) =>
            l.actorId.toLowerCase().includes(needle) ||
            l.actorEmail?.toLowerCase().includes(needle) ||
            l.actorName?.toLowerCase().includes(needle),
        )
      }
      if (params?.action && params.action !== 'ALL') {
        filtered = filtered.filter((l) => l.action === params.action)
      }
      if (params?.entityName && params.entityName !== 'ALL') {
        const ent = params.entityName.toLowerCase()
        filtered = filtered.filter(
          (l) => l.entityType.toLowerCase() === ent || l.entityType.toLowerCase().startsWith(ent),
        )
      }
      return filtered
    }
  },

  async getAuditLogsPaged(params?: AuditLogFilters): Promise<AuditLogPageResult> {
    const page = params?.page ?? 0
    const size = params?.size ?? 20

    try {
      const query = new URLSearchParams()
      if (params?.actorId) query.append('actorId', params.actorId)
      if (params?.action && params.action !== 'ALL') query.append('action', params.action)
      if (params?.entityName && params.entityName !== 'ALL') query.append('entityName', params.entityName)
      query.append('page', String(page))
      query.append('size', String(size))
      const qs = `?${query.toString()}`

      const res = await apiRequest<any>(`/admin/audit-logs${qs}`)
      const itemsRaw = Array.isArray(res)
        ? res
        : res?.items ?? res?.data?.items ?? (Array.isArray(res?.data) ? res.data : null)

      if (itemsRaw) {
        const totalItems = res?.totalItems ?? res?.data?.totalItems ?? itemsRaw.length
        const totalPages =
          res?.totalPages ?? res?.data?.totalPages ?? Math.max(1, Math.ceil(totalItems / size))
        return {
          items: itemsRaw.map(normalizeAuditLog),
          totalItems,
          totalPages,
          page,
          size,
        }
      }
      throw new Error('Fallback to mock')
    } catch {
      let filtered = [...mockAuditLogs]
      if (params?.actorId) {
        const needle = params.actorId.toLowerCase()
        filtered = filtered.filter(
          (l) =>
            l.actorId.toLowerCase().includes(needle) ||
            l.actorEmail?.toLowerCase().includes(needle) ||
            l.actorName?.toLowerCase().includes(needle),
        )
      }
      if (params?.action && params.action !== 'ALL') {
        filtered = filtered.filter((l) => l.action === params.action)
      }
      if (params?.entityName && params.entityName !== 'ALL') {
        const ent = params.entityName.toLowerCase()
        filtered = filtered.filter(
          (l) => l.entityType.toLowerCase() === ent || l.entityType.toLowerCase().startsWith(ent),
        )
      }
      const totalItems = filtered.length
      const totalPages = Math.max(1, Math.ceil(totalItems / size))
      const paged = filtered.slice(page * size, (page + 1) * size)
      return {
        items: paged,
        totalItems,
        totalPages,
        page,
        size,
      }
    }
  },

  async getOperationalMetrics(): Promise<import('../types').AdminOperationalMetrics> {
    try {
      const res = await apiRequest<import('../types').AdminOperationalMetrics | { data: import('../types').AdminOperationalMetrics }>('/admin/metrics')
      return (res as any)?.data ?? (res as any) ?? { ...mockMetrics }
    } catch {
      return { ...mockMetrics }
    }
  },
}

