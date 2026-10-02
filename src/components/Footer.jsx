import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'

function Footer() {
  return (
    <footer className="w-full bg-surface-container-lowest">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-10 md:flex-row lg:px-12">
        <div className="flex flex-col items-center gap-2 md:flex-row md:gap-4">
          <Logo />
          <span className="text-body-sm text-on-surface-variant">
            Đồ án SWD392 - Nhóm 4
          </span>
        </div>

        <nav aria-label="Liên kết cuối trang" className="flex flex-wrap items-center justify-center gap-6">
          <a href="#tinh-nang" className="text-body-sm text-on-surface-variant transition-colors hover:text-on-surface">
            Tính năng
          </a>
          <a href="#quy-trinh" className="text-body-sm text-on-surface-variant transition-colors hover:text-on-surface">
            Quy trình
          </a>
          <Link to="/login" className="text-body-sm text-on-surface-variant transition-colors hover:text-on-surface">
            Đăng nhập
          </Link>
          <Link to="/register" className="text-body-sm text-on-surface-variant transition-colors hover:text-on-surface">
            Đăng ký
          </Link>
        </nav>
      </div>
    </footer>
  )
}

export default Footer
