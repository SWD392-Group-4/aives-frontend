import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import Navbar from '../components/Navbar.jsx'
import TextField from '../components/TextField.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useLanguage } from '../hooks/useLanguage.js'
import { getErrorMessage } from '../i18n/errorMessage.js'
import { changePassword, updateProfile } from '../services/authService.js'

// Khớp với ChangePasswordRequest của backend: mật khẩu mới từ 6 đến 72 ký tự.
const MIN_PASSWORD_LENGTH = 6

const EMPTY_PASSWORD_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' }

function formatDate(isoString, locale) {
  if (!isoString) return '-'
  const date = new Date(isoString)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString(locale)
}

/** Dòng thông báo kết quả ở cuối mỗi form. */
function FormMessage({ type, children }) {
  const isError = type === 'error'
  return (
    <p
      role={isError ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-body-sm ${
        isError ? 'bg-error-container text-on-error-container' : 'bg-secondary-container/40 text-on-secondary-fixed'
      }`}
    >
      <Icon name={isError ? 'error' : 'check_circle'} className={`text-lg ${isError ? '' : 'text-secondary'}`} />
      {children}
    </p>
  )
}

/* ============ Form cập nhật thông tin ============ */
function ProfileForm() {
  const { user, updateUser } = useAuth()
  const { t, language } = useLanguage()
  const [fullName, setFullName] = useState(user.fullName)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(null) // { type: 'success' | 'error', text }
  const [submitting, setSubmitting] = useState(false)

  const unchanged = fullName.trim() === user.fullName

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!fullName.trim()) {
      setError(t('validation.fullNameRequired'))
      return
    }

    setSubmitting(true)
    setMessage(null)
    try {
      const updated = await updateProfile({ fullName: fullName.trim() })
      updateUser(updated)
      setFullName(updated.fullName)
      setMessage({ type: 'success', text: t('profile.saved') })
    } catch (apiError) {
      if (apiError.fieldErrors?.fullName) {
        setError(apiError.fieldErrors.fullName)
      } else {
        setMessage({ type: 'error', text: getErrorMessage(apiError, language) })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <TextField
        id="fullName"
        label={t('profile.fullName')}
        icon="person"
        value={fullName}
        onChange={(event) => {
          setFullName(event.target.value)
          setError('')
          setMessage(null)
        }}
        autoComplete="name"
        error={error}
        required
      />

      {message && <FormMessage type={message.type}>{message.text}</FormMessage>}

      <button
        type="submit"
        disabled={submitting || unchanged}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-container px-6 py-3 text-label-md text-on-primary shadow-lg shadow-primary-container/25 transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:bg-surface-container-high disabled:text-outline disabled:shadow-none"
      >
        <Icon name={submitting ? 'progress_activity' : 'save'} className={`text-lg ${submitting ? 'animate-spin' : ''}`} />
        {submitting ? t('profile.saving') : t('profile.save')}
      </button>
    </form>
  )
}

/* ============ Form đổi mật khẩu ============ */
function PasswordForm() {
  const { logout } = useAuth()
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_PASSWORD_FORM)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setFormError('')
  }

  const validate = () => {
    const nextErrors = {}
    if (!form.currentPassword) {
      nextErrors.currentPassword = t('validation.currentPasswordRequired')
    }
    if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
      nextErrors.newPassword = t('validation.newPasswordMin', { min: MIN_PASSWORD_LENGTH })
    } else if (form.newPassword === form.currentPassword) {
      nextErrors.newPassword = t('validation.newPasswordSame')
    }
    if (!form.confirmPassword) {
      nextErrors.confirmPassword = t('validation.confirmNewRequired')
    } else if (form.confirmPassword !== form.newPassword) {
      nextErrors.confirmPassword = t('validation.confirmMismatch')
    }
    return nextErrors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setFormError('')
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
    } catch (apiError) {
      if (apiError.code === 'WRONG_CURRENT_PASSWORD') {
        setErrors({ currentPassword: getErrorMessage(apiError, language) })
      } else if (apiError.code === 'NEW_PASSWORD_SAME_AS_CURRENT') {
        setErrors({ newPassword: getErrorMessage(apiError, language) })
      } else if (Object.keys(apiError.fieldErrors ?? {}).length > 0) {
        setErrors(apiError.fieldErrors)
      } else {
        setFormError(getErrorMessage(apiError, language))
      }
      setSubmitting(false)
      return
    }

    // Đổi mật khẩu xong thì bắt buộc đăng xuất. Chuyển sang trang đăng nhập trước (kèm lời nhắc
    // đăng nhập lại bằng mật khẩu mới), rồi mới huỷ token cũ, để trang hồ sơ không bị ghi nhớ
    // làm trang quay lại.
    navigate('/login', { replace: true, state: { passwordChanged: true } })
    logout()
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <TextField
        id="currentPassword"
        label={t('profile.currentPassword')}
        icon="lock"
        type="password"
        value={form.currentPassword}
        onChange={handleChange}
        autoComplete="current-password"
        error={errors.currentPassword}
        required
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
        <TextField
          id="newPassword"
          label={t('profile.newPassword')}
          icon="lock_reset"
          type="password"
          value={form.newPassword}
          onChange={handleChange}
          placeholder={t('profile.newPasswordPlaceholder', { min: MIN_PASSWORD_LENGTH })}
          autoComplete="new-password"
          error={errors.newPassword}
          required
        />
        <TextField
          id="confirmPassword"
          label={t('profile.confirmPassword')}
          icon="lock_reset"
          type="password"
          value={form.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          error={errors.confirmPassword}
          required
        />
      </div>

      {formError && <FormMessage type="error">{formError}</FormMessage>}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-label-md text-on-primary shadow-lg shadow-primary/20 transition-colors hover:bg-surface-tint disabled:cursor-wait disabled:opacity-70"
      >
        <Icon name={submitting ? 'progress_activity' : 'key'} className={`text-lg ${submitting ? 'animate-spin' : ''}`} />
        {submitting ? t('profile.changing') : t('profile.changePassword')}
      </button>
    </form>
  )
}

/* ============ Trang hồ sơ cá nhân ============ */
function ProfilePage() {
  const { user } = useAuth()
  const { t, locale } = useLanguage()

  // Thông tin chỉ xem, không sửa được ở đây.
  const details = [
    { label: t('profile.email'), value: user.email, icon: 'mail' },
    { label: t('profile.accountId'), value: user.id, icon: 'fingerprint' },
    { label: t('profile.createdAt'), value: formatDate(user.createdAt, locale), icon: 'calendar_today' },
  ]

  return (
    <>
      <Navbar />

      <main className="min-h-screen w-full bg-surface-container-low pt-20">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-12 lg:py-10">
          <h1 className="text-headline-xl-mobile text-on-surface md:text-headline-xl">{t('profile.title')}</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">{t('profile.intro')}</p>

          {/* Tài khoản admin vừa tạo: bắt buộc đổi mật khẩu tạm trước khi dùng các trang khác. */}
          {user.mustChangePassword && (
            <p
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-2xl bg-tertiary-fixed px-4 py-3 text-body-md text-on-tertiary-fixed-variant"
            >
              <Icon name="lock_reset" className="text-xl" />
              {t('profile.mustChangeNotice')}
            </p>
          )}

          <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* ---------- Thẻ thông tin ---------- */}
            <aside className="overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-sm lg:col-span-4">
              <div className="flex flex-col items-center bg-linear-to-br from-primary via-primary-container to-surface-tint px-6 py-8 text-center text-on-primary">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-on-primary/20 ring-4 ring-on-primary/30">
                  <Icon name="person" filled className="text-[40px]" />
                </div>
                <p className="mt-4 text-headline-md break-words">{user.fullName}</p>
                <span className="mt-2 rounded-full bg-on-primary/20 px-3 py-1 text-label-sm">
                  {t(`roles.${user.role}`)}
                </span>
              </div>
              <dl className="divide-y divide-surface-container px-6">
                {details.map((item) => (
                  <div key={item.icon} className="flex items-center gap-3 py-4">
                    <Icon name={item.icon} className="text-xl text-outline" />
                    <div className="min-w-0">
                      <dt className="text-body-sm text-on-surface-variant">{item.label}</dt>
                      <dd className="text-label-md break-all text-on-surface">{item.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </aside>

            {/* ---------- Các form ---------- */}
            <div className="space-y-6 lg:col-span-8">
              <section className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-sm sm:p-8">
                <h2 className="text-headline-md text-on-surface">{t('profile.infoTitle')}</h2>
                <p className="mt-1 mb-6 text-body-sm text-on-surface-variant">{t('profile.infoIntro')}</p>
                <ProfileForm />
              </section>

              <section className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-sm sm:p-8">
                <h2 className="text-headline-md text-on-surface">{t('profile.passwordTitle')}</h2>
                <p className="mt-1 mb-6 text-body-sm text-on-surface-variant">{t('profile.passwordIntro')}</p>
                <PasswordForm />
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default ProfilePage
