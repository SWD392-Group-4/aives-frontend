import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ROLES } from '../constants/roles'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'
import Icon from './Icon'
import LanguageSwitch from './LanguageSwitch'
import Logo from './Logo'

interface NavbarProps {
  showHomeSections?: boolean
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3.5 py-2 text-label-sm font-medium transition-colors ${
    isActive
      ? 'bg-surface-container text-primary font-bold'
      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
  }`

export default function Navbar({ showHomeSections = false }: NavbarProps) {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const isAdmin = user?.role === ROLES.ADMIN
  const isLecturer = user?.role === ROLES.LECTURER
  const isStudent = user?.role === ROLES.STUDENT

  const handleLogout = () => {
    navigate('/')
    logout()
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-surface-container-lowest/90 shadow-sm backdrop-blur-xl border-b border-outline-variant/30">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Logo compact />

          {/* Navigation Links for Large Screens */}
          <nav aria-label="Main Navigation" className="hidden items-center gap-1.5 lg:flex">
            {showHomeSections && (
              <>
                <a
                  href="#tinh-nang"
                  className="rounded-full px-3.5 py-2 text-label-sm font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                >
                  Tính năng
                </a>
                <a
                  href="#quy-trinh"
                  className="rounded-full px-3.5 py-2 text-label-sm font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                >
                  Quy trình
                </a>
                <a
                  href="#cham-diem"
                  className="rounded-full px-3.5 py-2 text-label-sm font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                >
                  Chấm điểm AI
                </a>
              </>
            )}

            {/* Menu Sinh viên */}
            {isStudent && (
              <>
                <NavLink to="/exam/join" className={navLinkClass}>
                  Vào ca thi
                </NavLink>
                <NavLink to="/student/results" className={navLinkClass}>
                  Kết quả thi
                </NavLink>
              </>
            )}

            {/* Menu Giảng viên / Admin */}
            {(isLecturer || isAdmin) && (
              <>
                <NavLink to="/exam-sessions" className={navLinkClass}>
                  Phiên thi
                </NavLink>
                <NavLink to="/lecturer/questions" className={navLinkClass}>
                  Ngân hàng câu hỏi
                </NavLink>
                <NavLink to="/lecturer/rubrics" className={navLinkClass}>
                  Rubric
                </NavLink>
                <NavLink to="/lecturer/reviews" className={navLinkClass}>
                  Thẩm định điểm (HITL)
                </NavLink>
                <NavLink to="/lecturer/appeals" className={navLinkClass}>
                  Phúc khảo
                </NavLink>
              </>
            )}

            {/* Menu Admin */}
            {isAdmin && (
              <>
                <NavLink to="/admin/users" className={navLinkClass}>
                  Tài khoản
                </NavLink>
                <NavLink to="/admin/settings" className={navLinkClass}>
                  Cấu hình & Audit
                </NavLink>
              </>
            )}
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <LanguageSwitch className="mr-1 sm:mr-2" />

          {user ? (
            <>
              {/* Profile button */}
              <Link
                to="/profile"
                aria-label={`Hồ sơ của ${user.fullName}`}
                className="flex min-w-0 items-center gap-2.5 rounded-full py-1.5 pr-2 pl-2 transition-colors hover:bg-surface-container md:pl-3"
              >
                <span className="hidden min-w-0 text-right md:block">
                  <span className="block max-w-36 truncate text-label-sm font-bold text-on-surface">{user.fullName}</span>
                  <span className="block text-body-xs text-on-surface-variant">{t(`roles.${user.role}`)}</span>
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary font-bold">
                  <Icon name="person" filled className="text-lg" />
                </span>
              </Link>

              {/* Logout button */}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-label-sm text-primary transition-colors hover:bg-surface-container"
              >
                <Icon name="logout" className="text-lg" />
                <span className="sr-only sm:not-sr-only">Đăng xuất</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="shrink-0 rounded-full px-4 py-2 text-label-md font-semibold text-primary transition-colors hover:bg-surface-container"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary-container px-5 py-2.5 text-label-md font-semibold text-on-primary shadow-md hover:bg-primary transition-colors"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
