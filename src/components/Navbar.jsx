import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import Icon from './Icon.jsx'
import Logo from './Logo.jsx'

const NAV_LINKS = [
  { href: '#tinh-nang', label: 'Tính năng' },
  { href: '#quy-trinh', label: 'Quy trình' },
  { href: '#cham-diem', label: 'Chấm điểm' },
]

const ROLE_LABELS = {
  ADMIN: 'Quản trị viên',
  LECTURER: 'Giảng viên',
  STUDENT: 'Sinh viên',
}

/** Thanh điều hướng cố định ở đầu trang chủ. */
function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-surface-container-lowest/90 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-12">
        <Logo />

        <nav aria-label="Điều hướng chính" className="hidden items-center gap-2 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {user ? (
          <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-label-md text-on-surface">{user.fullName}</p>
              <p className="text-body-sm text-on-surface-variant">{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary"
            >
              <Icon name="person" filled className="text-xl" />
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2.5 text-label-md text-primary transition-colors hover:bg-surface-container sm:px-4"
            >
              <Icon name="logout" className="text-lg" />
              Đăng xuất
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              to="/login"
              className="rounded-full px-3 py-2.5 text-label-md text-primary transition-colors hover:bg-surface-container sm:px-5"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-full bg-primary-container px-4 py-2.5 text-label-md text-on-primary shadow-lg shadow-primary-container/25 transition-colors hover:bg-primary sm:px-6"
            >
              Đăng ký
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}

export default Navbar
