import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Eye,
  FileJson,
  Filter,
  GitCompare,
  History,
  Layers,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import { ROLE_BADGE_CLASSES } from '../constants/roles'
import { systemService } from '../services/systemService'
import { AuditLog } from '../types'
import { formatDateTime } from '../utils/dateTime'

// Danh mục hành động kiểm toán
const ACTION_OPTIONS = [
  { value: 'ALL', label: 'Tất cả hành động' },
  { value: 'OVERRIDE_SCORE', label: 'Ghi đè điểm (OVERRIDE_SCORE)' },
  { value: 'CREATE_USER', label: 'Tạo tài khoản (CREATE_USER)' },
  { value: 'UPDATE_STATUS', label: 'Đổi trạng thái (UPDATE_STATUS)' },
  { value: 'PUBLISH_RESULT', label: 'Công bố kết quả (PUBLISH_RESULT)' },
  { value: 'RESOLVE_APPEAL', label: 'Xử lý phúc khảo (RESOLVE_APPEAL)' },
  { value: 'UPDATE_SETTING', label: 'Đổi cấu hình (UPDATE_SETTING)' },
  { value: 'UPDATE_RUBRIC', label: 'Cập nhật Rubric (UPDATE_RUBRIC)' },
]

// Danh mục thực thể kiểm toán
const ENTITY_OPTIONS = [
  { value: 'ALL', label: 'Tất cả thực thể' },
  { value: 'users', label: 'Người dùng (users)' },
  { value: 'viva_exams', label: 'Phiên thi (viva_exams)' },
  { value: 'question_grades', label: 'Điểm câu hỏi (question_grades)' },
  { value: 'grade_appeals', label: 'Đơn phúc khảo (grade_appeals)' },
  { value: 'system_settings', label: 'Cấu hình hệ thống (system_settings)' },
  { value: 'course_rubrics', label: 'Rubric học phần (course_rubrics)' },
]

// Khoảng thời gian
const DATE_RANGE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả thời gian' },
  { value: 'TODAY', label: 'Hôm nay' },
  { value: '7D', label: '7 ngày qua' },
  { value: '30D', label: '30 ngày qua' },
]

interface DiffField {
  key: string
  status: 'added' | 'removed' | 'modified' | 'unchanged'
  oldVal: any
  newVal: any
}

function tryParseJson(value: string | undefined): any | null {
  if (!value) return null
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return null
    }
  }
  return null
}

function computeStructuredDiff(oldValStr?: string, newValStr?: string): DiffField[] | null {
  const oldObj = tryParseJson(oldValStr)
  const newObj = tryParseJson(newValStr)

  if (!oldObj && !newObj) return null

  const o = typeof oldObj === 'object' && oldObj !== null ? oldObj : {}
  const n = typeof newObj === 'object' && newObj !== null ? newObj : {}

  const allKeys = Array.from(new Set([...Object.keys(o), ...Object.keys(n)]))
  if (allKeys.length === 0) return null

  return allKeys.map((key) => {
    const hasOld = key in o
    const hasNew = key in n
    const oldV = o[key]
    const newV = n[key]

    if (!hasOld && hasNew) {
      return { key, status: 'added', oldVal: undefined, newVal: newV }
    }
    if (hasOld && !hasNew) {
      return { key, status: 'removed', oldVal: oldV, newVal: undefined }
    }

    const isMatch = JSON.stringify(oldV) === JSON.stringify(newV)
    if (isMatch) {
      return { key, status: 'unchanged', oldVal: oldV, newVal: newV }
    }
    return { key, status: 'modified', oldVal: oldV, newVal: newV }
  })
}

function formatValueForDisplay(val: any): string {
  if (val === undefined) return '-'
  if (val === null) return 'null'
  if (typeof val === 'object') return JSON.stringify(val, null, 2)
  return String(val)
}

function getActionMeta(action: string) {
  switch (action) {
    case 'OVERRIDE_SCORE':
      return {
        label: 'Ghi đè điểm',
        badgeClass: 'bg-tertiary-fixed text-on-tertiary-fixed-variant border border-tertiary/20',
        dotColor: 'bg-amber-500',
      }
    case 'CREATE_USER':
      return {
        label: 'Tạo tài khoản',
        badgeClass: 'bg-primary-fixed text-on-primary-fixed-variant border border-primary/20',
        dotColor: 'bg-primary',
      }
    case 'UPDATE_STATUS':
      return {
        label: 'Đổi trạng thái',
        badgeClass: 'bg-surface-container-high text-on-surface border border-outline-variant/30',
        dotColor: 'bg-slate-400',
      }
    case 'PUBLISH_RESULT':
      return {
        label: 'Công bố kết quả',
        badgeClass: 'bg-secondary-container text-on-secondary-fixed-variant border border-secondary/20',
        dotColor: 'bg-secondary',
      }
    case 'RESOLVE_APPEAL':
      return {
        label: 'Xử lý phúc khảo',
        badgeClass: 'bg-primary-fixed-dim text-on-primary-fixed border border-primary-fixed/40',
        dotColor: 'bg-indigo-500',
      }
    case 'UPDATE_SETTING':
      return {
        label: 'Cấu hình AI',
        badgeClass: 'bg-surface-container-highest text-primary border border-primary/20',
        dotColor: 'bg-sky-500',
      }
    case 'UPDATE_RUBRIC':
      return {
        label: 'Cập nhật Rubric',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
        dotColor: 'bg-emerald-500',
      }
    default:
      return {
        label: action,
        badgeClass: 'bg-surface-container text-on-surface-variant border border-outline-variant/20',
        dotColor: 'bg-outline',
      }
  }
}

