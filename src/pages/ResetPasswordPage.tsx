import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import LanguageSwitch from '../components/LanguageSwitch.jsx'
import Logo from '../components/Logo.jsx'
import Mascot from '../components/Mascot.jsx'
import TextField from '../components/TextField'
import { useLanguage } from '../hooks/useLanguage.js'
import { getErrorMessage } from '../i18n/errorMessage.js'
import { forgotPassword, resetPassword } from '../services/authService.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 6
const OTP_VALIDITY_SECONDS = 300 // 5 phút hiệu lực theo BR-AUTH-005

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function ResetPasswordPage() {
  const { t, language } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()

  // Email được truyền sang từ trang /forgot-password
  const initialEmail = (location.state?.email ?? '').trim()

  const [email, setEmail] = useState(initialEmail)
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail)
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Đếm ngược 5 phút cho hiệu lực của mã OTP
  const [otpCountdown, setOtpCountdown] = useState(OTP_VALIDITY_SECONDS)
  // Đếm ngược 60s cho cooldown nút gửi lại
  const [resendCooldown, setResendCooldown] = useState(60)
  const [resending, setResending] = useState(false)
  const [resendSuccessMsg, setResendSuccessMsg] = useState('')

  // Timer đếm ngược hiệu lực OTP (5 phút)
  useEffect(() => {
    if (otpCountdown <= 0) return
    const timer = setInterval(() => {
      setOtpCountdown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [otpCountdown])

  // Timer đếm ngược cooldown gửi lại OTP (60 giây)
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  // Gửi lại mã OTP mới
  const handleResendOtp = async () => {
    const cleanEmail = email.trim()
    if (!cleanEmail || !EMAIL_PATTERN.test(cleanEmail)) {
      setErrors((prev) => ({ ...prev, email: t('validation.emailInvalid') }))
      return
    }

    if (resendCooldown > 0 || resending) return

    setResending(true)
    setFormError('')
    setResendSuccessMsg('')
    try {
      await forgotPassword({ email: cleanEmail })
      setResendCooldown(60)
      setOtpCountdown(OTP_VALIDITY_SECONDS) // Reset lại đồng hồ 5 phút
      setOtp('')
      setResendSuccessMsg(t('resetPassword.otpSentSuccess'))
    } catch (error: any) {
      setFormError(getErrorMessage(error, language))
    } finally {
      setResending(false)
    }
  }

  // Xác nhận đặt lại mật khẩu
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const cleanEmail = email.trim()
    const cleanOtp = otp.trim()
    const nextErrors: Record<string, string> = {}

    if (!cleanEmail) {
      nextErrors.email = t('validation.emailRequired')
    } else if (!EMAIL_PATTERN.test(cleanEmail)) {
      nextErrors.email = t('validation.emailInvalid')
    }

    if (!cleanOtp) {
      nextErrors.otp = t('resetPassword.otpRequired')
    } else if (!/^\d{6}$/.test(cleanOtp)) {
      nextErrors.otp = t('resetPassword.otpInvalidFormat')
    } else if (otpCountdown <= 0) {
      nextErrors.otp = t('resetPassword.otpExpiredNotice')
    }

    if (!password) {
      nextErrors.password = t('validation.passwordRequired')
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = t('validation.passwordMin', { min: MIN_PASSWORD_LENGTH })
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = t('validation.confirmRequired')
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = t('validation.confirmMismatch')
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setFormError('')
    try {
      await resetPassword({
        email: cleanEmail,
        otp: cleanOtp,
        newPassword: password,
      })

      // Điều hướng về /login với state passwordChanged = true để hiển thị thông báo thành công
      navigate('/login', {
        replace: true,
        state: {
          passwordChanged: true,
          registeredEmail: cleanEmail,
        },
      })
    } catch (error: any) {
      if (error?.code === 'OTP_INVALID' || error?.code === 'OTP_EXPIRED' || error?.code === 'OTP_MAX_ATTEMPTS_EXCEEDED') {
        setErrors({ otp: getErrorMessage(error, language) })
      } else {
        setFormError(getErrorMessage(error, language))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-surface p-4 lg:p-10">
      {/* Các đốm sáng trang trí phía sau */}
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

      <div className="relative z-10 grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-2xl lg:grid-cols-12 lg:rounded-[3rem]">
        {/* ============ CỘT TRÁI: Banner giới thiệu & Mascot ============ */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-primary via-primary-container to-surface-tint p-12 text-on-primary lg:col-span-5 lg:flex">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-64 w-64 animate-ping rounded-full border border-on-primary/10 opacity-20" />
            <div className="absolute h-[420px] w-[420px] rounded-full border border-on-primary/10 opacity-30" />
            <div className="absolute h-[600px] w-[600px] rounded-full border border-on-primary/5 opacity-20" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-on-primary/15 px-3.5 py-1.5 backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-secondary-container" />
              <span className="text-label-sm tracking-wide uppercase">{t('resetPassword.panelBadge')}</span>
            </div>
            <h2 className="text-headline-xl">
              {t('resetPassword.panelTitle')}
              <br />
              <span className="text-secondary-fixed">AIVES Security</span>
            </h2>
            <p className="max-w-xs text-body-md text-on-primary/80">{t('resetPassword.panelIntro')}</p>
          </div>

          <div className="relative z-10 my-8 flex items-center justify-center">
            <div className="relative">
              <div aria-hidden="true" className="absolute inset-4 rounded-full bg-on-primary/20 blur-xl" />
              <Mascot className="relative z-10 h-56 w-56 shadow-2xl" />

              <div className="absolute -bottom-2 -left-8 z-20 flex -rotate-2 items-center gap-2 rounded-2xl bg-surface-container-lowest/95 px-3.5 py-2 shadow-lg">
                <Icon name="timer" filled className="text-xl text-secondary" />
                <div>
                  <p className="text-label-sm font-bold text-on-surface">Đếm ngược 5 phút</p>
                  <p className="text-[11px] leading-4 text-outline">Tự động hủy khi hết hạn</p>
                </div>
              </div>

              <div className="absolute top-2 -right-8 z-20 flex rotate-3 items-center gap-2 rounded-2xl bg-surface-container-lowest/95 px-3.5 py-2 shadow-lg">
                <Icon name="password" filled className="text-xl text-primary" />
                <div>
                  <p className="text-label-sm font-bold text-on-surface">Mật khẩu mới</p>
                  <p className="text-[11px] leading-4 text-outline">Tối thiểu 6 ký tự</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 border-t border-on-primary/10 pt-5">
            <p className="text-body-xs text-on-primary/70">
              Sau khi hoàn tất đổi mật khẩu, bạn có thể đăng nhập ngay để vào phiên thi hoặc quản lý ngân hàng câu hỏi.
            </p>
          </div>
        </section>

        {/* ============ CỘT PHẢI: Form đặt lại mật khẩu ============ */}
        <section className="flex flex-col justify-between p-6 sm:p-10 lg:col-span-7 lg:p-14">
          <div>
            <div className="mb-8 flex items-center justify-between gap-2">
              <Logo compact />
              <div className="flex items-center gap-1 sm:gap-2">
                <LanguageSwitch />
                <Link
                  to="/forgot-password"
                  className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                >
                  <Icon name="arrow_back" className="text-base" />
                  {t('forgotPassword.title')}
                </Link>
              </div>
            </div>

            <div className="mb-6">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-secondary-container/60 px-3.5 py-1 text-label-sm font-semibold text-on-secondary-container">
                <Icon name="key" className="text-base text-primary" />
                <span>{t('resetPassword.badge')}</span>
              </div>
              <h1 className="mb-2 text-headline-lg text-on-surface">{t('resetPassword.title')}</h1>

              {/* Thông tin email nhận mã */}
              {!isEditingEmail && email ? (
                <div className="mt-2 flex items-center gap-2 rounded-2xl bg-surface-container-low px-4 py-2.5 text-body-sm text-on-surface">
                  <Icon name="mail" className="text-lg text-primary" />
                  <span className="text-on-surface-variant">{t('resetPassword.intro')}</span>
                  <span className="font-semibold text-on-surface">{email}</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingEmail(true)}
                    className="ml-auto text-label-sm font-medium text-primary hover:underline"
                  >
                    Thay đổi
                  </button>
                </div>
              ) : (
                <div className="mt-3">
                  <TextField
                    id="email"
                    label={t('resetPassword.email')}
                    icon="mail"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setErrors((prev) => ({ ...prev, email: undefined }))
                    }}
                    placeholder="ten@fpt.edu.vn"
                    error={errors.email}
                    required
                  />
                </div>
              )}
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              {/* Ô nhập mã OTP 6 số */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="otpCode" className="block text-label-md font-medium text-on-surface">
                    {t('resetPassword.otpLabel')} <span className="text-error">*</span>
                  </label>
                  <span
                    className={`inline-flex items-center gap-1 text-label-sm font-semibold ${
                      otpCountdown <= 60 ? 'text-error animate-pulse' : 'text-primary'
                    }`}
                  >
                    <Icon name="timer" className="text-base" />
                    {t('resetPassword.otpExpiresIn', { time: formatTimer(otpCountdown) })}
                  </span>
                </div>

                <div className="relative">
                  <input
                    id="otpCode"
                    name="otpCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      setOtp(val)
                      setErrors((prev) => ({ ...prev, otp: undefined }))
                    }}
                    placeholder="••••••"
                    autoComplete="one-time-code"
                    autoFocus
                    className={`w-full text-center text-3xl font-mono font-bold tracking-[0.4em] py-3.5 px-4 rounded-2xl border-2 transition-all outline-none bg-surface-container-low text-on-surface ${
                      errors.otp
                        ? 'border-error focus:ring-4 focus:ring-error/10'
                        : 'border-outline/25 focus:border-primary focus:ring-4 focus:ring-primary/10'
                    }`}
                  />
                </div>

                {errors.otp && (
                  <p className="flex items-center gap-1 text-body-sm text-error">
                    <Icon name="error" className="text-base shrink-0" />
                    <span>{errors.otp}</span>
                  </p>
                )}

                {/* Hàng thông tin gửi lại mã */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-body-xs text-on-surface-variant">
                    {otpCountdown === 0 ? 'Mã đã hết hạn' : 'Mã gửi qua hòm thư chính thức'}
                  </span>
                  {resendCooldown > 0 ? (
                    <span className="inline-flex items-center gap-1 text-body-xs text-outline">
                      <Icon name="schedule" className="text-sm" />
                      {t('resetPassword.otpResendIn', { seconds: resendCooldown })}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resending}
                      className="inline-flex items-center gap-1 text-label-sm font-semibold text-primary hover:underline disabled:opacity-50"
                    >
                      <Icon
                        name={resending ? 'progress_activity' : 'refresh'}
                        className={`text-sm ${resending ? 'animate-spin' : ''}`}
                      />
                      {t('resetPassword.otpResend')}
                    </button>
                  )}
                </div>
              </div>

              {resendSuccessMsg && (
                <p
                  role="status"
                  className="flex items-center gap-2 rounded-2xl bg-secondary-container/60 px-4 py-2.5 text-body-sm text-on-secondary-container"
                >
                  <Icon name="check_circle" className="text-base text-primary" />
                  <span>{resendSuccessMsg}</span>
                </p>
              )}

              {/* Các ô nhập mật khẩu mới */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  id="newPassword"
                  label={t('resetPassword.newPassword')}
                  icon="lock"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setErrors((prev) => ({ ...prev, password: undefined }))
                  }}
                  placeholder={t('resetPassword.newPasswordPlaceholder', { min: MIN_PASSWORD_LENGTH })}
                  autoComplete="new-password"
                  error={errors.password}
                  required
                />
                <TextField
                  id="confirmPassword"
                  label={t('resetPassword.confirmPassword')}
                  icon="lock_reset"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                  }}
                  placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                  autoComplete="new-password"
                  error={errors.confirmPassword}
                  required
                />
              </div>

              {formError && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-2xl bg-error-container px-4 py-3 text-body-sm text-on-error-container"
                >
                  <Icon name="error" className="mt-0.5 shrink-0 text-lg" />
                  <span>{formError}</span>
                </p>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || otp.length < 6}
                  className="flex w-full items-center justify-center gap-3 rounded-full bg-primary px-8 py-4 text-label-lg text-on-primary shadow-xl shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-tint active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {submitting ? t('resetPassword.submitting') : t('resetPassword.submit')}
                  <Icon
                    name={submitting ? 'progress_activity' : 'verified'}
                    className={`text-xl ${submitting ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>
            </form>
          </div>

          <div className="mt-8 border-t border-surface-variant pt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-label-md font-bold text-primary transition-colors hover:text-primary-container hover:underline"
            >
              <Icon name="arrow_back" className="text-lg" />
              {t('resetPassword.backToLogin')}
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

export default ResetPasswordPage
