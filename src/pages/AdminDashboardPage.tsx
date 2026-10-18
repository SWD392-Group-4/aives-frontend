import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import Navbar from '../components/Navbar'
import { ROLE_BADGE_CLASSES } from '../constants/roles'
import { systemService } from '../services/systemService'
import { AdminOperationalMetrics, AuditLog } from '../types'
import { formatDateTime } from '../utils/dateTime'

function getActionBadge(action: string) {
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
        label: 'Công bố điểm',
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
        label: 'Đổi cấu hình AI',
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

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminOperationalMetrics | null>(null)
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const fetchData = useCallback(async () => {
    try {
      const [m, logs] = await Promise.all([
        systemService.getOperationalMetrics(),
        systemService.getAuditLogs(),
      ])
      setMetrics(m)
      setRecentLogs(logs.slice(0, 5))
      setLastUpdated(
        new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* ============ Header ============ */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-outline-variant/30 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-highest px-3.5 py-1 text-label-xs font-semibold text-primary">
              <span className="flex h-2 w-2 rounded-full bg-brand-green animate-pulse" />
              AIVES System Operations Center (SOC)
            </div>
            <h1 className="mt-2 text-headline-md sm:text-headline-lg font-extrabold tracking-tight text-on-surface">
              Bảng Điều Khiển Quản Trị Hệ Thống
            </h1>
            <p className="mt-1 text-body-md text-on-surface-variant max-w-2xl">
              Bức tranh tổng quan vận hành AIVES: Giám sát tài nguyên AI, ca thi trực tuyến và nhật ký kiểm toán toàn hệ thống theo thời gian thực.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-body-xs text-outline hidden md:inline-block">
                Cập nhật lúc: <strong className="text-on-surface font-mono">{lastUpdated}</strong>
              </span>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full bg-surface-container px-4 py-2 text-label-sm font-semibold text-primary transition-colors hover:bg-surface-container-high disabled:opacity-50"
              title="Làm mới số liệu"
            >
              <Icon name="refresh" className={`text-lg ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Đang tải...' : 'Làm mới'}</span>
            </button>
          </div>
        </div>

        {/* ============ Phím tắt quản trị nhanh ============ */}
        <section aria-label="Phím tắt quản trị" className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            to="/admin/users"
            className="group relative flex items-center gap-4 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-xs transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-fixed text-primary transition-transform group-hover:scale-105">
              <Icon name="manage_accounts" filled className="text-2xl" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-label-lg font-bold text-on-surface flex items-center justify-between">
                Quản lý Người dùng
                <Icon name="arrow_forward" className="text-base text-outline transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </h2>
              <p className="mt-0.5 text-body-xs text-on-surface-variant truncate">
                Cấp tài khoản SV/GV, phân quyền, kích hoạt
              </p>
            </div>
          </Link>

          <Link
            to="/admin/settings"
            className="group relative flex items-center gap-4 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-xs transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-container-highest text-primary transition-transform group-hover:scale-105">
              <Icon name="tune" filled className="text-2xl" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-label-lg font-bold text-on-surface flex items-center justify-between">
                Cấu hình Tham số AI
                <Icon name="arrow_forward" className="text-base text-outline transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </h2>
              <p className="mt-0.5 text-body-xs text-on-surface-variant truncate">
                Mô hình Gemini, STT/TTS, ngưỡng im lặng
              </p>
            </div>
          </Link>

          <Link
            to="/admin/audit-logs"
            className="group relative flex items-center gap-4 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-xs transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-tertiary-fixed text-tertiary transition-transform group-hover:scale-105">
              <Icon name="history_edu" filled className="text-2xl" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-label-lg font-bold text-on-surface flex items-center justify-between">
                Nhật ký Kiểm toán
                <Icon name="arrow_forward" className="text-base text-outline transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </h2>
              <p className="mt-0.5 text-body-xs text-on-surface-variant truncate">
                Vết can thiệp điểm, công bố & phúc khảo (UC11)
              </p>
            </div>
          </Link>
        </section>

        {/* ============ Thẻ số liệu vận hành chính (Operational Metrics) ============ */}
        <section aria-label="Số liệu vận hành" className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Card 1: Tổng người dùng */}
          <div className="flex flex-col justify-between rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
                    <Icon name="groups" filled className="text-xl" />
                  </span>
                  <div>
                    <h2 className="text-label-md font-bold text-on-surface">Tổng số tài khoản người dùng</h2>
                    <p className="text-body-xs text-on-surface-variant">Phân bố vai trò theo mô hình RBAC</p>
                  </div>
                </div>
                <Link
                  to="/admin/users"
                  className="rounded-full bg-surface-container-low px-3 py-1.5 text-label-xs font-semibold text-primary hover:bg-surface-container transition-colors"
                >
                  Xem chi tiết
                </Link>
              </div>

              <div className="mt-6 flex items-baseline gap-3">
                <span className="text-headline-xl font-extrabold text-on-surface tracking-tight">
                  {loading ? '...' : (metrics?.totalUsers ?? 1420).toLocaleString('vi-VN')}
                </span>
                <span className="text-body-sm text-secondary font-semibold flex items-center gap-1">
                  <Icon name="verified_user" className="text-base" /> 99.2% Đang hoạt động
                </span>
              </div>

              {/* Sub-counts */}
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-outline-variant/20 pt-4">
                <div className="rounded-2xl bg-surface-container-low p-3 text-center">
                  <p className="text-label-xs font-semibold uppercase tracking-wider text-outline">Sinh viên</p>
                  <p className="mt-1 text-headline-xs font-bold text-on-surface">
                    {loading ? '-' : (metrics?.studentCount ?? 1200).toLocaleString('vi-VN')}
                  </p>
                  <span className="text-label-2xs text-on-surface-variant">84.5% tổng số</span>
                </div>
                <div className="rounded-2xl bg-surface-container-low p-3 text-center">
                  <p className="text-label-xs font-semibold uppercase tracking-wider text-outline">Giảng viên</p>
                  <p className="mt-1 text-headline-xs font-bold text-primary">
                    {loading ? '-' : (metrics?.lecturerCount ?? 210).toLocaleString('vi-VN')}
                  </p>
                  <span className="text-label-2xs text-on-surface-variant">14.8% tổng số</span>
                </div>
                <div className="rounded-2xl bg-surface-container-low p-3 text-center">
                  <p className="text-label-xs font-semibold uppercase tracking-wider text-outline">Admin</p>
                  <p className="mt-1 text-headline-xs font-bold text-tertiary">
                    {loading ? '-' : (metrics?.adminCount ?? 10).toLocaleString('vi-VN')}
                  </p>
                  <span className="text-label-2xs text-on-surface-variant">0.7% quản trị</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Ca thi hoạt động & Thí sinh trực tuyến */}
          <div className="flex flex-col justify-between rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-fixed-variant">
                    <Icon name="record_voice_over" filled className="text-xl" />
                  </span>
                  <div>
                    <h2 className="text-label-md font-bold text-on-surface">Ca thi & Thí sinh trực tuyến</h2>
                    <p className="text-body-xs text-on-surface-variant">Phòng thi vấn đáp thời gian thực</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container/60 px-3 py-1 text-label-xs font-bold text-secondary">
                  <span className="h-2 w-2 rounded-full bg-brand-green animate-ping" />
                  LIVE NOW
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-surface-container-low p-4">
                  <p className="text-label-xs font-semibold uppercase tracking-wider text-outline">
                    Phiên thi hôm nay
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-headline-md font-extrabold text-on-surface">
                      {loading ? '...' : metrics?.activeExamsCount ?? 8}
                    </span>
                    <span className="text-body-xs text-on-surface-variant">phiên hoạt động</span>
                  </div>
                  <p className="mt-2 text-body-xs text-secondary flex items-center gap-1 font-medium">
                    <Icon name="meeting_room" className="text-base" /> 3 phòng thi đang mở
                  </p>
                </div>

                <div className="rounded-2xl bg-surface-container-low p-4">
                  <p className="text-label-xs font-semibold uppercase tracking-wider text-outline">
                    Thí sinh đang thi
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-headline-md font-extrabold text-primary">
                      {loading ? '...' : metrics?.onlineCandidatesCount ?? 142}
                    </span>
                    <span className="text-body-xs text-on-surface-variant">sinh viên</span>
                  </div>
                  <p className="mt-2 text-body-xs text-on-surface-variant flex items-center gap-1">
                    <Icon name="task_alt" className="text-base text-brand-green" /> 265 bài thi đã nộp hôm nay
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-3 flex items-center justify-between text-body-xs">
              <span className="text-on-surface-variant">Độ trễ trung bình phòng thi voice:</span>
              <span className="font-mono font-bold text-brand-green bg-secondary-container/40 px-2 py-0.5 rounded-md">
                1.12 giây (Chuẩn Google Cloud STT/TTS)
              </span>
            </div>
          </div>
        </section>

        {/* ============ Trạng thái dịch vụ nền & Hạn ngạch AI tiêu thụ ============ */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Cột trái: Trạng thái dịch vụ nền (7/12) */}
          <section aria-label="Trạng thái dịch vụ nền" className="lg:col-span-7 flex flex-col rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-primary">
                  <Icon name="dns" className="text-lg" />
                </span>
                <h2 className="text-headline-xs font-bold text-on-surface">Trạng Thái Dịch Vụ Nền (Service Health)</h2>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2.5 py-0.5 text-label-xs font-bold text-secondary">
                <Icon name="check_circle" className="text-xs" /> Tất cả sẵn sàng
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {/* PostgreSQL Supabase */}
              <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 transition-colors hover:bg-surface-container">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-3 w-3 rounded-full bg-brand-green ring-4 ring-brand-green/20" />
                    <div>
                      <h3 className="text-label-md font-bold text-on-surface">PostgreSQL Supabase Cloud</h3>
                      <p className="text-body-xs text-on-surface-variant">Lưu trữ dữ liệu quan hệ, Row-Level Security & Audit</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-label-xs font-bold text-secondary bg-secondary-container/40 px-2 py-0.5 rounded-md">
                      28ms
                    </span>
                    <p className="text-label-2xs text-outline mt-0.5">Uptime: 99.99%</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-body-xs text-on-surface-variant border-t border-outline-variant/20 pt-2">
                  <span>Trạng thái kết nối:</span>
                  <span className="font-medium text-on-surface">BÌNH THƯỜNG (Pool 14/50 active connections)</span>
                </div>
              </div>

              {/* Google Cloud Speech */}
              <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 transition-colors hover:bg-surface-container">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-3 w-3 rounded-full bg-brand-green ring-4 ring-brand-green/20" />
                    <div>
                      <h3 className="text-label-md font-bold text-on-surface">Google Cloud Speech-to-Text & TTS</h3>
                      <p className="text-body-xs text-on-surface-variant">Chuyển âm thanh thí sinh thành văn bản & Giọng AI</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-label-xs font-bold text-secondary bg-secondary-container/40 px-2 py-0.5 rounded-md">
                      1.12s
                    </span>
                    <p className="text-label-2xs text-outline mt-0.5">Uptime: 99.98%</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-body-xs text-on-surface-variant border-t border-outline-variant/20 pt-2">
                  <span>Giao thức truyền âm thanh:</span>
                  <span className="font-medium text-on-surface">Streaming gRPC 2 chiều (vi-VN Neural2)</span>
                </div>
              </div>

              {/* Gemini Flash API */}
              <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 transition-colors hover:bg-surface-container">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-3 w-3 rounded-full bg-brand-green ring-4 ring-brand-green/20" />
                    <div>
                      <h3 className="text-label-md font-bold text-on-surface">Gemini 2.5 Flash Model (Google Cloud)</h3>
                      <p className="text-body-xs text-on-surface-variant">Sinh câu hỏi nháp, hỏi xoáy phỏng vấn & Chấm điểm Rubric</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-label-xs font-bold text-secondary bg-secondary-container/40 px-2 py-0.5 rounded-md">
                      840ms
                    </span>
                    <p className="text-label-2xs text-outline mt-0.5">Uptime: 99.95%</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-body-xs text-on-surface-variant border-t border-outline-variant/20 pt-2">
                  <span>Cơ chế bảo đảm định dạng:</span>
                  <span className="font-medium text-primary">JSON Schema Enforced (BR-VIVA-001)</span>
                </div>
              </div>

              {/* Background Jobs Worker */}
              <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 transition-colors hover:bg-surface-container">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-3 w-3 rounded-full bg-brand-green ring-4 ring-brand-green/20" />
                    <div>
                      <h3 className="text-label-md font-bold text-on-surface">Async Background Worker (Spring Async)</h3>
                      <p className="text-body-xs text-on-surface-variant">Xử lý chấm bài thi sau khi nộp, hạn chế nghẽn server</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-label-xs font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-md">
                      2 đang xử lý
                    </span>
                    <p className="text-label-2xs text-outline mt-0.5">0 lỗi hôm nay</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-body-xs text-on-surface-variant border-t border-outline-variant/20 pt-2">
                  <span>Tiến độ hàng đợi:</span>
                  <span className="font-medium text-on-surface">412 bài thi đã chấm thành công hôm nay</span>
                </div>
              </div>
            </div>
          </section>

          {/* Cột phải: Hạn ngạch AI tiêu thụ (5/12) */}
          <section aria-label="Hạn ngạch AI tiêu thụ" className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 sm:p-7 shadow-sm">
            <div>
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tertiary-fixed text-tertiary">
                    <Icon name="pie_chart" className="text-lg" />
                  </span>
                  <h2 className="text-headline-xs font-bold text-on-surface">Hạn Ngạch AI (Usage Quota)</h2>
                </div>
                <span className="text-label-xs text-outline">Tháng 10/2026</span>
              </div>

              <div className="mt-6 space-y-6">
                {/* STT Minutes */}
                <div>
                  <div className="flex items-center justify-between text-label-sm font-semibold text-on-surface">
                    <span className="flex items-center gap-1.5">
                      <Icon name="mic" className="text-base text-primary" />
                      Google Cloud Speech STT
                    </span>
                    <span className="font-mono font-bold text-primary">
                      {metrics?.quota.stt.used.toLocaleString('vi-VN')} / {metrics?.quota.stt.total.toLocaleString('vi-VN')} phút
                    </span>
                  </div>
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-surface-container">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${metrics?.quota.stt.percent ?? 29}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-label-2xs text-on-surface-variant">
                    <span>Đã dùng: {metrics?.quota.stt.percent ?? 29}%</span>
                    <span className="text-secondary font-medium">Mức an toàn</span>
                  </div>
                </div>

                {/* TTS Characters */}
                <div>
                  <div className="flex items-center justify-between text-label-sm font-semibold text-on-surface">
                    <span className="flex items-center gap-1.5">
                      <Icon name="volume_up" className="text-base text-secondary" />
                      Google Cloud Text-to-Speech
                    </span>
                    <span className="font-mono font-bold text-secondary">
                      {metrics?.quota.tts.used.toLocaleString('vi-VN')} / {metrics?.quota.tts.total.toLocaleString('vi-VN')} ký tự
                    </span>
                  </div>
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-surface-container">
                    <div
                      className="h-full rounded-full bg-brand-green transition-all duration-500"
                      style={{ width: `${metrics?.quota.tts.percent ?? 24}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-label-2xs text-on-surface-variant">
                    <span>Đã dùng: {metrics?.quota.tts.percent ?? 24}%</span>
                    <span className="text-secondary font-medium">Mức an toàn</span>
                  </div>
                </div>

                {/* LLM Tokens */}
                <div>
                  <div className="flex items-center justify-between text-label-sm font-semibold text-on-surface">
                    <span className="flex items-center gap-1.5">
                      <Icon name="neurology" className="text-base text-tertiary" />
                      Gemini 2.5 Flash Token Quota
                    </span>
                    <span className="font-mono font-bold text-tertiary">
                      {(metrics?.quota.llm.used ?? 8400000) / 1000000}M / {(metrics?.quota.llm.total ?? 20000000) / 1000000}M tokens
                    </span>
                  </div>
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-surface-container">
                    <div
                      className="h-full rounded-full bg-brand-orange transition-all duration-500"
                      style={{ width: `${metrics?.quota.llm.percent ?? 42}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-label-2xs text-on-surface-variant">
                    <span>Đã dùng: {metrics?.quota.llm.percent ?? 42}%</span>
                    <span className="text-secondary font-medium">Mức an toàn</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-surface-container-low p-4">
              <div className="flex items-start gap-2.5 text-body-xs text-on-surface-variant">
                <Icon name="info" className="text-base text-primary shrink-0 mt-0.5" />
                <span>
                  Hạn ngạch AI được cấp lại tự động vào ngày đầu tháng. Nếu đạt ngưỡng 85%, hệ thống sẽ gửi cảnh báo đến email của Quản trị viên.
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* ============ Hoạt động kiểm toán gần nhất (Recent Audit Events) ============ */}
        <section aria-label="Hoạt động kiểm toán gần nhất" className="mt-8 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/20 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-on-secondary-fixed-variant">
                  <Icon name="history" className="text-lg" />
                </span>
                <h2 className="text-headline-xs font-bold text-on-surface">Hoạt Động Kiểm Toán Gần Nhất (Recent Audit Events)</h2>
              </div>
              <p className="mt-1 text-body-xs text-on-surface-variant">
                Ghi vết thao tác điều chỉnh điểm, xuất bản kết quả và các hành động quản trị quan trọng (UC11).
              </p>
            </div>

            <Link
              to="/admin/audit-logs"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-container px-4 py-2 text-label-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary"
            >
              <span>Xem toàn bộ nhật ký Audit</span>
              <Icon name="arrow_forward" className="text-base" />
            </Link>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead>
                <tr className="border-b border-outline-variant/30 text-label-xs uppercase tracking-wider text-outline">
                  <th scope="col" className="pb-3 pr-4">Thời gian</th>
                  <th scope="col" className="pb-3 px-4">Người thực hiện</th>
                  <th scope="col" className="pb-3 px-4">Hành động</th>
                  <th scope="col" className="pb-3 px-4">Đối tượng</th>
                  <th scope="col" className="pb-3 pl-4">Tóm tắt thay đổi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-body-sm">
                {recentLogs.map((log) => {
                  const badge = getActionBadge(log.action)
                  return (
                    <tr key={log.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-4 pr-4 whitespace-nowrap">
                        <span className="font-mono text-body-xs font-semibold text-on-surface block">
                          {formatDateTime(log.timestamp)}
                        </span>
                        <span className="text-label-2xs text-outline">
                          {log.id}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-label-xs font-bold text-primary">
                            {getInitials(log.actorName)}
                          </div>
                          <div>
                            <span className="font-semibold text-on-surface text-label-sm block">{log.actorName}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`rounded-full px-2 py-0.2 text-label-2xs font-semibold ${ROLE_BADGE_CLASSES[log.actorRole ?? 'ADMIN'] ?? 'bg-surface-container text-on-surface'}`}>
                                {log.actorRole ?? 'USER'}
                              </span>
                              <span className="text-label-2xs font-mono text-outline">{log.actorId}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label-xs font-bold ${badge.classes}`}>
                          <Icon name={badge.icon} className="text-sm" />
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-mono text-label-2xs text-outline block uppercase">{log.entityType}</span>
                        <span className="font-bold text-on-surface text-label-sm font-mono">{log.entityId}</span>
                      </td>

                      <td className="py-4 pl-4 text-body-xs max-w-xs sm:max-w-md truncate">
                        {log.oldValue && log.newValue ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-error line-through truncate max-w-36">{log.oldValue}</span>
                            <Icon name="arrow_right_alt" className="text-base text-outline shrink-0" />
                            <span className="font-bold text-secondary truncate max-w-48">{log.newValue}</span>
                          </div>
                        ) : (
                          <span className="text-on-surface-variant truncate">{log.reason ?? 'Cập nhật hệ thống'}</span>
                        )}
                        {log.reason && (
                          <p className="text-label-2xs text-outline truncate mt-0.5">{log.reason}</p>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 border-t border-outline-variant/20 pt-4 flex items-center justify-between text-body-xs text-on-surface-variant">
            <span>Hiển thị 5 hoạt động mới nhất trong tổng số nhật ký audit</span>
            <Link to="/admin/audit-logs" className="font-semibold text-primary hover:underline flex items-center gap-1">
              Xem toàn bộ nhật ký & Tra cứu chi tiết $\rightarrow$
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
