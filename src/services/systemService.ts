import { AuditLog, SystemSetting } from '../types'
import { apiRequest } from './apiClient'

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
    id: 'LOG001',
    actorId: 'LE000001',
    actorName: 'TS. Nguyễn Văn Hùng',
    action: 'GRADE_OVERRIDE',
    entityType: 'question_grades',
    entityId: 'QG003',
    oldValue: '9.0',
    newValue: '9.2',
    timestamp: '2026-10-04T10:15:00Z',
  },
  {
    id: 'LOG002',
    actorId: 'LE000001',
    actorName: 'TS. Nguyễn Văn Hùng',
    action: 'PUBLISH_RESULTS',
    entityType: 'viva_attempts',
    entityId: 'AT77192841',
    oldValue: 'PENDING_REVIEW',
    newValue: 'PUBLISHED',
    timestamp: '2026-10-04T10:15:00Z',
  },
  {
    id: 'LOG003',
    actorId: 'AD000001',
    actorName: 'Quản trị viên Hệ thống',
    action: 'UPDATE_SETTING',
    entityType: 'system_settings',
    entityId: 'AI_LLM_MODEL',
    oldValue: 'gemini-1.5-flash',
    newValue: 'gemini-2.5-flash',
    timestamp: '2026-10-01T08:00:00Z',
  },
]

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

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const res = await apiRequest<AuditLog[] | { data: AuditLog[] }>('/admin/audit-logs')
      return Array.isArray(res) ? res : res?.data ?? [...mockAuditLogs]
    } catch {
      return [...mockAuditLogs]
    }
  },
}