function getInitials(fullName: string) {
  const words = fullName.trim().split(/\s+/)
  const first = words[0]?.[0] ?? ''
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + last).toUpperCase() || 'AD'
}

/* ============ Component: Syntax-Highlighted JSON Viewer ============ */
function JsonSyntaxViewer({ jsonString }: { jsonString: string }) {
  const [copied, setCopied] = useState(false)

  const formatted = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonString)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return jsonString
    }
  }, [jsonString])

  const lines = useMemo(() => formatted.split('\n'), [formatted])

  const handleCopy = () => {
    navigator.clipboard.writeText(formatted)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const renderTokenizedLine = (lineText: string) => {
    const keyMatch = lineText.match(/^(\s*)("([^"]+)")(\s*:\s*)(.*)$/)
    if (keyMatch) {
      const [, indent, , key, colon, valuePart] = keyMatch
      return (
        <span>
          <span>{indent}</span>
          <span className="text-sky-400 font-semibold">"{key}"</span>
          <span className="text-slate-400">{colon}</span>
          {renderValueTokens(valuePart)}
        </span>
      )
    }
    return renderValueTokens(lineText)
  }

  const renderValueTokens = (val: string) => {
    if (val.trim().startsWith('"')) {
      return <span className="text-emerald-300">{val}</span>
    }
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?(?:,\s*)?$/.test(val.trim())) {
      return <span className="text-amber-300 font-mono">{val}</span>
    }
    if (/^(true|false|null)(?:,\s*)?$/.test(val.trim())) {
      return <span className="text-purple-300 font-semibold">{val}</span>
    }
    return <span className="text-slate-200">{val}</span>
  }

  return (
    <div className="relative rounded-2xl bg-slate-950 p-4 font-mono text-body-xs text-slate-100 shadow-inner border border-slate-800">
      <div className="mb-2.5 flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="flex items-center gap-1.5 text-2xs uppercase tracking-wider text-slate-400">
          <FileJson className="h-3.5 w-3.5 text-sky-400" /> JSON Payload (Đã định dạng)
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-800/80 px-2 py-1 text-2xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
        </button>
      </div>
      <div className="max-h-72 overflow-auto pr-1">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                <td className="w-9 select-none pr-3 text-right font-mono text-2xs text-slate-600 align-top">
                  {idx + 1}
                </td>
                <td className="whitespace-pre font-mono text-xs align-top leading-relaxed">
                  {renderTokenizedLine(line)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ============ Component: Structured Key-Value Diff Table ============ */
function StructuredDiffView({
  diffs,
  hideUnchanged,
  onToggleHideUnchanged,
}: {
  diffs: DiffField[]
  hideUnchanged: boolean
  onToggleHideUnchanged: () => void
}) {
  const visibleDiffs = useMemo(() => {
    if (!hideUnchanged) return diffs
    return diffs.filter((d) => d.status !== 'unchanged')
  }, [diffs, hideUnchanged])

  const counts = useMemo(() => {
    return {
      added: diffs.filter((d) => d.status === 'added').length,
      removed: diffs.filter((d) => d.status === 'removed').length,
      modified: diffs.filter((d) => d.status === 'modified').length,
      unchanged: diffs.filter((d) => d.status === 'unchanged').length,
    }
  }, [diffs])

  return (
    <div className="space-y-3">
      {/* Thống kê biến động */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-container-low p-3 text-body-xs">
        <div className="flex flex-wrap items-center gap-2">
          {counts.modified > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-label-2xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30">
              ~ {counts.modified} sửa đổi
            </span>
          )}
          {counts.added > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-label-2xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              + {counts.added} thêm mới
            </span>
          )}
          {counts.removed > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-label-2xs font-bold text-rose-600 dark:text-rose-400 border border-rose-500/30">
              - {counts.removed} đã xóa
            </span>
          )}
          {counts.unchanged > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-0.5 text-label-2xs text-outline">
              = {counts.unchanged} giữ nguyên
            </span>
          )}
        </div>

        {counts.unchanged > 0 && (
          <button
            type="button"
            onClick={onToggleHideUnchanged}
            className="text-label-2xs font-semibold text-primary hover:underline"
          >
            {hideUnchanged ? 'Hiện trường giữ nguyên' : 'Ẩn trường giữ nguyên'}
          </button>
        )}
      </div>

      {/* Danh sách trường dữ liệu đối chiếu */}
      <div className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest">
        <div className="divide-y divide-outline-variant/20">
          {visibleDiffs.map((diff) => {
            const isAdded = diff.status === 'added'
            const isRemoved = diff.status === 'removed'
            const isModified = diff.status === 'modified'

            return (
              <div
                key={diff.key}
                className={`p-3.5 transition-colors ${
                  isModified
                    ? 'bg-amber-500/5'
                    : isAdded
                      ? 'bg-emerald-500/5'
                      : isRemoved
                        ? 'bg-rose-500/5'
                        : 'bg-surface-container-lowest hover:bg-surface-container-low/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold font-mono ${
                        isModified
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : isAdded
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : isRemoved
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                              : 'bg-surface-container text-outline'
                      }`}
                    >
                      {isModified ? '~ SỬA' : isAdded ? '+ THÊM' : isRemoved ? '- XÓA' : '= KHÔNG ĐỔI'}
                    </span>
                    <span className="font-mono text-label-sm font-bold text-on-surface">{diff.key}</span>
                  </div>
                </div>

                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-xs">
                  {/* Cột giá trị cũ */}
                  <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low/60 p-2.5">
                    <div className="text-2xs font-bold uppercase tracking-wider text-outline mb-1">
                      Trước thay đổi (Old)
                    </div>
                    <pre className="font-mono text-body-xs text-on-surface whitespace-pre-wrap break-all max-h-36 overflow-y-auto">
                      {isAdded ? (
                        <em className="text-outline italic">Không tồn tại</em>
                      ) : (
                        <span className={isModified || isRemoved ? 'text-rose-600 dark:text-rose-400 font-medium' : ''}>
                          {formatValueForDisplay(diff.oldVal)}
                        </span>
                      )}
                    </pre>
                  </div>

                  {/* Cột giá trị mới */}
                  <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low/60 p-2.5">
                    <div className="text-2xs font-bold uppercase tracking-wider text-outline mb-1">
                      Sau thay đổi (New)
                    </div>
                    <pre className="font-mono text-body-xs text-on-surface whitespace-pre-wrap break-all max-h-36 overflow-y-auto">
                      {isRemoved ? (
                        <em className="text-outline italic">Đã xóa trường này</em>
                      ) : (
                        <span className={isModified || isAdded ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>
                          {formatValueForDisplay(diff.newVal)}
                        </span>
                      )}
                    </pre>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ============ Component: Modal Chi Tiết Đối Chiếu Audit Log ============ */
function AuditDetailModal({
  log,
  onClose,
}: {
  log: AuditLog
  onClose: () => void
}) {
  const [copiedId, setCopiedId] = useState(false)
  const [activeTab, setActiveTab] = useState<'structured' | 'raw' | 'metadata'>('structured')
  const [hideUnchanged, setHideUnchanged] = useState(false)

  const meta = getActionMeta(log.action)
  const structuredDiffs = useMemo(
    () => computeStructuredDiff(log.oldValue, log.newValue),
    [log.oldValue, log.newValue],
  )
  const isOldJson = useMemo(() => tryParseJson(log.oldValue) !== null, [log.oldValue])
  const isNewJson = useMemo(() => tryParseJson(log.newValue) !== null, [log.newValue])

  const handleCopyId = () => {
    navigator.clipboard.writeText(log.id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-modal-title"
        className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-surface-container-lowest shadow-2xl border border-outline-variant/30 overflow-hidden"
      >
        {/* Header Modal */}
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/20 p-5 sm:p-6 bg-surface-container-low/30">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-xs font-bold ${meta.badgeClass}`}>
                <span className={`h-2 w-2 rounded-full ${meta.dotColor}`} />
                {meta.label}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1 text-label-2xs font-mono font-bold text-outline hover:text-on-surface transition-colors"
                title="Sao chép mã log"
              >
                <span>{log.id}</span>
                {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <h2 id="audit-modal-title" className="mt-2 text-headline-xs sm:text-headline-sm font-bold text-on-surface">
              Chi Tiết Đối Chiếu Kiểm Toán
            </h2>
            <p className="mt-0.5 text-body-xs text-on-surface-variant font-mono">
              Thời gian ghi nhận: {formatDateTime(log.timestamp)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
            aria-label="Đóng hộp thoại"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-outline-variant/20 px-5 sm:px-6 bg-surface-container-low/20">
          <button
            type="button"
            onClick={() => setActiveTab('structured')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-label-sm font-bold transition-colors ${
              activeTab === 'structured'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <GitCompare className="h-4 w-4" />
            <span>Đối chiếu thay đổi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('raw')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-label-sm font-bold transition-colors ${
              activeTab === 'raw'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Terminal className="h-4 w-4" />
            <span>Mã nguồn dữ liệu (Raw)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('metadata')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-label-sm font-bold transition-colors ${
              activeTab === 'metadata'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Thông tin & Ngữ cảnh</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Actor & Entity Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl bg-surface-container-low p-4 text-body-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-md font-bold text-primary">
                {getInitials(log.actorName)}
              </div>
              <div className="min-w-0">
                <span className="text-2xs font-bold uppercase tracking-wider text-outline block">
                  Người thực hiện
                </span>
                <p className="font-bold text-on-surface truncate">{log.actorName}</p>
                <p className="text-on-surface-variant truncate font-mono text-2xs">{log.actorEmail ?? log.actorId}</p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 sm:border-l border-outline-variant/20 pt-2 sm:pt-0 sm:pl-4">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-outline block sm:text-right">
                  Thực thể tác động
                </span>
                <p className="font-mono font-bold text-on-surface sm:text-right">{log.entityId}</p>
                <span className="inline-block font-mono text-2xs uppercase text-primary font-semibold sm:float-right">
                  {log.entityType}
                </span>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-label-2xs font-semibold ${
                  ROLE_BADGE_CLASSES[log.actorRole ?? 'ADMIN'] ?? 'bg-surface-container text-on-surface'
                }`}
              >
                {log.actorRole ?? 'ADMIN'}
              </span>
            </div>
          </div>

          {/* TAB 1: Structured Diff View */}
          {activeTab === 'structured' && (
            <div>
              {structuredDiffs ? (
                <StructuredDiffView
                  diffs={structuredDiffs}
                  hideUnchanged={hideUnchanged}
                  onToggleHideUnchanged={() => setHideUnchanged(!hideUnchanged)}
                />
              ) : (
                /* Fallback Side-by-side card comparison cho primitive string diffs */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Hộp giá trị ban đầu */}
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
                      <div className="flex items-center justify-between text-label-xs font-bold text-rose-600 dark:text-rose-400">
                        <span className="flex items-center gap-1.5">
                          <History className="h-4 w-4" /> Giá trị ban đầu (Old Value)
                        </span>
                        <span className="rounded bg-rose-500/20 px-2 py-0.5 font-mono text-2xs uppercase">
                          Trước
                        </span>
                      </div>
                      <div className="mt-3 rounded-xl bg-surface-container-lowest p-3 font-mono text-body-sm text-on-surface break-all min-h-16 shadow-xs">
                        {log.oldValue && log.oldValue !== '-' ? (
                          log.oldValue
                        ) : (
                          <em className="text-outline">Không có (Khởi tạo mới)</em>
                        )}
                      </div>
                    </div>

                    {/* Hộp giá trị cập nhật */}
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                      <div className="flex items-center justify-between text-label-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" /> Giá trị cập nhật (New Value)
                        </span>
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-2xs uppercase">
                          Sau
                        </span>
                      </div>
                      <div className="mt-3 rounded-xl bg-surface-container-lowest p-3 font-mono text-body-sm text-emerald-600 dark:text-emerald-400 font-semibold break-all min-h-16 shadow-xs">
                        {log.newValue ?? '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Raw Code / Side-by-Side View */}
          {activeTab === 'raw' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-label-xs uppercase font-bold text-outline mb-1.5 flex items-center gap-1">
                    <History className="h-3.5 w-3.5 text-rose-500" /> Giá trị cũ (Old Value)
                  </h4>
                  {isOldJson && log.oldValue ? (
                    <JsonSyntaxViewer jsonString={log.oldValue} />
                  ) : (
                    <div className="rounded-2xl bg-surface-container-low p-4 font-mono text-body-xs text-on-surface break-all min-h-24">
                      {log.oldValue || '-'}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-label-xs uppercase font-bold text-outline mb-1.5 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Giá trị mới (New Value)
                  </h4>
                  {isNewJson && log.newValue ? (
                    <JsonSyntaxViewer jsonString={log.newValue} />
                  ) : (
                    <div className="rounded-2xl bg-surface-container-low p-4 font-mono text-body-xs text-on-surface break-all min-h-24">
                      {log.newValue || '-'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Metadata Context */}
          {activeTab === 'metadata' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-surface-container-low p-4 space-y-3">
                <h4 className="text-label-xs uppercase font-bold text-outline">
                  Thông tin phiên làm việc & Mạng
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-xs">
                  <div>
                    <span className="text-outline block">Địa chỉ IP phát sinh:</span>
                    <span className="font-mono font-medium text-on-surface">{log.ipAddress ?? 'N/A (Nội bộ máy chủ)'}</span>
                  </div>
                  <div>
                    <span className="text-outline block">Mã định danh tác tử:</span>
                    <span className="font-mono font-medium text-on-surface">{log.actorId}</span>
                  </div>
                  <div>
                    <span className="text-outline block">Thời điểm thực thi (ISO 8601):</span>
                    <span className="font-mono font-medium text-on-surface">{log.timestamp}</span>
                  </div>
                  <div>
                    <span className="text-outline block">Tiêu chuẩn kiểm toán:</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <ShieldCheck className="h-3.5 w-3.5" /> ISO/IEC 27001 Immutable
                    </span>
                  </div>
                </div>
              </div>

              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="rounded-2xl bg-surface-container-low p-4">
                  <h4 className="text-label-xs uppercase font-bold text-outline mb-2">
                    Dữ liệu bổ trợ mở rộng (Context Metadata)
                  </h4>
                  <pre className="rounded-xl bg-surface-container-lowest p-3 font-mono text-body-xs text-on-surface overflow-x-auto shadow-inner">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Lý do điều chỉnh / Ghi chú nghiệp vụ */}
          {log.reason && (
            <div className="rounded-2xl bg-surface-container-low/80 p-4 border border-outline-variant/20">
              <span className="text-label-xs uppercase tracking-wider font-bold text-outline block">
                Lý do điều chỉnh / Ghi chú nghiệp vụ (Justification)
              </span>
              <p className="mt-1.5 text-body-sm text-on-surface leading-relaxed">{log.reason}</p>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between border-t border-outline-variant/20 p-4 sm:p-5 bg-surface-container-low/30">
          <div className="flex items-center gap-2 text-2xs text-outline font-mono">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>Lưu vết an toàn bất biến AIVES SOC</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-surface-container px-6 py-2 text-label-md font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============ Component: Expandable Table Row Inline Diff Preview ============ */
function InlineDiffRow({
  log,
  onOpenModal,
}: {
  log: AuditLog
  onOpenModal: () => void
}) {
  const structuredDiffs = useMemo(
    () => computeStructuredDiff(log.oldValue, log.newValue),
    [log.oldValue, log.newValue],
  )

  return (
    <tr className="bg-surface-container-low/40 border-b border-outline-variant/30 animate-in fade-in duration-150">
      <td colSpan={6} className="p-4 sm:p-5">
        <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4.5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-fixed text-primary">
                <GitCompare className="h-3.5 w-3.5" />
              </span>
              <div>
                <h4 className="text-label-sm font-bold text-on-surface">
                  Đối Chiếu Dữ Liệu Nhanh (Inline Diff Inspector)
                </h4>
                <p className="text-2xs text-on-surface-variant font-mono">
                  Mã bản ghi: {log.id} • IP: {log.ipAddress ?? '127.0.0.1'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenModal}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-3.5 py-1.5 text-label-xs font-semibold text-on-primary hover:bg-primary transition-colors shadow-xs"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Xem hộp thoại chi tiết</span>
            </button>
          </div>

          {/* Hiển thị diff dạng cấu trúc hoặc so sánh song song */}
          {structuredDiffs ? (
            <div className="space-y-2">
              <span className="text-2xs uppercase font-bold tracking-wider text-outline block">
                Các trường dữ liệu có biến động ({structuredDiffs.filter((d) => d.status !== 'unchanged').length} trường):
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {structuredDiffs
                  .filter((d) => d.status !== 'unchanged')
                  .slice(0, 6)
                  .map((d) => (
                    <div
                      key={d.key}
                      className="rounded-xl border border-outline-variant/20 bg-surface-container-low/60 p-2.5 text-body-xs"
                    >
                      <div className="flex items-center justify-between font-mono text-2xs mb-1">
                        <span className="font-bold text-on-surface">{d.key}</span>
                        <span
                          className={`rounded px-1.5 py-0.2 font-bold ${
                            d.status === 'modified'
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                              : d.status === 'added'
                                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-2xs font-mono">
                        <span className="text-rose-600 line-through truncate max-w-36">
                          {formatValueForDisplay(d.oldVal)}
                        </span>
                        <ArrowRight className="h-3 w-3 text-outline shrink-0" />
                        <span className="text-emerald-600 font-semibold truncate max-w-36">
                          {formatValueForDisplay(d.newVal)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-xs">
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                <span className="text-2xs font-bold uppercase tracking-wider text-rose-600 block mb-1">
                  Giá trị cũ (Old)
                </span>
                <span className="font-mono text-on-surface break-all">{log.oldValue ?? '-'}</span>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <span className="text-2xs font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                  Giá trị mới (New)
                </span>
                <span className="font-mono text-emerald-600 font-semibold break-all">{log.newValue ?? '-'}</span>
              </div>
            </div>
          )}

          {/* Lý do / Ghi chú */}
          {log.reason && (
            <div className="rounded-xl bg-surface-container-low p-3 text-body-xs text-on-surface-variant">
              <strong className="text-on-surface font-semibold">Ghi chú:</strong> {log.reason}
            </div>
          )}
        </div>
      </td>
    </tr>
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
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({})

  // Phân trang
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const [nowTimestamp] = useState(() => Date.now())

  // Tải dữ liệu từ backend service
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await systemService.getAuditLogs({
        action: actionFilter !== 'ALL' ? actionFilter : undefined,
        entityName: entityFilter !== 'ALL' ? entityFilter : undefined,
      })
      setLogs(data)
    } finally {
      setLoading(false)
    }
  }, [actionFilter, entityFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Lọc đa chiều client-side trên tập bản ghi
  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return logs.filter((item) => {
      // 1. Tìm kiếm theo từ khóa
      if (term) {
        const matchText = [
          item.actorName,
          item.actorEmail,
          item.actorId,
          item.entityId,
          item.id,
          item.reason,
          item.oldValue,
          item.newValue,
        ]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(term))

        if (!matchText) return false
      }

      // 2. Lọc theo thời gian
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
  }, [logs, searchTerm, dateRangeFilter, nowTimestamp])

  // Phân trang dữ liệu đã lọc
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize))
  const paginatedLogs = useMemo(() => {
    const start = currentPage * pageSize
    return filteredLogs.slice(start, start + pageSize)
  }, [filteredLogs, currentPage, pageSize])

  // Reset về page 0 khi filter thay đổi
  useEffect(() => {
    setCurrentPage(0)
  }, [searchTerm, actionFilter, entityFilter, dateRangeFilter, pageSize])

  // Thống kê nhanh
  const summaryCounts = useMemo(() => {
    const counts = {
      total: logs.length,
      overrides: 0,
      userCreated: 0,
      appeals: 0,
      settings: 0,
    }
    for (const l of logs) {
      if (l.action === 'OVERRIDE_SCORE') counts.overrides += 1
      if (l.action === 'CREATE_USER') counts.userCreated += 1
      if (l.action === 'RESOLVE_APPEAL') counts.appeals += 1
      if (l.action === 'UPDATE_SETTING' || l.action === 'UPDATE_RUBRIC') counts.settings += 1
    }
    return counts
  }, [logs])

  // Bật/tắt mở rộng hàng trong bảng
  const toggleRowExpand = (id: string) => {
    setExpandedLogIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

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
    <AdminLayout breadcrumbs={[{ label: 'Nhật ký Kiểm toán' }]}>
      <div className="space-y-6">
        {/* ============ Header Navigation ============ */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-outline-variant/30 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-primary">
                <ShieldCheck className="h-4.5 w-4.5" />
              </span>
              <span className="text-label-xs font-bold uppercase tracking-wider text-primary">
                AIVES SOC • Immutable Audit Trail
              </span>
            </div>
            <h1 className="mt-2 text-headline-md sm:text-headline-lg font-extrabold tracking-tight text-on-surface">
              Nhật Ký Kiểm Toán Hệ Thống (Audit Logs)
            </h1>
            <p className="mt-1 text-body-md text-on-surface-variant max-w-3xl">
              Tra cứu và đối chiếu chi tiết vết thao tác nhạy cảm (<code className="font-mono text-primary font-semibold">audit_logs</code>):
              so sánh giá trị trước/sau khi sửa, điểm số vấn đáp, tham số AI và phân quyền tài khoản theo chuẩn ISO/IEC 27001.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={fetchLogs}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-lowest px-4 py-2.5 text-label-sm font-semibold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`h-4 w-4 text-primary ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-lowest px-4 py-2.5 text-label-sm font-semibold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
              title="Xuất file JSON"
            >
              <Download className="h-4 w-4 text-primary" />
              <span>Xuất JSON</span>
            </button>

            <Link
              to="/admin/settings"
              className="inline-flex items-center gap-2 rounded-full bg-surface-container px-4 py-2.5 text-label-sm font-semibold text-primary hover:bg-surface-container-high transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Cấu hình AI</span>
            </Link>
          </div>
        </div>

        {/* ============ Thẻ tóm tắt số liệu nhanh ============ */}
        <section aria-label="Thống kê kiểm toán" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-label-xs uppercase font-bold tracking-wider text-outline">Tổng bản ghi</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-primary">
                <Layers className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-headline-sm font-extrabold text-on-surface">{summaryCounts.total}</p>
            <span className="text-label-2xs text-on-surface-variant">Lưu vết liên tục</span>
          </div>

          <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-label-xs uppercase font-bold tracking-wider text-outline">Ghi đè điểm</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tertiary-fixed text-tertiary">
                <History className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-headline-sm font-extrabold text-tertiary">{summaryCounts.overrides}</p>
            <span className="text-label-2xs text-on-surface-variant">Can thiệp điểm (HITL)</span>
          </div>

          <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-label-xs uppercase font-bold tracking-wider text-outline">Đơn phúc khảo</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-primary">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-headline-sm font-extrabold text-primary">{summaryCounts.appeals}</p>
            <span className="text-label-2xs text-on-surface-variant">Đã thẩm định</span>
          </div>

          <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-label-xs uppercase font-bold tracking-wider text-outline">Cấu hình & Rubric</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-secondary">
                <Sparkles className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-headline-sm font-extrabold text-secondary">{summaryCounts.settings}</p>
            <span className="text-label-2xs text-on-surface-variant">Tham số AI & Trọng số</span>
          </div>
        </section>

        {/* ============ Thanh Bộ Lọc Đa Chiều ============ */}
        <section aria-label="Bộ lọc đa chiều" className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <h3 className="text-label-md font-bold text-on-surface">Bộ Lọc Kiểm Toán Đa Chiều</h3>
            </div>

            {/* Quick Pills */}
            <div className="hidden lg:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActionFilter('ALL')}
                className={`rounded-full px-3 py-1 text-label-2xs font-bold transition-colors ${
                  actionFilter === 'ALL'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setActionFilter('OVERRIDE_SCORE')}
                className={`rounded-full px-3 py-1 text-label-2xs font-bold transition-colors ${
                  actionFilter === 'OVERRIDE_SCORE'
                    ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                Ghi đè điểm
              </button>
              <button
                type="button"
                onClick={() => setActionFilter('UPDATE_SETTING')}
                className={`rounded-full px-3 py-1 text-label-2xs font-bold transition-colors ${
                  actionFilter === 'UPDATE_SETTING'
                    ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                Cấu hình AI
              </button>
              <button
                type="button"
                onClick={() => setEntityFilter('users')}
                className={`rounded-full px-3 py-1 text-label-2xs font-bold transition-colors ${
                  entityFilter === 'users'
                    ? 'bg-primary-fixed text-primary'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                Tài khoản (users)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-12">
            {/* Ô tìm kiếm người thực hiện / đối tượng */}
            <div className="lg:col-span-4 relative flex items-center">
              <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-outline" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo Actor ID, Tên, Email, Entity ID, mã log..."
                className="w-full rounded-2xl bg-surface-container-low py-2.5 pr-4 pl-10 text-body-sm text-on-surface outline-none transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container"
              />
            </div>

            {/* Dropdown Hành động */}
            <div className="lg:col-span-3">
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
            <div className="lg:col-span-3">
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
            <div className="lg:col-span-2">
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

          {/* Dòng tóm tắt điều kiện lọc đang kích hoạt */}
          {isFiltered && (
            <div className="pt-2 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-2 text-body-xs">
              <span className="text-on-surface-variant">
                Đang lọc: Tìm thấy <strong className="text-primary">{filteredLogs.length}</strong> / {logs.length} sự kiện kiểm toán
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-label-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" /> Đặt lại tất cả bộ lọc
              </button>
            </div>
          )}
        </section>

        {/* ============ Bảng Dữ Liệu Audit Logs ============ */}
        <section aria-label="Bảng nhật ký kiểm toán" className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-on-surface-variant">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-body-md font-medium">Đang tải dữ liệu kiểm toán hệ thống...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            /* Thông báo trạng thái rỗng thân thiện (Empty State) */
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container text-outline">
                <AlertCircle className="h-8 w-8" />
              </span>
              <h3 className="text-headline-xs font-bold text-on-surface">Không tìm thấy bản ghi kiểm toán</h3>
              <p className="text-body-sm text-on-surface-variant max-w-md">
                Không có sự kiện nào khớp với tiêu chí tìm kiếm hiện tại. Bạn có thể thử xóa từ khóa tìm kiếm hoặc đặt lại các tiêu chí bộ lọc.
              </p>
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-container px-5 py-2 text-label-sm font-semibold text-on-primary hover:bg-primary transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Xóa bộ lọc</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead className="bg-surface-container-low text-label-xs uppercase tracking-wider text-outline border-b border-outline-variant/30">
                  <tr>
                    <th scope="col" className="py-4 px-4 w-12 text-center">
                      <span className="sr-only">Mở rộng</span>
                    </th>
                    <th scope="col" className="py-4 px-4">Thời gian & Mã</th>
                    <th scope="col" className="py-4 px-4">Người thực hiện (Actor)</th>
                    <th scope="col" className="py-4 px-4">Hành động</th>
                    <th scope="col" className="py-4 px-4">Thực thể & Đối tượng</th>
                    <th scope="col" className="py-4 px-4">Biến động (Old $\rightarrow$ New)</th>
                    <th scope="col" className="py-4 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-body-sm">
                  {paginatedLogs.map((log) => {
                    const meta = getActionMeta(log.action)
                    const isExpanded = !!expandedLogIds[log.id]
                    const hasJsonDiff = tryParseJson(log.newValue) !== null || tryParseJson(log.oldValue) !== null

                    return (
                      <Fragment key={log.id}>
                        <tr
                          className={`hover:bg-surface-container-low/60 transition-colors ${
                            isExpanded ? 'bg-surface-container-low/30' : ''
                          }`}
                        >
                          {/* Nút mở rộng đối chiếu nhanh tại hàng */}
                          <td className="py-4 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleRowExpand(log.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-outline hover:bg-surface-container hover:text-on-surface transition-colors"
                              title={isExpanded ? 'Thu gọn' : 'Đối chiếu nhanh'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-primary" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </td>

                          {/* Thời gian & Mã định danh */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="font-mono text-body-xs font-bold text-on-surface block">
                              {formatDateTime(log.timestamp)}
                            </span>
                            <span className="font-mono text-label-2xs text-outline">{log.id}</span>
                          </td>

                          {/* Người thực hiện (Actor) */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-label-xs font-bold text-primary">
                                {getInitials(log.actorName)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-label-sm font-bold text-on-surface truncate">{log.actorName}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span
                                    className={`rounded-full px-2 py-0.2 text-label-2xs font-semibold ${
                                      ROLE_BADGE_CLASSES[log.actorRole ?? 'ADMIN'] ?? 'bg-surface-container text-on-surface'
                                    }`}
                                  >
                                    {log.actorRole ?? 'ADMIN'}
                                  </span>
                                  <span className="font-mono text-label-2xs text-outline truncate">{log.actorId}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Hành động nghiệp vụ */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-xs font-bold ${meta.badgeClass}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${meta.dotColor}`} />
                              {meta.label}
                            </span>
                          </td>

                          {/* Thực thể & Mã đối tượng */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="font-mono text-label-2xs text-outline block uppercase tracking-wider">
                              {log.entityType}
                            </span>
                            <span className="font-mono text-label-sm font-bold text-on-surface">{log.entityId}</span>
                          </td>

                          {/* Chi tiết thay đổi rút gọn */}
                          <td className="py-4 px-4 max-w-xs sm:max-w-sm truncate text-body-xs">
                            {hasJsonDiff ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 font-mono text-2xs font-bold text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                  <FileJson className="h-3 w-3" /> JSON Cấu trúc
                                </span>
                                <span className="text-on-surface-variant truncate">
                                  {log.reason ?? 'Điều chỉnh cấu hình'}
                                </span>
                              </div>
                            ) : log.oldValue && log.newValue ? (
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="text-rose-600 line-through truncate max-w-24 sm:max-w-32">
                                  {log.oldValue}
                                </span>
                                <ArrowRight className="h-3 w-3 text-outline shrink-0" />
                                <span className="font-bold text-emerald-600 truncate max-w-28 sm:max-w-36">
                                  {log.newValue}
                                </span>
                              </div>
                            ) : (
                              <span className="text-on-surface-variant truncate">{log.reason ?? 'Cập nhật hệ thống'}</span>
                            )}
                            {log.reason && !hasJsonDiff && (
                              <p className="text-label-2xs text-outline truncate mt-0.5" title={log.reason}>
                                {log.reason}
                              </p>
                            )}
                          </td>

                          {/* Thao tác xem chi tiết */}
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedLog(log)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3.5 py-1.5 text-label-xs font-semibold text-primary hover:bg-surface-container-high transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Đối chiếu</span>
                            </button>
                          </td>
                        </tr>

                        {/* Hàng mở rộng chi tiết Inline Diff */}
                        {isExpanded && (
                          <InlineDiffRow log={log} onOpenModal={() => setSelectedLog(log)} />
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer & Phân trang */}
          {!loading && filteredLogs.length > 0 && (
            <div className="border-t border-outline-variant/20 bg-surface-container-low/40 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-body-xs text-on-surface-variant">
              <div className="flex items-center gap-3">
                <span>
                  Hiển thị <strong className="text-on-surface">{currentPage * pageSize + 1}</strong> -{' '}
                  <strong className="text-on-surface">
                    {Math.min((currentPage + 1) * pageSize, filteredLogs.length)}
                  </strong>{' '}
                  trên tổng <strong className="text-on-surface">{filteredLogs.length}</strong> sự kiện
                </span>

                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-2xs uppercase text-outline font-bold">Kích thước:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest py-1 px-2 text-2xs font-bold text-on-surface"
                  >
                    <option value={10}>10 / trang</option>
                    <option value={20}>20 / trang</option>
                    <option value={50}>50 / trang</option>
                  </select>
                </div>
              </div>

              {/* Bộ điều hướng trang */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="rounded-lg bg-surface-container px-3 py-1 text-label-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-40"
                >
                  Trước
                </button>
                <span className="px-2 font-mono text-2xs font-bold text-on-surface">
                  Trang {currentPage + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="rounded-lg bg-surface-container px-3 py-1 text-label-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Modal chi tiết đối chiếu Audit Log */}
      {selectedLog && (
        <AuditDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </AdminLayout>
  )
}
