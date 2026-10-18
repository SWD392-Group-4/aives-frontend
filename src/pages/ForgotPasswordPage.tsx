import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import LanguageSwitch from '../components/LanguageSwitch.jsx'
import Logo from '../components/Logo.jsx'
import Mascot from '../components/Mascot.jsx'
import TextField from '../components/TextField'
import { useLanguage } from '../hooks/useLanguage.js'
import { getErrorMessage } from '../i18n/errorMessage.js'
import { forgotPassword } from '../services/authService.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function ForgotPasswordPage() {
  const { t, language } = useLanguage()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // Đếm ngược cooldown 60 giây giữa các lần yêu cầu theo BR-AUTH-005
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value)
    setErrors({})
    setFormError('')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const cleanEmail = email.trim()

    if (!cleanEmail) {
      setErrors({ email: t('validation.emailRequired') })
      return
    }
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setErrors({ email: t('validation.emailInvalid') })
      return
    }

    if (cooldown > 0) return

    setSubmitting(true)
    setFormError('')
    try {
      await forgotPassword({ email: cleanEmail })
      // Bắt đầu cooldown 60 giây và chuyển hướng sang trang đặt lại mật khẩu kèm email
      setCooldown(60)
      navigate('/reset-password', {
        state: {
          email: cleanEmail,
          sentAt: Date.now(),
        },
      })
    } catch (error: any) {
      if (error?.code === 'USER_NOT_FOUND') {
        setErrors({ email: getErrorMessage(error, language) })
      } else if (error?.code === 'OTP_RATE_LIMITED') {
        setCooldown(60)
        setFormError(getErrorMessage(error, language))
      } else {
        setFormError(getErrorMessage(error, language))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-surface p-4 lg:p-10">
      {/* Các đốm sáng trang trí phía sau chuẩn Material 3 */}
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
              <span className="text-label-sm tracking-wide uppercase">{t('forgotPassword.panelBadge')}</span>
            </div>
            <h2 className="text-headline-xl">
              {t('forgotPassword.panelTitle')}
              <br />
              <span className="text-secondary-fixed">AIVES Account</span>
            </h2>
            <p className="max-w-xs text-body-md text-on-primary/80">{t('forgotPassword.panelIntro')}</p>
          </div>

          <div className="relative z-10 my-8 flex items-center justify-center">
            <div className="relative">
              <div aria-hidden="true" className="absolute inset-4 rounded-full bg-on-primary/20 blur-xl" />
              <Mascot className="relative z-10 h-56 w-56 shadow-2xl" />

              <div className="absolute -bottom-2 -left-8 z-20 flex -rotate-2 items-center gap-2 rounded-2xl bg-surface-container-lowest/95 px-3.5 py-2 shadow-lg">
                <Icon name="lock_clock" filled className="text-xl text-secondary" />
                <div>
                  <p className="text-label-sm font-bold text-on-surface">OTP hiệu lực 5 phút</p>
                  <p className="text-[11px] leading-4 text-outline">Quy chuẩn BR-AUTH-005</p>
                </div>
              </div>

              <div className="absolute top-2 -right-8 z-20 flex rotate-3 items-center gap-2 rounded-2xl bg-surface-container-lowest/95 px-3.5 py-2 shadow-lg">
                <Icon name="verified_user" filled className="text-xl text-primary" />
                <div>
                  <p className="text-label-sm font-bold text-on-surface">Bảo mật đa lớp</p>
                  <p className="text-[11px] leading-4 text-outline">Chống dò mã Brute-force</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 border-t border-on-primary/10 pt-5">
            <p className="text-body-xs text-on-primary/70">
              Hệ thống bảo vệ tài khoản cho cả Sinh viên, Giảng viên và Quản trị viên AIVES.
            </p>
          </div>
        </section>

        {/* ============ CỘT PHẢI: Form yêu cầu cấp lại mật khẩu ============ */}
        <section className="flex flex-col justify-between p-6 sm:p-10 lg:col-span-7 lg:p-14">
          <div>
            <div className="mb-8 flex items-center justify-between gap-2">
              <Logo compact />
              <div className="flex items-center gap-1 sm:gap-2">
                <LanguageSwitch />
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                >
                  <Icon name="arrow_back" className="text-base" />
                  {t('common.login')}
                </Link>
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-label-sm font-semibold text-primary">
                <Icon name="lock_reset" className="text-base" />
                <span>{t('forgotPassword.badge')}</span>
              </div>
              <h1 className="mb-2 text-headline-lg text-on-surface">{t('forgotPassword.title')}</h1>
              <p className="text-body-md text-on-surface-variant">{t('forgotPassword.intro')}</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
              <TextField
                id="email"
                label={t('forgotPassword.email')}
                icon="mail"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder={t('forgotPassword.emailPlaceholder')}
                autoComplete="email"
                hint={t('forgotPassword.emailHint')}
                error={errors.email}
                required
              />

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
                  disabled={submitting || cooldown > 0}
                  className="flex w-full items-center justify-center gap-3 rounded-full bg-primary px-8 py-4 text-label-lg text-on-primary shadow-xl shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-tint active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {cooldown > 0
                    ? t('forgotPassword.resendIn', { seconds: cooldown })
                    : submitting
                      ? t('forgotPassword.submitting')
                      : t('forgotPassword.submit')}
                  <Icon
                    name={submitting ? 'progress_activity' : cooldown > 0 ? 'schedule' : 'arrow_forward'}
                    className={`text-xl ${submitting ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>
            </form>
          </div>

          <div className="mt-8 space-y-3 border-t border-surface-variant pt-6 text-center sm:text-left">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-label-md font-bold text-primary transition-colors hover:text-primary-container hover:underline"
              >
                <Icon name="arrow_back" className="text-lg" />
                {t('forgotPassword.backToLogin')}
              </Link>
              <Link
                to="/register"
                className="text-body-sm text-on-surface-variant hover:text-primary hover:underline"
              >
                {t('login.noAccount')} <span className="font-semibold text-primary">{t('login.registerNow')}</span>
              </Link>
            </div>
            <p className="text-body-xs text-outline">
              Lưu ý: Mã xác thực OTP có hiệu lực trong 5 phút. Vui lòng kiểm tra kỹ hòm thư đến và thư rác (Spam).
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

export default ForgotPasswordPage
