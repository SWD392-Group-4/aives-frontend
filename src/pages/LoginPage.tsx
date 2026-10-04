import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import LanguageSwitch from '../components/LanguageSwitch.jsx'
import Logo from '../components/Logo.jsx'
import Mascot from '../components/Mascot.jsx'
import TextField from '../components/TextField.jsx'
import { getHomePathForRole, ROLES } from '../constants/roles.js'
import { useAuth } from '../hooks/useAuth.js'
import { useLanguage } from '../hooks/useLanguage.js'
import { getErrorMessage } from '../i18n/errorMessage.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ROLE_ORDER = [ROLES.STUDENT, ROLES.LECTURER, ROLES.ADMIN]

function validate(form, t) {
  const errors = {}
  if (!form.email.trim()) {
    errors.email = t('validation.emailRequired')
  } else if (!EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = t('validation.emailInvalid')
  }
  if (!form.password) {
    errors.password = t('validation.passwordRequired')
  }
  return errors
}

function LoginPage() {
  const { user, login } = useAuth()
  const { t, language } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  // Trang đăng ký chuyển sang đây kèm email vừa tạo.
  const registeredEmail = location.state?.registeredEmail ?? ''
  // Trang hồ sơ chuyển sang đây sau khi đổi mật khẩu.
  const passwordChanged = location.state?.passwordChanged === true

  const [form, setForm] = useState({ email: registeredEmail, password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Trang sẽ tới sau khi đăng nhập: trang đang muốn vào trước đó,
  // nếu không có thì là trang mặc định của role (admin -> quản lý tài khoản).
  const getTargetPath = (account) => location.state?.from ?? getHomePathForRole(account.role)

  // Đã đăng nhập mà vẫn mở trang này thì chuyển đi luôn.
  // Riêng lúc vừa đổi mật khẩu thì ở lại: phiên cũ đang được đăng xuất, cần hiện lời nhắc đăng nhập lại.
  if (user && !passwordChanged) {
    return <Navigate to={getTargetPath(user)} replace />
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setFormError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(form, t)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setFormError('')
    try {
      const account = await login(form.email.trim(), form.password)
      navigate(getTargetPath(account), { replace: true })
    } catch (error) {
      setErrors(error.fieldErrors ?? {})
      setFormError(getErrorMessage(error, language))
      setSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-surface p-4 lg:p-10">
      {/* Các đốm sáng trang trí phía sau */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary-container/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute top-1/2 -right-24 h-80 w-80 rounded-full bg-secondary-fixed-dim/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-primary-fixed/30 blur-3xl" />

      <div className="relative z-10 grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-2xl lg:grid-cols-12 lg:rounded-[3rem]">
        {/* ============ CỘT TRÁI: giới thiệu ============ */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-primary via-primary-container to-surface-tint p-12 text-on-primary lg:col-span-5 lg:flex">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-64 w-64 animate-ping rounded-full border border-on-primary/10 opacity-20" />
            <div className="absolute h-[420px] w-[420px] rounded-full border border-on-primary/10 opacity-30" />
            <div className="absolute h-[600px] w-[600px] rounded-full border border-on-primary/5 opacity-20" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-on-primary/15 px-3.5 py-1.5 backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-secondary-container" />
              <span className="text-label-sm tracking-wide uppercase">{t('auth.panelBadge')}</span>
            </div>
            <h2 className="text-headline-xl">
              {t('auth.panelTitleLine1')}
              <br />
              <span className="text-secondary-fixed">{t('auth.panelTitleHighlight')}</span>
              <br />
              {t('auth.panelTitleLine3')}
            </h2>
            <p className="max-w-xs text-body-md text-on-primary/80">{t('auth.panelIntro')}</p>
          </div>

          <div className="relative z-10 my-8 flex items-center justify-center">
            <div className="relative">
              <div aria-hidden="true" className="absolute inset-4 rounded-full bg-on-primary/20 blur-xl" />
              <Mascot className="relative z-10 h-56 w-56 shadow-2xl" />

              <div className="absolute -bottom-2 -left-10 z-20 flex -rotate-2 items-center gap-2 rounded-2xl bg-surface-container-lowest/95 px-3.5 py-2 shadow-lg">
                <Icon name="psychology" filled className="text-xl text-secondary" />
                <div>
                  <p className="text-label-sm font-bold text-on-surface">{t('auth.chipFollowUpTitle')}</p>
                  <p className="text-[11px] leading-4 text-outline">{t('auth.chipFollowUpText')}</p>
                </div>
              </div>

              <div className="absolute top-2 -right-10 z-20 flex rotate-3 items-center gap-2 rounded-2xl bg-surface-container-lowest/95 px-3.5 py-2 shadow-lg">
                <Icon name="graphic_eq" filled className="text-xl text-primary" />
                <div>
                  <p className="text-label-sm font-bold text-on-surface">{t('auth.chipVoiceTitle')}</p>
                  <p className="text-[11px] leading-4 text-outline">{t('auth.chipVoiceText')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-2 border-t border-on-primary/10 pt-5">
            <span className="mr-1 text-body-sm text-on-primary/70">{t('auth.forRoles')}</span>
            {ROLE_ORDER.map((role) => (
              <span key={role} className="rounded-full bg-on-primary/15 px-3 py-1 text-label-sm">
                {t(`roles.${role}`)}
              </span>
            ))}
          </div>
        </section>

        {/* ============ CỘT PHẢI: form đăng nhập ============ */}
        <section className="flex flex-col justify-between p-6 sm:p-10 lg:col-span-7 lg:p-14">
          <div>
            <div className="mb-8 flex items-center justify-between gap-2">
              <Logo compact />
              <div className="flex items-center gap-1 sm:gap-2">
                <LanguageSwitch />
                <Link
                  to="/"
                  className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                >
                  <Icon name="arrow_back" className="text-base" />
                  {t('common.home')}
                </Link>
              </div>
            </div>

            <div className="mb-8">
              <h1 className="mb-2 text-headline-lg text-on-surface">{t('login.title')}</h1>
              <p className="text-body-md text-on-surface-variant">{t('login.intro')}</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <TextField
                id="email"
                label={t('login.email')}
                icon="mail"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder={t('login.emailPlaceholder')}
                autoComplete="email"
                error={errors.email}
              />
              <TextField
                id="password"
                label={t('login.password')}
                icon="lock"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder={t('login.passwordPlaceholder')}
                autoComplete="current-password"
                error={errors.password}
              />

              {(registeredEmail || passwordChanged) && !formError && (
                <p role="status" className="flex items-start gap-2 rounded-2xl bg-secondary-container/40 px-4 py-3 text-body-sm text-on-secondary-fixed">
                  <Icon name="check_circle" className="text-lg text-secondary" />
                  {passwordChanged ? (
                    <span>{t('login.passwordChanged')}</span>
                  ) : (
                    <span>
                      {t('login.registered')} {t('login.registeredNext')}
                    </span>
                  )}
                </p>
              )}

              {formError && (
                <p role="alert" className="flex items-start gap-2 rounded-2xl bg-error-container px-4 py-3 text-body-sm text-on-error-container">
                  <Icon name="error" className="text-lg" />
                  {formError}
                </p>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-3 rounded-full bg-primary-container px-8 py-4 text-label-lg text-on-primary shadow-xl shadow-primary-container/35 transition-all hover:-translate-y-0.5 hover:bg-primary active:translate-y-0 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {submitting ? t('login.submitting') : t('login.submit')}
                  <Icon name={submitting ? 'progress_activity' : 'arrow_forward'} className={`text-xl ${submitting ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </form>
          </div>

          <div className="mt-8 space-y-2 border-t border-surface-variant pt-6 text-center sm:text-left">
            <p className="text-body-sm text-on-surface-variant">
              {t('login.noAccount')}
              <Link
                to="/register"
                className="ml-1.5 text-label-md font-bold text-primary underline underline-offset-4 hover:text-primary-container"
              >
                {t('login.registerNow')}
              </Link>
            </p>
            <p className="text-body-sm text-outline">{t('login.lecturerNote')}</p>
          </div>
        </section>
      </div>
    </main>
  )
}

export default LoginPage
