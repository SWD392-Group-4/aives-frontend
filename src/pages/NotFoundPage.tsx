import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import LanguageSwitch from '../components/LanguageSwitch.jsx'
import Logo from '../components/Logo.jsx'
import Mascot from '../components/Mascot.jsx'
import { getHomePathForRole } from '../constants/roles.js'
import { useAuth } from '../hooks/useAuth.js'
import { useLanguage } from '../hooks/useLanguage.js'

function NotFoundPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const navigate = useNavigate()

  const dashboardPath = user ? getHomePathForRole(user.role) : '/login'

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-between overflow-hidden bg-surface p-4 sm:p-6 lg:p-10">
      {/* Các đốm sáng trang trí mờ phía sau */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary-container/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -right-24 h-80 w-80 rounded-full bg-secondary-fixed-dim/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-primary-fixed/30 blur-3xl"
      />

      {/* Header thanh điều hướng trên cùng */}
      <header className="relative z-10 flex w-full max-w-5xl items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-label-md font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <Icon name="home" className="text-lg" />
            {t('common.home')}
          </Link>
        </div>
      </header>

      {/* Nội dung trung tâm 404 */}
      <section className="relative z-10 my-auto flex w-full max-w-3xl flex-col items-center py-8 text-center">
        {/* Hình ảnh Mascot AIVES với hiệu ứng nổi */}
        <div className="relative mb-6">
          <div aria-hidden="true" className="absolute inset-4 rounded-full bg-primary/20 blur-2xl" />
          <Mascot className="relative z-10 h-44 w-44 shadow-2xl sm:h-52 sm:w-52" />
          <div className="absolute -bottom-2 -right-3 z-20 flex items-center gap-1.5 rounded-2xl bg-surface-container-lowest/95 px-3.5 py-1.5 shadow-lg border border-outline-variant/30">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-error" />
            <span className="text-label-sm font-bold text-on-surface">404 Error</span>
          </div>
        </div>

        {/* Badge 404 */}
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-error-container/60 px-4 py-1.5 text-label-sm font-bold text-on-error-container">
          <Icon name="search_off" className="text-base" />
          <span>{t('notFound.badge')}</span>
        </div>

        {/* Tiêu đề & mô tả */}
        <h1 className="mb-3 text-headline-xl text-on-surface sm:text-display-sm">
          {t('notFound.title')}
        </h1>
        <p className="max-w-xl text-body-lg text-on-surface-variant">
          {t('notFound.subtitle')}
        </p>

        <p className="mt-2 max-w-md text-body-sm text-outline">
          {t('notFound.mascotHint')}
        </p>

        {/* Nhóm nút điều hướng chính */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-label-lg text-on-primary shadow-lg shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-tint active:translate-y-0"
          >
            <Icon name="home" className="text-xl" />
            <span>{t('notFound.home')}</span>
          </Link>

          <button
            type="button"
            onClick={() => navigate(dashboardPath)}
            className="inline-flex items-center gap-2 rounded-full bg-secondary-container px-7 py-3.5 text-label-lg text-on-secondary-container shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary-fixed active:translate-y-0"
          >
            <Icon name="dashboard" className="text-xl" />
            <span>{t('notFound.dashboard')}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-full border border-outline/30 px-5 py-3.5 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <Icon name="arrow_back" className="text-lg" />
            <span>{t('notFound.back')}</span>
          </button>
        </div>
      </section>

      {/* Footer nhỏ */}
      <footer className="relative z-10 w-full text-center text-body-xs text-outline py-2">
        AIVES — Nền tảng thi vấn đáp thông minh cùng AI
      </footer>
    </main>
  )
}

export default NotFoundPage
