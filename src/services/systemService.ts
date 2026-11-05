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
    actorId: item.actorId || '',
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

/** Dữ liệu thống kê từ GET /admin/dashboard */
export interface AdminDashboardStats {
  totalUsers: number
  totalAdmins: number
  totalLecturers: number
  totalStudents: number
  ongoingExamSessions: number
  aiStatus?: {
    enabled: boolean
    provider?: string
    model?: string
    status?: string
  } | null
}

/** Backend trả {key, value, description, updatedBy, updatedAt}; nhóm hiển thị suy ra từ key. */
function normalizeSetting(item: any): SystemSetting {
  const key: string = item.settingKey ?? item.key ?? ''
  const lower = key.toLowerCase()
  const category: SystemSetting['category'] = lower.includes('tts')
    ? 'TEXT_TO_SPEECH'
    : lower.includes('stt') || lower.includes('speech')
      ? 'SPEECH_RECOGNITION'
      : lower.includes('ai') || lower.includes('llm') || lower.includes('claude') || lower.includes('model')
        ? 'AI_MODELS'
        : 'VIVA_LIMITS'
  return {
    settingKey: key,
    settingValue: item.settingValue ?? item.value ?? '',
    description: item.description ?? undefined,
    category: item.category ?? category,
    updatedBy: item.updatedBy ?? undefined,
    updatedAt: item.updatedAt ?? undefined,
  }
}

function buildAuditQuery(params: AuditLogFilters | undefined, page?: number, size?: number): string {
  const query = new URLSearchParams()
  if (params?.actorId) query.append('actorId', params.actorId)
  if (params?.action && params.action !== 'ALL') query.append('action', params.action)
  if (params?.entityName && params.entityName !== 'ALL') query.append('entityName', params.entityName)
  if (page !== undefined) query.append('page', String(page))
  if (size !== undefined) query.append('size', String(size))
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

function extractItems(res: any): any[] {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.items)) return res.items
  if (Array.isArray(res?.data?.items)) return res.data.items
  if (Array.isArray(res?.data)) return res.data
  return []
}

export const systemService = {
  /** GET /admin/settings */
  async getSettings(): Promise<SystemSetting[]> {
    const res = await apiRequest<any>('/admin/settings')
    return extractItems(res).map(normalizeSetting)
  },

  /** PUT /admin/settings/{key} */
  async updateSetting(key: string, value: string): Promise<SystemSetting> {
    const res = await apiRequest<any>(`/admin/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: { value },
    })
    return normalizeSetting(res)
  },

  /** GET /admin/audit-logs */
  async getAuditLogs(params?: AuditLogFilters): Promise<AuditLog[]> {
    const res = await apiRequest<any>(`/admin/audit-logs${buildAuditQuery(params, params?.page, params?.size)}`)
    return extractItems(res).map(normalizeAuditLog)
  },

  /** GET /admin/audit-logs (phân trang) */
  async getAuditLogsPaged(params?: AuditLogFilters): Promise<AuditLogPageResult> {
    const page = params?.page ?? 0
    const size = params?.size ?? 20
    const res = await apiRequest<any>(`/admin/audit-logs${buildAuditQuery(params, page, size)}`)
    const items = extractItems(res)
    const totalItems = res?.totalItems ?? res?.data?.totalItems ?? items.length
    const totalPages = res?.totalPages ?? res?.data?.totalPages ?? Math.max(1, Math.ceil(totalItems / size))
    return { items: items.map(normalizeAuditLog), totalItems, totalPages, page, size }
  },

  /** GET /admin/dashboard */
  async getDashboardStats(): Promise<AdminDashboardStats> {
    const res = await apiRequest<any>('/admin/dashboard')
    const data = res?.data ?? res ?? {}
    return {
      totalUsers: data.totalUsers ?? 0,
      totalAdmins: data.totalAdmins ?? 0,
      totalLecturers: data.totalLecturers ?? 0,
      totalStudents: data.totalStudents ?? 0,
      ongoingExamSessions: data.ongoingExamSessions ?? 0,
      aiStatus: data.aiStatus ?? null,
    }
  },
}
