import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'
import Icon from '../components/Icon'
import { ROLE_BADGE_CLASSES } from '../constants/roles'
import { AdminDashboardStats, systemService } from '../services/systemService'
import { AuditLog } from '../types'
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
  const [metrics, setMetrics] = useState<AdminDashboardStats | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const fetchData = useCallback(async () => {
    try {
      const [m, logs] = await Promise.all([
        systemService.getDashboardStats(),
        systemService.getAuditLogs({ page: 0, size: 5 }).catch(() => []),
      ])
      setMetrics(m)
      setRecentLogs(logs.slice(0, 5))
      setLoadError(null)
      setLastUpdated(
        new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      )
    } catch (err: any) {
      setLoadError(err?.message || 'Không tải được số liệu hệ thống.')
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
    <AdminLayout
      breadcrumbs={[{ label: 'Bảng Điều Khiển' }]}
    >
      <div className="space-y-6">
        {/* ============ Header Banner Tinh Gọn ============ */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-xs">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-high px-3 py-1 text-label-xs font-semibold text-primary">
              <span className="flex h-2 w-2 rounded-full bg-brand-green animate-pulse" />
              AIVES System Operations Center (SOC)
            </div>
            <h1 className="mt-2 text-headline-sm sm:text-headline-md font-extrabold tracking-tight text-on-surface">
              Bảng Điều Khiển Quản Trị Hệ Thống
            </h1>
            <p className="mt-1 text-body-xs sm:text-body-sm text-on-surface-variant max-w-2xl">
              Giám sát tài nguyên AI, ca thi trực tuyến và nhật ký kiểm toán toàn hệ sinh thái theo thời gian thực.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {lastUpdated && (
              <span className="text-body-xs text-outline hidden md:inline-block">
                Cập nhật: <strong className="text-on-surface font-mono">{lastUpdated}</strong>
              </span>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full bg-surface-container px-4 py-2 text-label-sm font-semibold text-primary transition-all hover:bg-surface-container-high disabled:opacity-50"
              title="Làm mới số liệu"
            >
              <Icon name="refresh" className={`text-lg ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Đang tải...' : 'Làm mới'}</span>
            </button>
          </div>
        </div>

        {loadError && (
          <div className="rounded-2xl bg-error-container p-4 text-sm font-semibold text-on-error-container">{loadError}</div>
        )}

        {/* ============ Thẻ KPI (dữ liệu từ /admin/dashboard) ============ */}
        <section aria-label="Chỉ số vận hành cốt lõi" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {/* Card 1: Tổng người dùng */}
          <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-xs transition-shadow hover:shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
              <Icon name="groups" filled className="text-2xl" />
            </span>
            <div className="mt-4">
              <p className="text-body-xs font-medium text-on-surface-variant">Tổng tài khoản</p>
              <p className="text-headline-md font-extrabold text-on-surface tracking-tight mt-0.5">
                {loading ? '...' : (metrics?.totalUsers ?? 0).toLocaleString('vi-VN')}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-outline-variant/20 pt-2.5 text-label-2xs text-on-surface-variant">
              <span>SV: <strong>{metrics?.totalStudents ?? 0}</strong></span>
              <span>GV: <strong>{metrics?.totalLecturers ?? 0}</strong></span>
              <span>Admin: <strong>{metrics?.totalAdmins ?? 0}</strong></span>
            </div>
          </div>

          {/* Card 2: Ca thi đang mở */}
          <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-xs transition-shadow hover:shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-fixed-variant">
              <Icon name="meeting_room" filled className="text-2xl" />
            </span>
            <div className="mt-4">
              <p className="text-body-xs font-medium text-on-surface-variant">Phiên thi đang mở</p>
              <p className="text-headline-md font-extrabold text-on-surface tracking-tight mt-0.5">
                {loading ? '...' : metrics?.ongoingExamSessions ?? 0}
              </p>
            </div>
            <div className="mt-3 border-t border-outline-variant/20 pt-2.5 text-label-2xs text-on-surface-variant">
              <Link to="/exam-sessions" className="font-semibold text-primary hover:underline">
                Xem danh sách phiên thi
              </Link>
            </div>
          </div>

          {/* Card 3: Trạng thái AI */}
          <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-xs transition-shadow hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-container-highest text-primary">
                <Icon name="neurology" filled className="text-2xl" />
              </span>
              {metrics?.aiStatus && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-2xs font-bold ${
                    metrics.aiStatus.enabled ? 'bg-brand-green/10 text-brand-green' : 'bg-error-container text-on-error-container'
                  }`}
                >
                  {metrics.aiStatus.status || (metrics.aiStatus.enabled ? 'ACTIVE' : 'DISABLED')}
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-body-xs font-medium text-on-surface-variant">Mô hình AI vận hành</p>
              <p className="text-headline-sm font-extrabold text-on-surface tracking-tight mt-0.5 truncate">
                {loading ? '...' : metrics?.aiStatus?.model || '—'}
              </p>
            </div>
            <div className="mt-3 border-t border-outline-variant/20 pt-2.5 text-label-2xs text-on-surface-variant">
              Nhà cung cấp: <strong>{metrics?.aiStatus?.provider || '—'}</strong>
            </div>
          </div>
        </section>

        {/* ============ Bố Cục 2 Cột Cân Đối (Grid 7:5) ============ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Cột Trái (7/12): Hạn ngạch AI & Hoạt động kiểm toán */}
          <div className="lg:col-span-7 space-y-6">
            {/* Widget 2: Hoạt động kiểm toán gần nhất */}
            <section aria-label="Hoạt động kiểm toán gần nhất" className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                    <Icon name="history_edu" className="text-lg" />
                  </span>
                  <div>
                    <h2 className="text-label-lg font-bold text-on-surface">Nhật Ký Kiểm Toán Mới Nhất</h2>
                    <p className="text-label-2xs text-on-surface-variant">Vết can thiệp điểm & thao tác quản trị (UC11)</p>
                  </div>
                </div>
                <Link
                  to="/admin/audit-logs"
                  className="rounded-full bg-surface-container px-3 py-1 text-label-xs font-semibold text-primary hover:bg-surface-container-high transition-colors"
                >
                  Xem tất cả
                </Link>
              </div>

              <div className="mt-4 divide-y divide-outline-variant/20">
                {recentLogs.map((log) => {
                  const badge = getActionBadge(log.action)
                  return (
                    <div key={log.id} className="py-3 flex items-center justify-between gap-3 text-body-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-label-xs font-bold text-primary">
                          {getInitials(log.actorName)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-on-surface text-label-xs truncate">
                              {log.actorName}
                            </span>
                            <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-label-2xs font-semibold ${badge.classes}`}>
                              <Icon name={badge.icon} className="text-xs" />
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-label-2xs text-outline truncate mt-0.5">
                            {log.reason || `${log.entityType} #${log.entityId}`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-label-2xs text-outline block">
                          {formatDateTime(log.timestamp)}
                        </span>
                        <span className="text-label-2xs font-mono text-primary">
                          #{log.entityId}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          {/* Cột Phải (5/12): Service Health & Quick Actions */}
          <div className="lg:col-span-5 space-y-6">
            {/* Widget 4: Phím tắt quản trị nhanh (Quick Actions) */}
            <section aria-label="Lối tắt quản trị nhanh" className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-xs">
              <h2 className="text-label-lg font-bold text-on-surface border-b border-outline-variant/20 pb-3">
                Lối Tắt Quản Trị Nhanh
              </h2>
              <div className="mt-4 space-y-2.5">
                <Link
                  to="/admin/users"
                  className="group flex items-center justify-between rounded-2xl border border-outline-variant/20 bg-surface-container-low p-3.5 hover:border-primary/50 hover:bg-surface-container transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-fixed text-primary group-hover:scale-105 transition-transform">
                      <Icon name="person_add" className="text-lg" />
                    </span>
                    <div>
                      <p className="text-label-xs font-bold text-on-surface">Tạo Người Dùng Mới</p>
                      <p className="text-label-2xs text-on-surface-variant">Cấp tài khoản SV/GV nhanh chóng</p>
                    </div>
                  </div>
                  <Icon name="arrow_forward" className="text-base text-outline group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </Link>

                <Link
                  to="/admin/settings"
                  className="group flex items-center justify-between rounded-2xl border border-outline-variant/20 bg-surface-container-low p-3.5 hover:border-primary/50 hover:bg-surface-container transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container-highest text-primary group-hover:scale-105 transition-transform">
                      <Icon name="tune" className="text-lg" />
                    </span>
                    <div>
                      <p className="text-label-xs font-bold text-on-surface">Cấu Hình Tham Số AI</p>
                      <p className="text-label-2xs text-on-surface-variant">Model AI, STT & ngưỡng im lặng</p>
                    </div>
                  </div>
                  <Icon name="arrow_forward" className="text-base text-outline group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </Link>

                <Link
                  to="/admin/audit-logs"
                  className="group flex items-center justify-between rounded-2xl border border-outline-variant/20 bg-surface-container-low p-3.5 hover:border-primary/50 hover:bg-surface-container transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-tertiary-fixed text-tertiary group-hover:scale-105 transition-transform">
                      <Icon name="history_edu" className="text-lg" />
                    </span>
                    <div>
                      <p className="text-label-xs font-bold text-on-surface">Tra Cứu Audit Logs</p>
                      <p className="text-label-2xs text-on-surface-variant">Vết can thiệp điểm & phúc khảo (UC11)</p>
                    </div>
                  </div>
                  <Icon name="arrow_forward" className="text-base text-outline group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
