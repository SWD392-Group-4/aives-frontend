import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import LanguageSwitch from '../components/LanguageSwitch.jsx'
import Logo from '../components/Logo.jsx'
import Mascot from '../components/Mascot.jsx'
import TextField from '../components/TextField'
import { useAuth } from '../hooks/useAuth.js'
import { useLanguage } from '../hooks/useLanguage.js'
import { getErrorMessage } from '../i18n/errorMessage.js'
import { register, sendOtp } from '../services/authService.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Khớp với RegisterRequest của backend: mật khẩu từ 6 đến 72 ký tự.
const MIN_PASSWORD_LENGTH = 6

// Icon và màu của 3 thẻ giới thiệu, cùng thứ tự với register.highlights trong bản dịch.
const HIGHLIGHT_STYLES = [
  { icon: 'record_voice_over', iconClass: 'text-primary group-hover:bg-primary group-hover:text-on-primary' },
  { icon: 'menu_book', iconClass: 'text-secondary group-hover:bg-secondary group-hover:text-on-secondary' },
  { icon: 'analytics', iconClass: 'text-tertiary group-hover:bg-tertiary group-hover:text-on-tertiary' },
]

const EMPTY_FORM = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

function validate(form: typeof EMPTY_FORM, t: (key: string, params?: any) => string) {
  const errors: Record<string, string> = {}
  if (!form.fullName.trim()) {
    errors.fullName = t('validation.fullNameRequired')
  }
  if (!form.email.trim()) {
    errors.email = t('validation.emailRequired')
  } else if (!EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = t('validation.emailInvalid')
  }
  if (form.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = t('validation.passwordMin', { min: MIN_PASSWORD_LENGTH })
  }
  if (!form.confirmPassword) {
    errors.confirmPassword = t('validation.confirmRequired')
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = t('validation.confirmMismatch')
  }
  return errors
}

