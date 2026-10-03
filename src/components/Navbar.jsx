import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ROLES } from '../constants/roles.js'
import { useAuth } from '../hooks/useAuth.js'
import { useLanguage } from '../hooks/useLanguage.js'
import Icon from './Icon.jsx'
import LanguageSwitch from './LanguageSwitch.jsx'
import Logo from './Logo.jsx'

// Liên kết tới các mục của trang chủ (chỉ hiện khi đang ở trang chủ).
const HOME_SECTION_LINKS = [
  { href: '#tinh-nang', labelKey: 'nav.features' },
  { href: '#quy-trinh', labelKey: 'nav.process' },
  { href: '#cham-diem', labelKey: 'nav.grading' },
]

const navLinkClass = ({ isActive }) =>
  `rounded-full px-4 py-2 text-label-md transition-colors ${
    isActive
      ? 'bg-surface-container text-primary'
      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
  }`

/**
 * Thanh điều hướng cố định ở đầu trang.
 * Trang chủ dùng <Navbar showHomeSections />, các trang còn lại dùng <Navbar />.
 */
function Navbar({ showHomeSections = false }) {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const isAdmin = user?.role === ROLES.ADMIN

  const handleLogout = () => {
    // Về trang chủ trước rồi mới đăng xuất, để trang đang mở (hồ sơ, quản trị)
    // không bị ghi nhớ làm trang quay lại cho người đăng nhập kế tiếp.
    navigate('/')
    logout()
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-surface-container-lowest/90 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6 lg:px-12">
        <Logo compact />

        <nav aria-label={t('nav.main')} className="hidden items-center gap-2 lg:flex">
          {showHomeSections &&
            HOME_SECTION_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-4 py-2 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
              >
                {t(link.labelKey)}
              </a>
            ))}
          {isAdmin && (
            <NavLink to="/admin/users" className={navLinkClass}>
              {t('nav.manageAccounts')}
            </NavLink>
          )}
        </nav>

        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <LanguageSwitch className="mr-1 sm:mr-2" />

          {user ? (
            <>
              {isAdmin && (
                <Link
                  to="/admin/users"
                  aria-label={t('nav.manageAccounts')}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-surface-container lg:hidden"
                >
                  <Icon name="manage_accounts" className="text-xl" />
                </Link>
              )}
              <Link
                to="/profile"
                aria-label={t('nav.profileOf', { name: user.fullName })}
                className="flex min-w-0 items-center gap-3 rounded-full py-1.5 pr-1.5 pl-1.5 transition-colors hover:bg-surface-container md:pl-4"
              >
                <span className="hidden min-w-0 text-right md:block">
                  <span className="block max-w-40 truncate text-label-md text-on-surface">{user.fullName}</span>
                  <span className="block text-body-sm text-on-surface-variant">{t(`roles.${user.role}`)}</span>
                </span>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
                  <Icon name="person" filled className="text-xl" />
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2.5 text-label-md text-primary transition-colors hover:bg-surface-container sm:px-4"
              >
                <Icon name="logout" className="text-lg" />
                <span className="sr-only md:not-sr-only">{t('common.logout')}</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="shrink-0 rounded-full px-3 py-2.5 text-label-md text-primary transition-colors hover:bg-surface-container max-[359px]:hidden sm:px-5"
              >
                {t('common.login')}
              </Link>
              <Link
                to="/register"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary-container px-4 py-2.5 text-label-md text-on-primary shadow-lg shadow-primary-container/25 transition-colors hover:bg-primary sm:px-6"
              >
                {t('common.register')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
