import { Link } from 'react-router-dom'
import { useLanguage } from '../hooks/useLanguage.js'

/**
 * Logo AIVES.AI, bấm vào để về trang chủ.
 * compact: ẩn chữ trên màn hình nhỏ, chỉ còn biểu tượng (dùng trong navbar).
 */
function Logo({ className = '', compact = false }) {
  const { t } = useLanguage()

  return (
    <Link
      to="/"
      aria-label={t('brand.logoLabel')}
      className={`inline-flex shrink-0 items-center gap-2.5 rounded-xl ${className}`}
    >
      <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9 shrink-0" aria-hidden="true">
        <rect x="2" y="2" width="36" height="36" rx="12" className="fill-brand-blue" />
        <path
          d="M12 22C12 16 16 12 20 12C24 12 28 16 28 22C28 25 25 28 20 28C15 28 12 25 12 22Z"
          className="stroke-on-primary"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="17" cy="20" r="2" className="fill-on-primary" />
        <circle cx="23" cy="20" r="2" className="fill-on-primary" />
        <path
          d="M18 24C19 25 21 25 22 24"
          className="stroke-on-primary"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="28" cy="10" r="3" className="fill-brand-green" />
      </svg>
      <span className={`text-headline-md font-extrabold tracking-tight ${compact ? 'hidden sm:inline' : ''}`}>
        <span className="text-primary-container">AIVES</span>
        <span className="text-secondary">.AI</span>
      </span>
    </Link>
  )
}

export default Logo