function RegisterPage() {
  const { isAuthenticated } = useAuth()
  const { t, language } = useLanguage()
  const navigate = useNavigate()

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Trạng thái xác thực OTP
  const [step, setStep] = useState<'FORM' | 'OTP'>('FORM')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [resendCountdown, setResendCountdown] = useState(0)
  const [resending, setResending] = useState(false)
  const [resendSuccessMsg, setResendSuccessMsg] = useState('')

  // Đếm ngược 60s cho nút gửi lại OTP
  useEffect(() => {
    if (resendCountdown <= 0) return
    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCountdown])

  // Đã đăng nhập rồi thì không cần đăng ký nữa.
  if (isAuthenticated) return <Navigate to="/" replace />

  const highlights = t('register.highlights')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setFormError('')
  }

  // Bước 1: Kiểm tra form và gửi mã OTP qua email
  const handleRequestOtp = async (event) => {
    event.preventDefault()
    const nextErrors = validate(form, t)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setFormError('')
    try {
      await sendOtp({ email: form.email.trim() })
      setStep('OTP')
      setOtp('')
      setOtpError('')
      setResendCountdown(60)
      setResendSuccessMsg('')
    } catch (error) {
      if (error.code === 'EMAIL_ALREADY_EXISTS') {
        setErrors({ email: getErrorMessage(error, language) })
      } else if (Object.keys(error.fieldErrors ?? {}).length > 0) {
        setErrors(error.fieldErrors)
      } else {
        setFormError(getErrorMessage(error, language))
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Bước 2: Nhập OTP và hoàn tất tạo tài khoản
  const handleVerifyOtp = async (event) => {
    event.preventDefault()
    const cleanOtp = otp.trim()
    if (!cleanOtp) {
      setOtpError(t('register.otpRequired'))
      return
    }
    if (!/^\d{6}$/.test(cleanOtp)) {
      setOtpError(t('register.otpInvalidFormat'))
      return
    }

    setSubmitting(true)
    setOtpError('')
    try {
      const user = await register({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        otp: cleanOtp,
      })
      navigate('/login', { replace: true, state: { registeredEmail: user.email } })
    } catch (error) {
      setOtpError(getErrorMessage(error, language))
    } finally {
      setSubmitting(false)
    }
  }

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (resendCountdown > 0 || resending) return
    setResending(true)
    setOtpError('')
    setResendSuccessMsg('')
    try {
      await sendOtp({ email: form.email.trim() })
      setResendCountdown(60)
      setResendSuccessMsg(t('register.otpSentSuccess'))
    } catch (error) {
      setOtpError(getErrorMessage(error, language))
    } finally {
      setResending(false)
    }
  }

  return (
    <main className="min-h-screen w-full bg-surface">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-6 flex items-center justify-between gap-2">
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

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
          {/* ============ CỘT TRÁI: giới thiệu ============ */}
          <aside className="order-2 flex flex-col space-y-6 lg:order-1 lg:col-span-5">
            <div className="relative overflow-hidden rounded-[2rem] bg-primary-container p-8 text-on-primary shadow-xl">
              <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-on-primary/10 blur-2xl" />
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-secondary-fixed/20 blur-xl" />

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-on-primary/15 px-3.5 py-1.5 backdrop-blur-md">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-secondary-fixed" />
                  <span className="text-label-sm tracking-wider uppercase">{t('register.panelBadge')}</span>
                </div>
                <Mascot className="h-44 w-44 shadow-2xl sm:h-52 sm:w-52" />
                <h2 className="mt-5 text-headline-lg">
                  {t('register.panelTitle')} <span className="text-secondary-fixed">AIVES</span>
                </h2>
                <p className="mt-2 max-w-sm text-body-sm text-on-primary-container/90">{t('register.panelIntro')}</p>
              </div>
            </div>

            <ul className="flex flex-col space-y-3.5">
              {HIGHLIGHT_STYLES.map((style, index) => (
                <li
                  key={style.icon}
                  className="group flex items-start gap-4 rounded-3xl bg-surface-container-lowest p-5 shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container-high transition-colors ${style.iconClass}`}
                  >
                    <Icon name={style.icon} className="text-[26px]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-headline-sm text-on-surface">{highlights[index].title}</h3>
                    <p className="mt-1 text-body-sm text-on-surface-variant">{highlights[index].description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>

          {/* ============ CỘT PHẢI: form đăng ký hoặc xác thực OTP ============ */}
          <section className="order-1 lg:order-2 lg:col-span-7">
            <div className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-lg sm:p-10">
              {step === 'FORM' ? (
                <>
                  <div className="mb-8 flex flex-col space-y-3">
                    <span className="self-start rounded-full bg-surface-container px-3 py-1 text-label-sm font-bold text-primary">
                      {t('register.badge')}
                    </span>
                    <h1 className="text-headline-xl-mobile text-on-surface md:text-headline-xl">{t('register.title')}</h1>
                    <p className="text-body-md text-on-surface-variant">{t('register.intro')}</p>
                  </div>

                  <form className="flex flex-col space-y-5" onSubmit={handleRequestOtp} noValidate>
                    <TextField
                      id="fullName"
                      label={t('register.fullName')}
                      icon="person"
                      value={form.fullName}
                      onChange={handleChange}
                      placeholder={t('register.fullNamePlaceholder')}
                      autoComplete="name"
                      error={errors.fullName}
                      required
                    />

                    <TextField
                      id="email"
                      label={t('register.email')}
                      icon="mail"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder={t('register.emailPlaceholder')}
                      autoComplete="email"
                      hint={t('register.emailHint')}
                      error={errors.email}
                      required
                    />

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
                      <TextField
                        id="password"
                        label={t('register.password')}
                        icon="lock"
                        type="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder={t('register.passwordPlaceholder', { min: MIN_PASSWORD_LENGTH })}
                        autoComplete="new-password"
                        error={errors.password}
                        required
                      />
                      <TextField
                        id="confirmPassword"
                        label={t('register.confirmPassword')}
                        icon="lock_reset"
                        type="password"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        placeholder={t('register.confirmPlaceholder')}
                        autoComplete="new-password"
                        error={errors.confirmPassword}
                        required
                      />
                    </div>

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
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-label-lg text-on-primary shadow-xl shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-tint active:translate-y-0 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
                      >
                        {submitting ? t('register.submitting') : t('register.submit')}
                        <Icon name={submitting ? 'progress_activity' : 'arrow_forward'} className={`text-xl ${submitting ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </form>

                  <p className="mt-4 text-center text-body-sm text-on-surface-variant">
                    {t('register.policyIntro')}{' '}
                    <Link to="/privacy-policy" className="font-semibold text-primary hover:underline">
                      {t('footer.privacyPolicy')}
                    </Link>{' '}
                    {t('register.policyAnd')}{' '}
                    <Link to="/terms-of-service" className="font-semibold text-primary hover:underline">
                      {t('footer.termsOfService')}
                    </Link>
                  </p>

                  <div className="mt-8 border-t border-outline-variant/30 pt-6 text-center">
                    <p className="text-body-md text-on-surface-variant">
                      {t('register.haveAccount')}
                      <Link to="/login" className="ml-1.5 font-bold text-primary hover:underline">
                        {t('register.loginNow')}
                      </Link>
                    </p>
                  </div>
                </>
              ) : (
                /* ============ GIAO DIỆN XÁC THỰC OTP ============ */
                <div className="flex flex-col space-y-6">
                  <div>
                    <button
                      type="button"
                      onClick={() => setStep('FORM')}
                      className="mb-4 inline-flex items-center gap-1.5 text-label-md font-semibold text-primary hover:underline"
                    >
                      <Icon name="arrow_back" className="text-lg" />
                      {t('register.otpBack')}
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon name="mark_email_read" className="text-2xl" />
                      </div>
                      <div>
                        <h1 className="text-headline-lg text-on-surface">{t('register.otpTitle')}</h1>
                        <p className="text-body-sm text-on-surface-variant">
                          {t('register.otpIntro')} <span className="font-semibold text-on-surface">{form.email}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <form className="flex flex-col space-y-6" onSubmit={handleVerifyOtp} noValidate>
                    <div>
                      <label htmlFor="otpCode" className="block text-label-md font-medium text-on-surface mb-2">
                        {t('register.otpLabel')}
                      </label>
                      <input
                        id="otpCode"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '')
                          setOtp(val)
                          setOtpError('')
                        }}
                        placeholder="••••••"
                        autoComplete="one-time-code"
                        autoFocus
                        className="w-full text-center text-3xl font-mono font-bold tracking-[0.4em] py-4 px-4 rounded-2xl border-2 border-outline/30 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none bg-surface-container-low text-on-surface"
                      />
                      <p className="mt-2 text-center text-body-xs text-on-surface-variant">
                        Mã có hiệu lực trong 5 phút. Vui lòng kiểm tra hộp thư đến (hoặc Spam/Junk).
                      </p>
                    </div>

                    {resendSuccessMsg && (
                      <p role="status" className="flex items-center gap-2 rounded-2xl bg-secondary-container/60 px-4 py-3 text-body-sm text-on-secondary-container">
                        <Icon name="check_circle" className="text-lg text-primary" />
                        {resendSuccessMsg}
                      </p>
                    )}

                    {otpError && (
                      <p role="alert" className="flex items-start gap-2 rounded-2xl bg-error-container px-4 py-3 text-body-sm text-on-error-container">
                        <Icon name="error" className="text-lg shrink-0 mt-0.5" />
                        <span>{otpError}</span>
                      </p>
                    )}

                    <div className="flex flex-col space-y-3">
                      <button
                        type="submit"
                        disabled={submitting || otp.length < 6}
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-label-lg text-on-primary shadow-xl shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-tint active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                      >
                        {submitting ? t('register.otpVerifying') : t('register.otpConfirm')}
                        <Icon name={submitting ? 'progress_activity' : 'verified'} className={`text-xl ${submitting ? 'animate-spin' : ''}`} />
                      </button>

                      <div className="text-center pt-2">
                        {resendCountdown > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                            <Icon name="schedule" className="text-base" />
                            {t('register.otpResendIn', { seconds: resendCountdown })}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={resending}
                            className="inline-flex items-center gap-1.5 text-label-md font-semibold text-primary hover:underline disabled:opacity-50"
                          >
                            <Icon name={resending ? 'progress_activity' : 'refresh'} className={`text-base ${resending ? 'animate-spin' : ''}`} />
                            {t('register.otpResend')}
                          </button>
                        )}
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default RegisterPage
