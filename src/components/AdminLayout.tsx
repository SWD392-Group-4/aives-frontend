import { ReactNode, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'
import Icon from './Icon'
import LanguageSwitch from './LanguageSwitch'
import Logo from './Logo'

interface AdminLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
  breadcrumbs?: Array<{ label: string; to?: string }>
}

interface NavItem {
  to: string
  label: string
  icon: string
  exact?: boolean
}

const ADMIN_CORE_ITEMS: NavItem[] = [
  { to: '/admin/dashboard', label: 'Bảng điều khiển', icon: 'dashboard', exact: true },
  { to: '/admin/users', label: 'Quản lý Người dùng', icon: 'manage_accounts' },
  { to: '/admin/settings', label: 'Cấu hình Tham số AI', icon: 'tune' },
  { to: '/admin/audit-logs', label: 'Nhật ký Kiểm toán', icon: 'history_edu' },
]

const EXAM_OPS_ITEMS: NavItem[] = [
  { to: '/exam-sessions', label: 'Phiên thi & Giám sát', icon: 'event_note' },
  { to: '/lecturer/curriculum', label: 'Chương trình học', icon: 'account_tree' },
  { to: '/lecturer/materials', label: 'Học liệu & RAG', icon: 'folder_open' },
  { to: '/lecturer/questions', label: 'Ngân hàng câu hỏi', icon: 'quiz' },
  { to: '/lecturer/rubrics', label: 'Rubric đánh giá', icon: 'fact_check' },
  { to: '/lecturer/reviews', label: 'Thẩm định điểm (HITL)', icon: 'rate_review' },
  { to: '/lecturer/appeals', label: 'Đơn phúc khảo', icon: 'gavel' },
]

