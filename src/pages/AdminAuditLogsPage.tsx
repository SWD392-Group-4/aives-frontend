import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import Navbar from '../components/Navbar'
import { ROLE_BADGE_CLASSES } from '../constants/roles'
import { systemService } from '../services/systemService'
import { AuditLog } from '../types'
import { formatDateTime } from '../utils/dateTime'

// Danh sách các hành động kiểm toán
const ACTION_OPTIONS = [
  { value: 'ALL', label: 'Tất cả hành động' },
  { value: 'OVERRIDE_SCORE', label: 'Ghi đè điểm (OVERRIDE_SCORE)' },
  { value: 'CREATE_USER', label: 'Tạo tài khoản (CREATE_USER)' },
  { value: 'UPDATE_STATUS', label: 'Đổi trạng thái (UPDATE_STATUS)' },
  { value: 'PUBLISH_RESULT', label: 'Công bố kết quả (PUBLISH_RESULT)' },
  { value: 'RESOLVE_APPEAL', label: 'Xử lý phúc khảo (RESOLVE_APPEAL)' },
  { value: 'UPDATE_SETTING', label: 'Đổi cấu hình (UPDATE_SETTING)' },
]

// Danh sách các thực thể tác động
const ENTITY_OPTIONS = [
  { value: 'ALL', label: 'Tất cả thực thể' },
  { value: 'users', label: 'Người dùng (users)' },
  { value: 'viva_exams', label: 'Phiên thi (viva_exams)' },
  { value: 'question_grades', label: 'Điểm câu hỏi (question_grades)' },
  { value: 'grade_appeals', label: 'Đơn phúc khảo (grade_appeals)' },
  { value: 'system_settings', label: 'Cấu hình hệ thống (system_settings)' },
]

// Khoảng thời gian
const DATE_RANGE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả thời gian' },
  { value: 'TODAY', label: 'Hôm nay' },
  { value: '7D', label: '7 ngày qua' },
  { value: '30D', label: '30 ngày qua' },
]

function getActionMeta(action: string) {
  switch (action) {
    case 'OVERRIDE_SCORE':
      return {
        label: 'Ghi đè điểm',
        icon: 'edit_note',
        classes: 'bg-tertiary-fixed text-on-tertiary-fixed-variant border border-tertiary/20',
      }
    case 'CREATE_USER':
      return {
        label: 'Tạo tài khoản',
        icon: 'person_add',
        classes: 'bg-primary-fixed text-on-primary-fixed-variant border border-primary/20',
      }
    case 'UPDATE_STATUS':
      return {
        label: 'Đổi trạng thái',
        icon: 'sync_alt',
        classes: 'bg-surface-container-high text-on-surface border border-outline-variant/30',
      }
    case 'PUBLISH_RESULT':
      return {
        label: 'Công bố kết quả',
        icon: 'verified',
        classes: 'bg-secondary-container text-on-secondary-fixed-variant border border-secondary/20',
      }
    case 'RESOLVE_APPEAL':
      return {
        label: 'Xử lý phúc khảo',
        icon: 'gavel',
        classes: 'bg-primary-fixed-dim text-on-primary-fixed border border-primary-fixed/40',
      }
    case 'UPDATE_SETTING':
      return {
        label: 'Cấu hình AI',
        icon: 'tune',
        classes: 'bg-surface-container-highest text-primary border border-primary/20',
      }
    default:
      return {
        label: action,
        icon: 'info',
        classes: 'bg-surface-container text-on-surface-variant',
      }
  }
}

function getInitials(fullName: string) {
  const words = fullName.trim().split(/\s+/)
  const first = words[0]?.[0] ?? ''
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + last).toUpperCase() || 'AD'
}

