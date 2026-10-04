import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import Navbar from '../components/Navbar'
import { systemService } from '../services/systemService'
import { AuditLog, SystemSetting } from '../types'
import { formatDateTime } from '../utils/dateTime'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const loadData = async () => {
    try {
      const [s, a] = await Promise.all([systemService.getSettings(), systemService.getAuditLogs()])
      setSettings(s)
      setAuditLogs(a)
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Lỗi tải cấu hình hệ thống' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const startEdit = (setting: SystemSetting) => {
    setEditingKey(setting.settingKey)
    setEditValue(setting.settingValue)
  }

  const saveEdit = async (key: string) => {
    try {
      const updated = await systemService.updateSetting(key, editValue)
      setSettings((prev) => prev.map((s) => (s.settingKey === key ? updated : s)))
      setEditingKey(null)
      setBanner({ type: 'success', message: `Cập nhật cấu hình "${key}" thành công!` })
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message })
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/40 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Link to="/admin/users" className="text-body-sm text-primary hover:underline flex items-center gap-1">
                <Icon name="arrow_back" className="text-base" /> Quản lý tài khoản
              </Link>
            </div>
            <h1 className="mt-2 text-headline-md font-bold text-on-surface">Cấu hình Hệ thống & Nhật ký Audit (AIVES)</h1>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Tùy biến tham số AI (LLM, STT, TTS), giới hạn an toàn phòng thi và theo dõi vết thao tác quan trọng.
            </p>
          </div>
        </div>

        {banner && (
          <div
            className={`mt-6 flex items-center justify-between rounded-2xl p-4 ${
              banner.type === 'success'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-error-container text-on-error-container'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon name={banner.type === 'success' ? 'check_circle' : 'error'} />
              <span>{banner.message}</span>
            </div>
            <button type="button" onClick={() => setBanner(null)} className="text-label-sm font-bold hover:underline">
              Đóng
            </button>
          </div>
        )}

        {/* 2 Tabs/Sections: Cấu hình tham số & Nhật ký Audit */}
        <div className="mt-8 space-y-10">
          {/* Section 1: Tham số hệ thống */}
          <section className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 sm:p-8 shadow-sm">
            <h2 className="text-headline-xs font-bold text-on-surface flex items-center gap-2 mb-6">
              <Icon name="tune" className="text-primary" /> Tham số cốt lõi AI & Phòng thi
            </h2>

            <div className="divide-y divide-outline-variant/20">
              {settings.map((setting) => {
                const isEditing = editingKey === setting.settingKey

                return (
                  <div key={setting.settingKey} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-label-sm font-bold text-primary">{setting.settingKey}</span>
                        <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-label-xs font-semibold text-outline">
                          {setting.category}
                        </span>
                      </div>
                      <p className="mt-1 text-body-sm text-on-surface-variant">{setting.description}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="rounded-xl border border-primary bg-surface-container-low px-3 py-1.5 text-body-sm text-on-surface"
                          />
                          <button
                            type="button"
                            onClick={() => saveEdit(setting.settingKey)}
                            className="rounded-full bg-primary-container px-3 py-1.5 text-label-xs font-semibold text-on-primary hover:bg-primary"
                          >
                            Lưu
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingKey(null)}
                            className="rounded-full px-3 py-1.5 text-label-xs text-outline hover:bg-surface-container"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-on-surface rounded-xl bg-surface-container px-3.5 py-1.5 text-label-md">
                            {setting.settingValue}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEdit(setting)}
                            className="p-1.5 text-outline hover:text-primary transition-colors"
                            title="Sửa tham số"
                          >
                            <Icon name="edit" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Section 2: Nhật ký Audit */}
          <section className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 sm:p-8 shadow-sm">
            <h2 className="text-headline-xs font-bold text-on-surface flex items-center gap-2 mb-6">
              <Icon name="history_edu" className="text-secondary" /> Nhật ký kiểm toán an toàn (Audit Logs)
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-label-xs uppercase text-outline">
                    <th className="pb-3">Mã log</th>
                    <th className="pb-3">Người thực hiện</th>
                    <th className="pb-3">Hành động</th>
                    <th className="pb-3">Đối tượng</th>
                    <th className="pb-3">Thay đổi (Cũ $\rightarrow$ Mới)</th>
                    <th className="pb-3 text-right">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-body-sm">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-3.5 font-mono font-bold text-primary">{log.id}</td>
                      <td className="py-3.5">
                        <span className="font-semibold text-on-surface block">{log.actorName}</span>
                        <span className="text-body-xs text-outline font-mono">{log.actorId}</span>
                      </td>
                      <td className="py-3.5">
                        <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-label-xs font-bold text-on-surface">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className="text-body-xs font-mono text-outline block">{log.entityType}</span>
                        <span className="font-bold text-on-surface">{log.entityId}</span>
                      </td>
                      <td className="py-3.5 text-body-xs">
                        <span className="text-error line-through">{log.oldValue}</span>
                        <span className="mx-1 text-outline">$\rightarrow$</span>
                        <span className="font-bold text-secondary">{log.newValue}</span>
                      </td>
                      <td className="py-3.5 text-right text-body-xs text-outline font-mono">
                        {formatDateTime(log.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