export default function AdminLayout({
  children,
  title,
  subtitle,
  breadcrumbs,
}: AdminLayoutProps) {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [examOpsOpen, setExamOpsOpen] = useState(true)

  const handleLogout = () => {
    navigate('/')
    logout()
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-label-sm font-semibold transition-all ${
      isActive
        ? 'bg-primary text-on-primary shadow-xs'
        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
    } ${collapsed ? 'justify-center px-2.5' : ''}`

  return (
    <div className="flex min-h-screen bg-background text-on-surface">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Đóng thanh điều hướng"
          className="fixed inset-0 z-40 bg-on-surface/40 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter') setSidebarOpen(false)
          }}
        />
      )}

      {/* Sidebar Cột Dọc */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-outline-variant/30 bg-surface-container-lowest/95 backdrop-blur-xl transition-all duration-300 lg:static ${
          collapsed ? 'w-20' : 'w-72'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Sidebar Header */}
        <div className="flex h-18 shrink-0 items-center justify-between border-b border-outline-variant/30 px-4">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Logo compact />
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-label-sm font-extrabold tracking-tight text-on-surface">
                  AIVES
                </span>
                <span className="inline-flex items-center gap-1 text-label-2xs font-bold text-primary uppercase tracking-widest">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Admin Console
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Đóng thanh điều hướng"
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container lg:hidden"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Nhóm 1: Quản trị hệ thống */}
          <div>
            {!collapsed && (
              <h3 className="px-3 pb-2 text-label-2xs font-extrabold uppercase tracking-wider text-outline">
                Quản Trị Hệ Thống
              </h3>
            )}
            <nav className="space-y-1">
              {ADMIN_CORE_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  title={collapsed ? item.label : undefined}
                  className={navLinkClass}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon name={item.icon} className="text-xl shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Nhóm 2: Khảo thí & Học liệu */}
          <div>
            <div
              className={`flex items-center justify-between px-3 pb-2 ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              {!collapsed ? (
                <>
                  <h3 className="text-label-2xs font-extrabold uppercase tracking-wider text-outline">
                    Khảo Thí & Học Liệu
                  </h3>
                  <button
                    type="button"
                    onClick={() => setExamOpsOpen(!examOpsOpen)}
                    className="text-outline hover:text-on-surface transition-colors"
                    title={examOpsOpen ? 'Thu gọn nhóm' : 'Mở rộng nhóm'}
                  >
                    <Icon
                      name={examOpsOpen ? 'expand_less' : 'expand_more'}
                      className="text-base"
                    />
                  </button>
                </>
              ) : (
                <div className="h-px w-6 bg-outline-variant/50 my-1" />
              )}
            </div>

            {examOpsOpen && (
              <nav className="space-y-1">
                {EXAM_OPS_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={navLinkClass}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon name={item.icon} className="text-xl shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                ))}
              </nav>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="shrink-0 border-t border-outline-variant/30 p-3">
          {!collapsed ? (
            <div className="rounded-2xl bg-surface-container-low p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-brand-green ring-4 ring-brand-green/20" />
                  <span className="text-label-xs font-bold text-on-surface">Hệ thống Online</span>
                </div>
                <span className="font-mono text-label-2xs text-outline">v1.0.0</span>
              </div>
              <p className="mt-1 text-label-2xs text-on-surface-variant">
                Google Cloud AI & Supabase
              </p>
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <span className="flex h-3 w-3 rounded-full bg-brand-green ring-4 ring-brand-green/20" title="Hệ thống Online v1.0.0" />
            </div>
          )}

          {/* Desktop Collapse Toggle Button */}
          <div className="mt-2 hidden lg:flex justify-end">
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-1.5 text-label-xs font-semibold text-outline hover:bg-surface-container-high hover:text-on-surface transition-colors"
              title={collapsed ? 'Mở rộng thanh menu' : 'Thu nhỏ thanh menu'}
            >
              <Icon name={collapsed ? 'chevron_right' : 'chevron_left'} className="text-lg" />
              {!collapsed && <span>Thu gọn thanh bên</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-outline-variant/30 bg-surface-container-lowest/80 px-4 sm:px-6 lg:px-8 backdrop-blur-xl">
          {/* Left: Mobile hamburger & Breadcrumbs / Page Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở thanh điều hướng"
              className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container lg:hidden"
            >
              <Icon name="menu" className="text-2xl" />
            </button>

            {breadcrumbs && breadcrumbs.length > 0 ? (
              <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-label-sm">
                <Link to="/admin/dashboard" className="text-on-surface-variant hover:text-primary transition-colors">
                  Admin
                </Link>
                {breadcrumbs.map((crumb, idx) => (
                  <span key={idx} className="flex items-center gap-1.5">
                    <Icon name="chevron_right" className="text-base text-outline" />
                    {crumb.to ? (
                      <Link to={crumb.to} className="text-on-surface-variant hover:text-primary transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="font-bold text-on-surface">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            ) : (
              <h2 className="text-label-lg sm:text-headline-xs font-bold text-on-surface">
                {title || 'Quản Trị Hệ Thống'}
              </h2>
            )}
          </div>

          {/* Right: Quick actions, Language, Profile & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Indicator */}
            <div className="hidden sm:inline-flex items-center gap-2 rounded-full bg-secondary-container/60 px-3 py-1 text-label-xs font-bold text-secondary">
              <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse" />
              <span>SOC Live</span>
            </div>

            <LanguageSwitch className="mr-1" />

            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-outline-variant/30">
                <Link
                  to="/profile"
                  className="flex items-center gap-2.5 rounded-full py-1 px-2 hover:bg-surface-container transition-colors"
                  title="Hồ sơ tài khoản"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary font-bold">
                    <Icon name="person" filled className="text-lg" />
                  </span>
                  <div className="hidden md:block text-left">
                    <span className="block max-w-28 truncate text-label-xs font-bold text-on-surface leading-tight">
                      {user.fullName}
                    </span>
                    <span className="block text-label-2xs text-on-surface-variant leading-none">
                      {t(`roles.${user.role}`)}
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-label-xs font-semibold text-primary hover:bg-surface-container transition-colors"
                  title="Đăng xuất"
                >
                  <Icon name="logout" className="text-lg" />
                  <span className="hidden sm:inline">Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {(title || subtitle) && (
            <div className="mb-6">
              {title && (
                <h1 className="text-headline-md sm:text-headline-lg font-extrabold tracking-tight text-on-surface">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1 text-body-sm sm:text-body-md text-on-surface-variant max-w-3xl">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  )
}