/* ============ Modal chi tiết đối chiếu Audit Log ============ */
function AuditDetailModal({
  log,
  onClose,
}: {
  log: AuditLog
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const meta = getActionMeta(log.action)

  const handleCopyId = () => {
    navigator.clipboard.writeText(log.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-surface-container-lowest p-6 sm:p-8 shadow-2xl border border-outline-variant/30"
      >
        {/* Header Modal */}
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/20 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-xs font-bold ${meta.classes}`}>
                <Icon name={meta.icon} className="text-sm" />
                {meta.label}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1 text-label-2xs font-mono font-bold text-outline hover:text-on-surface transition-colors"
                title="Sao chép mã log"
              >
                <span>{log.id}</span>
                <Icon name={copied ? 'check' : 'content_copy'} className="text-xs" />
              </button>
            </div>
            <h2 className="mt-2 text-headline-xs sm:text-headline-sm font-bold text-on-surface">
              Chi Tiết Nhật Ký Kiểm Toán
            </h2>
            <p className="mt-0.5 text-body-xs text-on-surface-variant font-mono">
              Thời gian: {formatDateTime(log.timestamp)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        {/* Thông tin tác tử (Actor Information) */}
        <div className="mt-5 rounded-2xl bg-surface-container-low p-4">
          <h3 className="text-label-xs uppercase tracking-wider font-bold text-outline">Người thực hiện (Actor)</h3>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-md font-bold text-primary">
                {getInitials(log.actorName)}
              </div>
              <div>
                <p className="text-label-md font-bold text-on-surface">{log.actorName}</p>
                <p className="text-body-xs text-on-surface-variant">{log.actorEmail ?? log.actorId}</p>
              </div>
            </div>

            <div className="text-right">
              <span className={`inline-block rounded-full px-3 py-0.5 text-label-xs font-semibold ${ROLE_BADGE_CLASSES[log.actorRole ?? 'ADMIN'] ?? 'bg-surface-container text-on-surface'}`}>
                {log.actorRole ?? 'ADMIN'}
              </span>
              <p className="mt-1 font-mono text-label-2xs text-outline">{log.actorId}</p>
            </div>
          </div>

          {log.ipAddress && (
            <div className="mt-3 border-t border-outline-variant/20 pt-2 flex items-center justify-between text-body-xs text-on-surface-variant">
              <span>Địa chỉ IP phát sinh yêu cầu:</span>
              <span className="font-mono font-medium text-on-surface">{log.ipAddress}</span>
            </div>
          )}
        </div>

        {/* Hộp đối chiếu giá trị: Old vs New Value */}
        <div className="mt-5">
          <h3 className="text-label-xs uppercase tracking-wider font-bold text-outline mb-2">
            Đối Chiếu Thay Đổi Dữ Liệu (Old vs New Diff)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cột trái: Giá trị ban đầu */}
            <div className="rounded-2xl border border-error/30 bg-error-container/20 p-4">
              <div className="flex items-center justify-between text-label-xs font-bold text-error">
                <span className="flex items-center gap-1">
                  <Icon name="history" className="text-base" /> Giá trị ban đầu (Old Value)
                </span>
                <span className="rounded bg-error/10 px-1.5 py-0.5 font-mono text-2xs uppercase">Trước</span>
              </div>
              <div className="mt-3 rounded-xl bg-surface-container-lowest p-3 font-mono text-body-sm text-on-surface break-all min-h-16">
                {log.oldValue && log.oldValue !== '-' ? log.oldValue : <em className="text-outline">Không có (Tạo mới)</em>}
              </div>
            </div>

            {/* Cột phải: Giá trị cập nhật */}
            <div className="rounded-2xl border border-secondary/30 bg-secondary-container/20 p-4">
              <div className="flex items-center justify-between text-label-xs font-bold text-secondary">
                <span className="flex items-center gap-1">
                  <Icon name="verified" className="text-base" /> Giá trị cập nhật (New Value)
                </span>
                <span className="rounded bg-secondary/10 px-1.5 py-0.5 font-mono text-2xs uppercase">Sau</span>
              </div>
              <div className="mt-3 rounded-xl bg-surface-container-lowest p-3 font-mono text-body-sm text-secondary font-semibold break-all min-h-16">
                {log.newValue ?? '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Lý do / Ghi chú nghiệp vụ */}
        {log.reason && (
          <div className="mt-5 rounded-2xl bg-surface-container-low p-4">
            <h3 className="text-label-xs uppercase tracking-wider font-bold text-outline">Lý do điều chỉnh / Ghi chú nghiệp vụ</h3>
            <p className="mt-1.5 text-body-sm text-on-surface leading-relaxed">{log.reason}</p>
          </div>
        )}

        {/* Metadata JSON */}
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <div className="mt-5 rounded-2xl bg-surface-container-low p-4">
            <h3 className="text-label-xs uppercase tracking-wider font-bold text-outline mb-2">
              Dữ liệu bổ trợ (Metadata Context)
            </h3>
            <pre className="rounded-xl bg-surface-container-lowest p-3 font-mono text-body-xs text-on-surface overflow-x-auto">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-surface-container px-6 py-2.5 text-label-md font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============ Trang Nhật Ký Kiểm Toán ============ */
export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [entityFilter, setEntityFilter] = useState('ALL')
  const [dateRangeFilter, setDateRangeFilter] = useState('ALL')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  useEffect(() => {
    let cancelled = false
    systemService.getAuditLogs().then((res) => {
      if (!cancelled) {
        setLogs(res)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const [nowTimestamp] = useState(() => Date.now())

  // Lọc dữ liệu đa chiều
  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return logs.filter((item) => {
      // 1. Lọc theo text: Actor Name, Actor Email, Actor ID, Entity ID, Reason
      if (term) {
        const matchText = [
          item.actorName,
          item.actorEmail,
          item.actorId,
          item.entityId,
          item.id,
          item.reason,
        ]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(term))

        if (!matchText) return false
      }

      // 2. Lọc theo Hành động
      if (actionFilter !== 'ALL' && item.action !== actionFilter) {
        return false
      }

      // 3. Lọc theo Thực thể
      if (entityFilter !== 'ALL' && item.entityType !== entityFilter) {
        return false
      }

      // 4. Lọc theo thời gian
      if (dateRangeFilter !== 'ALL') {
        const itemDate = new Date(item.timestamp)
        const diffMs = nowTimestamp - itemDate.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)

        if (dateRangeFilter === 'TODAY' && diffDays > 1) return false
        if (dateRangeFilter === '7D' && diffDays > 7) return false
        if (dateRangeFilter === '30D' && diffDays > 30) return false
      }

      return true
    })
  }, [logs, searchTerm, actionFilter, entityFilter, dateRangeFilter, nowTimestamp])

  // Thống kê nhanh
  const summaryCounts = useMemo(() => {
    const counts = {
      total: logs.length,
      overrides: 0,
      userCreated: 0,
      appeals: 0,
      published: 0,
    }
    for (const l of logs) {
      if (l.action === 'OVERRIDE_SCORE') counts.overrides += 1
      if (l.action === 'CREATE_USER') counts.userCreated += 1
      if (l.action === 'RESOLVE_APPEAL') counts.appeals += 1
      if (l.action === 'PUBLISH_RESULT') counts.published += 1
    }
    return counts
  }, [logs])

  // Xuất file JSON
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(filteredLogs, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `AIVES_Audit_Logs_${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Đặt lại bộ lọc
  const handleResetFilters = () => {
    setSearchTerm('')
    setActionFilter('ALL')
    setEntityFilter('ALL')
    setDateRangeFilter('ALL')
  }

  const isFiltered =
    searchTerm !== '' || actionFilter !== 'ALL' || entityFilter !== 'ALL' || dateRangeFilter !== 'ALL'

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* ============ Header Navigation ============ */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-outline-variant/30 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Link
                to="/admin/dashboard"
                className="inline-flex items-center gap-1 text-body-sm font-semibold text-primary hover:underline"
              >
                <Icon name="arrow_back" className="text-base" /> Bảng điều khiển quản trị
              </Link>
              <span className="text-outline">/</span>
              <span className="text-body-sm text-on-surface-variant">Kiểm toán hệ thống</span>
            </div>
            <h1 className="mt-2 text-headline-md sm:text-headline-lg font-extrabold tracking-tight text-on-surface">
              Nhật Ký Kiểm Toán Hệ Thống (Audit Logs)
            </h1>
            <p className="mt-1 text-body-md text-on-surface-variant max-w-3xl">
              Tra cứu chi tiết toàn bộ vết thao tác nhạy cảm trong bảng <code className="font-mono text-primary font-semibold">audit_logs</code> (UC11): Điều chỉnh điểm, công bố kết quả, duyệt câu hỏi và phân quyền tài khoản theo chuẩn ISO/IEC 27001.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportJson}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-lowest px-4 py-2.5 text-label-sm font-semibold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
              title="Xuất file JSON"
            >
              <Icon name="download" className="text-lg text-primary" />
              <span>Xuất JSON</span>
            </button>
            <Link
              to="/admin/settings"
              className="inline-flex items-center gap-2 rounded-full bg-surface-container px-4 py-2.5 text-label-sm font-semibold text-primary hover:bg-surface-container-high transition-colors"
            >
              <Icon name="tune" className="text-lg" />
              <span>Cấu hình AI</span>
            </Link>
          </div>
        </div>

        {/* ============ Thẻ tóm tắt số liệu nhanh ============ */}
        <section aria-label="Thống kê kiểm toán" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-label-xs uppercase font-bold tracking-wider text-outline">Tổng bản ghi</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-primary">
                <Icon name="receipt_long" className="text-base" />
              </span>
            </div>
            <p className="mt-2 text-headline-sm font-extrabold text-on-surface">{summaryCounts.total}</p>
            <span className="text-label-2xs text-on-surface-variant">Lưu vết liên tục</span>
          </div>

          <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-label-xs uppercase font-bold tracking-wider text-outline">Ghi đè điểm</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tertiary-fixed text-tertiary">
                <Icon name="edit_note" className="text-base" />
              </span>
            </div>
            <p className="mt-2 text-headline-sm font-extrabold text-tertiary">{summaryCounts.overrides}</p>
            <span className="text-label-2xs text-on-surface-variant">Can thiệp điểm (HITL)</span>
          </div>

          <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-label-xs uppercase font-bold tracking-wider text-outline">Đơn phúc khảo</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-primary">
                <Icon name="gavel" className="text-base" />
              </span>
            </div>
            <p className="mt-2 text-headline-sm font-extrabold text-primary">{summaryCounts.appeals}</p>
            <span className="text-label-2xs text-on-surface-variant">Đã thẩm định</span>
          </div>

          <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-label-xs uppercase font-bold tracking-wider text-outline">Công bố kết quả</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-secondary">
                <Icon name="verified" className="text-base" />
              </span>
            </div>
            <p className="mt-2 text-headline-sm font-extrabold text-secondary">{summaryCounts.published}</p>
            <span className="text-label-2xs text-on-surface-variant">Phiên thi chính thức</span>
          </div>
        </section>

        {/* ============ Thanh Bộ Lọc Đa Chiều ============ */}
        <section aria-label="Bộ lọc đa chiều" className="mt-6 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-xs">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            {/* Ô tìm kiếm người thực hiện / đối tượng */}
            <div className="md:col-span-4 relative flex items-center">
              <Icon name="search" className="pointer-events-none absolute left-3.5 text-xl text-outline" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên, email, mã GV/SV, mã log..."
                className="w-full rounded-2xl bg-surface-container-low py-2.5 pr-4 pl-10 text-body-sm text-on-surface outline-none transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container"
              />
            </div>

            {/* Dropdown Hành động */}
            <div className="md:col-span-3">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low py-2.5 px-3.5 text-body-sm text-on-surface outline-none transition-all focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container"
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropdown Thực thể */}
            <div className="md:col-span-3">
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low py-2.5 px-3.5 text-body-sm text-on-surface outline-none transition-all focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container"
              >
                {ENTITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bộ lọc khoảng thời gian */}
            <div className="md:col-span-2">
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low py-2.5 px-3.5 text-body-sm text-on-surface outline-none transition-all focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container"
              >
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isFiltered && (
            <div className="mt-3.5 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-body-xs">
              <span className="text-on-surface-variant">
                Đang lọc: Tìm thấy <strong className="text-primary">{filteredLogs.length}</strong> / {logs.length} bản ghi
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-label-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                <Icon name="clear_all" className="text-sm" /> Đặt lại bộ lọc
              </button>
            </div>
          )}
        </section>

        {/* ============ Bảng Dữ Liệu Audit Logs ============ */}
        <section aria-label="Bảng nhật ký kiểm toán" className="mt-6 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-on-surface-variant">
              <Icon name="progress_activity" className="animate-spin text-3xl text-primary" />
              <p className="text-body-md font-medium">Đang tải nhật ký kiểm toán...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-outline">
                <Icon name="search_off" className="text-3xl" />
              </span>
              <h3 className="text-headline-xs font-bold text-on-surface">Không tìm thấy bản ghi kiểm toán</h3>
              <p className="text-body-sm text-on-surface-variant max-w-md">
                Không có sự kiện nào khớp với tiêu chí tìm kiếm hiện tại. Thử nới lỏng bộ lọc hoặc xóa từ khóa tìm kiếm.
              </p>
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-2 rounded-full bg-primary-container px-5 py-2 text-label-sm font-semibold text-on-primary hover:bg-primary transition-colors"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-surface-container-low text-label-xs uppercase tracking-wider text-outline border-b border-outline-variant/30">
                  <tr>
                    <th scope="col" className="py-4 px-6">Thời gian & Mã</th>
                    <th scope="col" className="py-4 px-4">Người thực hiện (Actor)</th>
                    <th scope="col" className="py-4 px-4">Hành động</th>
                    <th scope="col" className="py-4 px-4">Thực thể & Đối tượng</th>
                    <th scope="col" className="py-4 px-4">Chi tiết thay đổi (Old $\rightarrow$ New)</th>
                    <th scope="col" className="py-4 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-body-sm">
                  {filteredLogs.map((log) => {
                    const meta = getActionMeta(log.action)
                    return (
                      <tr key={log.id} className="hover:bg-surface-container-low/60 transition-colors">
                        {/* Thời gian thực hiện */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="font-mono text-body-xs font-bold text-on-surface block">
                            {formatDateTime(log.timestamp)}
                          </span>
                          <span className="font-mono text-label-2xs text-outline">{log.id}</span>
                        </td>

                        {/* Người thực hiện */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-label-xs font-bold text-primary">
                              {getInitials(log.actorName)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-label-sm font-bold text-on-surface truncate">{log.actorName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`rounded-full px-2 py-0.2 text-label-2xs font-semibold ${ROLE_BADGE_CLASSES[log.actorRole ?? 'ADMIN'] ?? 'bg-surface-container text-on-surface'}`}>
                                  {log.actorRole ?? 'ADMIN'}
                                </span>
                                <span className="font-mono text-label-2xs text-outline truncate">{log.actorId}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Hành động */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-xs font-bold ${meta.classes}`}>
                            <Icon name={meta.icon} className="text-sm" />
                            {meta.label}
                          </span>
                        </td>

                        {/* Thực thể & Đối tượng tác động */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="font-mono text-label-2xs text-outline block uppercase tracking-wider">
                            {log.entityType}
                          </span>
                          <span className="font-mono text-label-sm font-bold text-on-surface">{log.entityId}</span>
                        </td>

                        {/* Chi tiết thay đổi */}
                        <td className="py-4 px-4 max-w-xs sm:max-w-sm truncate text-body-xs">
                          {log.oldValue && log.newValue ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-error line-through truncate max-w-28 sm:max-w-36 font-mono">
                                {log.oldValue}
                              </span>
                              <Icon name="arrow_right_alt" className="text-base text-outline shrink-0" />
                              <span className="font-bold text-secondary truncate max-w-36 sm:max-w-44 font-mono">
                                {log.newValue}
                              </span>
                            </div>
                          ) : (
                            <span className="text-on-surface-variant truncate">{log.reason ?? 'Cập nhật hệ thống'}</span>
                          )}
                          {log.reason && (
                            <p className="text-label-2xs text-outline truncate mt-0.5" title={log.reason}>
                              {log.reason}
                            </p>
                          )}
                        </td>

                        {/* Thao tác xem modal */}
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-label-xs font-semibold text-primary hover:bg-surface-container-high transition-colors"
                          >
                            <Icon name="visibility" className="text-sm" />
                            <span>Đối chiếu</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer bảng */}
          {!loading && filteredLogs.length > 0 && (
            <div className="border-t border-outline-variant/20 bg-surface-container-low/40 px-6 py-4 flex items-center justify-between text-body-xs text-on-surface-variant">
              <span>
                Hiển thị <strong className="text-on-surface">{filteredLogs.length}</strong> sự kiện kiểm toán
              </span>
              <span className="font-mono text-label-2xs text-outline">
                Lưu trữ bất biến (Immutable Audit Trail)
              </span>
            </div>
          )}
        </section>
      </main>

      {/* Modal chi tiết đối chiếu */}
      {selectedLog && (
        <AuditDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  )
}
