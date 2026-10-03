import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Modal from '../components/Modal.jsx'
import Navbar from '../components/Navbar.jsx'
import TextField from '../components/TextField.jsx'
import { ROLE_BADGE_CLASSES, ROLES } from '../constants/roles.js'
import { useAuth } from '../hooks/useAuth.js'
import { useLanguage } from '../hooks/useLanguage.js'
import { getErrorMessage } from '../i18n/errorMessage.js'
import { createUser, deleteUser, getUsers, updateUserStatus } from '../services/userService.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Khớp với CreateUserRequest của backend: mật khẩu từ 6 đến 72 ký tự.
const MIN_PASSWORD_LENGTH = 6

// Các tab lọc theo role. role = null nghĩa là tất cả.
const ROLE_TABS = [null, ROLES.LECTURER, ROLES.STUDENT, ROLES.ADMIN]

// Admin chỉ tạo tài khoản sinh viên hoặc giảng viên ở màn hình này.
const CREATABLE_ROLES = [
  { role: ROLES.STUDENT, icon: 'school', hintKey: 'admin.studentHint', emailPlaceholder: 'ten@fpt.edu.vn' },
  { role: ROLES.LECTURER, icon: 'co_present', hintKey: 'admin.lecturerHint', emailPlaceholder: 'ten@fe.edu.vn' },
]

const EMPTY_FORM = { role: ROLES.STUDENT, fullName: '', email: '', password: '' }

function validate(form, t) {
  const errors = {}
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
  return errors
}

function formatDate(isoString, locale) {
  if (!isoString) return '-'
  const date = new Date(isoString)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString(locale)
}

/** Hai chữ cái đầu của tên, dùng làm ảnh đại diện. */
function getInitials(fullName) {
  const words = fullName.trim().split(/\s+/)
  const first = words[0]?.[0] ?? ''
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + last).toUpperCase()
}

/** Dòng báo lỗi trong hộp thoại. */
function ErrorBanner({ children }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-2xl bg-error-container px-4 py-3 text-body-sm text-on-error-container">
      <Icon name="error" className="text-lg" />
      {children}
    </p>
  )
}

/* ============ Form tạo tài khoản ============ */
function CreateUserModal({ onClose, onCreated }) {
  const { t, language } = useLanguage()
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedRole = CREATABLE_ROLES.find((item) => item.role === form.role)

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
      const created = await createUser({
        role: form.role,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      onCreated(created)
    } catch (error) {
      if (error.code === 'EMAIL_ALREADY_EXISTS') {
        setErrors({ email: getErrorMessage(error, language) })
      } else if (Object.keys(error.fieldErrors ?? {}).length > 0) {
        setErrors(error.fieldErrors)
      } else {
        setFormError(getErrorMessage(error, language))
      }
      setSubmitting(false)
    }
  }

  return (
    <Modal title={t('admin.createTitle')} onClose={onClose}>
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <fieldset>
          <legend className="mb-2 text-label-md text-on-surface">{t('admin.roleLegend')}</legend>
          <div className="grid grid-cols-2 gap-3">
            {CREATABLE_ROLES.map((item) => {
              const checked = form.role === item.role
              return (
                <label
                  key={item.role}
                  className={`flex cursor-pointer items-center gap-2 rounded-2xl px-4 py-3 text-label-md transition-colors has-focus-visible:ring-2 has-focus-visible:ring-primary-container ${
                    checked
                      ? 'bg-primary-container text-on-primary shadow-lg shadow-primary-container/25'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={item.role}
                    checked={checked}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <Icon name={item.icon} className="text-xl" />
                  {t(`roles.${item.role}`)}
                </label>
              )
            })}
          </div>
          <p className="mt-2 text-body-sm text-on-surface-variant">{t(selectedRole.hintKey)}</p>
        </fieldset>

        <TextField
          id="fullName"
          label={t('admin.fullName')}
          icon="person"
          value={form.fullName}
          onChange={handleChange}
          placeholder={t('admin.fullNamePlaceholder')}
          autoComplete="off"
          error={errors.fullName}
          required
        />
        <TextField
          id="email"
          label={t('admin.email')}
          icon="mail"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder={selectedRole.emailPlaceholder}
          autoComplete="off"
          error={errors.email}
          required
        />
        <TextField
          id="password"
          label={t('admin.initialPassword')}
          icon="lock"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder={t('admin.passwordPlaceholder', { min: MIN_PASSWORD_LENGTH })}
          autoComplete="new-password"
          hint={t('admin.passwordHint')}
          error={errors.password}
          required
        />

        {formError && <ErrorBanner>{formError}</ErrorBanner>}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-6 py-3 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-container px-6 py-3 text-label-md text-on-primary shadow-lg shadow-primary-container/25 transition-colors hover:bg-primary disabled:cursor-wait disabled:opacity-70"
          >
            <Icon name={submitting ? 'progress_activity' : 'person_add'} className={`text-lg ${submitting ? 'animate-spin' : ''}`} />
            {submitting ? t('admin.creating') : t('admin.createSubmit')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ============ Hộp thoại xác nhận (dùng cho vô hiệu hoá và xoá) ============ */
function ConfirmModal({ title, message, cancelLabel, confirmLabel, pendingLabel, icon, onClose, onConfirm }) {
  const { language } = useLanguage()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async () => {
    setSubmitting(true)
    setError('')
    try {
      await onConfirm()
    } catch (apiError) {
      setError(getErrorMessage(apiError, language))
      setSubmitting(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-body-md text-on-surface-variant">{message}</p>

      {error && (
        <div className="mt-4">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-6 py-3 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-error px-6 py-3 text-label-md text-on-error transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
        >
          <Icon name={submitting ? 'progress_activity' : icon} className={`text-lg ${submitting ? 'animate-spin' : ''}`} />
          {submitting ? pendingLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

/* ============ Trang quản lý tài khoản ============ */
function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const { t, language, locale } = useLanguage()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  // Tăng reloadKey để tải lại danh sách (nút "Thử lại").
  const [reloadKey, setReloadKey] = useState(0)

  const [roleFilter, setRoleFilter] = useState(null)
  const [keyword, setKeyword] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [userToDisable, setUserToDisable] = useState(null)
  const [userToDelete, setUserToDelete] = useState(null)
  const [enablingId, setEnablingId] = useState(null)
  const [notice, setNotice] = useState(null) // { type: 'success' | 'error', text }

  useEffect(() => {
    let cancelled = false
    getUsers()
      .then((data) => {
        if (!cancelled) setUsers(data)
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const handleRetry = () => {
    setLoading(true)
    setLoadError(null)
    setReloadKey((key) => key + 1)
  }

  const counts = useMemo(() => {
    const result = { [ROLES.ADMIN]: 0, [ROLES.LECTURER]: 0, [ROLES.STUDENT]: 0, disabled: 0 }
    for (const item of users) {
      result[item.role] = (result[item.role] ?? 0) + 1
      if (!item.active) result.disabled += 1
    }
    return result
  }, [users])

  const visibleUsers = useMemo(() => {
    const term = keyword.trim().toLowerCase()
    return users.filter((item) => {
      if (roleFilter && item.role !== roleFilter) return false
      if (!term) return true
      return [item.fullName, item.email, item.id]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    })
  }, [users, roleFilter, keyword])

  const replaceUser = (updated) => {
    setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
  }

  const handleCreated = (created) => {
    setUsers((current) => [...current, created])
    setShowCreate(false)
    setNotice({
      type: 'success',
      text: t(created.role === ROLES.STUDENT ? 'admin.noticeStudentCreated' : 'admin.noticeLecturerCreated', {
        name: created.fullName,
        id: created.id,
      }),
    })
  }

  // Vô hiệu hoá: gọi từ hộp thoại xác nhận, lỗi sẽ hiện ngay trong hộp thoại.
  const handleDisable = async () => {
    const updated = await updateUserStatus(userToDisable.id, false)
    replaceUser(updated)
    setUserToDisable(null)
    setNotice({ type: 'success', text: t('admin.noticeDisabled', { name: updated.fullName }) })
  }

  // Kích hoạt lại: không cần xác nhận.
  const handleEnable = async (target) => {
    setEnablingId(target.id)
    try {
      const updated = await updateUserStatus(target.id, true)
      replaceUser(updated)
      setNotice({ type: 'success', text: t('admin.noticeEnabled', { name: updated.fullName }) })
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error, language) })
    } finally {
      setEnablingId(null)
    }
  }

  const handleDelete = async () => {
    await deleteUser(userToDelete.id)
    setUsers((current) => current.filter((item) => item.id !== userToDelete.id))
    setNotice({ type: 'success', text: t('admin.noticeDeleted', { name: userToDelete.fullName }) })
    setUserToDelete(null)
  }

  const stats = [
    { label: t('admin.statTotal'), value: users.length, icon: 'groups', valueClass: 'text-on-surface', iconClass: 'bg-surface-container-high text-primary' },
    { label: t('admin.statLecturers'), value: counts[ROLES.LECTURER], icon: 'co_present', valueClass: 'text-primary', iconClass: 'bg-primary-fixed text-primary' },
    { label: t('admin.statStudents'), value: counts[ROLES.STUDENT], icon: 'school', valueClass: 'text-secondary', iconClass: 'bg-secondary-container text-secondary' },
    { label: t('admin.statDisabled'), value: counts.disabled, icon: 'block', valueClass: 'text-tertiary', iconClass: 'bg-tertiary-fixed text-tertiary' },
  ]

  const isErrorNotice = notice?.type === 'error'

  return (
    <>
      <Navbar />

      <main className="min-h-screen w-full bg-surface-container-low pt-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-12 lg:py-10">
          {/* ---------- Tiêu đề ---------- */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-highest px-3 py-1 text-label-sm text-primary">
                <Icon name="shield_person" filled className="text-base" />
                {t('admin.badge')}
              </span>
              <h1 className="mt-3 text-headline-xl-mobile text-on-surface md:text-headline-xl">{t('admin.title')}</h1>
              <p className="mt-1 text-body-md text-on-surface-variant">{t('admin.intro')}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary-container px-6 py-3.5 text-label-lg text-on-primary shadow-lg shadow-primary-container/30 transition-colors hover:bg-primary"
            >
              <Icon name="person_add" className="text-xl" />
              {t('admin.createButton')}
            </button>
          </div>

          {/* ---------- Thông báo sau khi tạo / vô hiệu hoá / xoá ---------- */}
          {notice && (
            <div
              role={isErrorNotice ? 'alert' : 'status'}
              className={`mt-6 flex items-start justify-between gap-3 rounded-2xl px-4 py-3 text-body-md ${
                isErrorNotice ? 'bg-error-container text-on-error-container' : 'bg-secondary-container/40 text-on-secondary-fixed'
              }`}
            >
              <p className="flex items-start gap-2">
                <Icon name={isErrorNotice ? 'error' : 'check_circle'} className={`text-xl ${isErrorNotice ? '' : 'text-secondary'}`} />
                {notice.text}
              </p>
              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label={t('admin.closeNotice')}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-on-surface/10"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>
          )}

          {/* ---------- Thẻ thống kê ---------- */}
          <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-start justify-between gap-3 rounded-3xl bg-surface-container-lowest p-5 shadow-sm">
                <div>
                  <dt className="text-label-sm tracking-wider text-on-surface-variant uppercase">{stat.label}</dt>
                  <dd className={`mt-2 text-headline-xl ${stat.valueClass}`}>{loading ? '-' : stat.value}</dd>
                </div>
                <div className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-full sm:flex ${stat.iconClass}`}>
                  <Icon name={stat.icon} filled className="text-xl" />
                </div>
              </div>
            ))}
          </dl>

          {/* ---------- Bộ lọc ---------- */}
          <div className="mt-6 flex flex-col gap-3 rounded-3xl bg-surface-container-lowest p-3 shadow-sm lg:flex-row lg:items-center">
            <div className="no-scrollbar flex gap-2 overflow-x-auto" role="group" aria-label={t('admin.filterLabel')}>
              {ROLE_TABS.map((role) => {
                const active = roleFilter === role
                const count = role ? counts[role] : users.length
                return (
                  <button
                    key={role ?? 'ALL'}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setRoleFilter(role)}
                    className={`shrink-0 rounded-full px-4 py-2.5 text-label-md transition-colors ${
                      active
                        ? 'bg-primary-container text-on-primary'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    {role ? t(`roles.${role}`) : t('admin.tabAll')} ({count})
                  </button>
                )
              })}
            </div>
            <label className="relative flex flex-1 items-center">
              <span className="sr-only">{t('admin.searchLabel')}</span>
              <Icon name="search" className="pointer-events-none absolute left-4 text-xl text-outline" />
              <input
                type="search"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={t('admin.searchPlaceholder')}
                className="w-full rounded-full bg-surface-container-low py-2.5 pr-4 pl-12 text-body-md text-on-surface outline-none transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container"
              />
            </label>
          </div>

          {/* ---------- Danh sách ---------- */}
          <div className="mt-4 overflow-hidden rounded-3xl bg-surface-container-lowest shadow-sm">
            {loading ? (
              <p className="flex items-center justify-center gap-2 px-6 py-16 text-body-md text-on-surface-variant">
                <Icon name="progress_activity" className="animate-spin text-xl" />
                {t('admin.loading')}
              </p>
            ) : loadError ? (
              <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
                <p role="alert" className="flex items-center gap-2 text-body-md text-error">
                  <Icon name="error" className="text-xl" />
                  {getErrorMessage(loadError, language)}
                </p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 rounded-full bg-surface-container px-5 py-2.5 text-label-md text-primary transition-colors hover:bg-surface-container-high"
                >
                  <Icon name="refresh" className="text-lg" />
                  {t('common.retry')}
                </button>
              </div>
            ) : visibleUsers.length === 0 ? (
              <p className="px-6 py-16 text-center text-body-md text-on-surface-variant">{t('admin.empty')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[740px] text-left">
                  <thead className="bg-surface-container text-label-sm tracking-wider text-on-surface-variant uppercase">
                    <tr>
                      <th scope="col" className="px-6 py-4">{t('admin.colUser')}</th>
                      <th scope="col" className="px-4 py-4">{t('admin.colId')}</th>
                      <th scope="col" className="px-4 py-4">{t('admin.colRole')}</th>
                      <th scope="col" className="px-4 py-4">{t('admin.colStatus')}</th>
                      <th scope="col" className="px-4 py-4">{t('admin.colCreatedAt')}</th>
                      <th scope="col" className="px-6 py-4 text-right">{t('admin.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleUsers.map((item) => {
                      const isSelf = item.id === currentUser.id
                      const isEnabling = enablingId === item.id
                      return (
                        <tr key={item.id} className="border-t border-surface-container text-body-md text-on-surface">
                          <td className="px-6 py-4">
                            <div className={`flex items-center gap-3 ${item.active ? '' : 'opacity-60'}`}>
                              <div
                                aria-hidden="true"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-label-md text-primary"
                              >
                                {getInitials(item.fullName)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-label-md text-on-surface">
                                  {item.fullName}
                                  {isSelf && <span className="ml-2 text-body-sm text-on-surface-variant">{t('admin.you')}</span>}
                                </p>
                                <p className="text-body-sm text-on-surface-variant">{item.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 tabular-nums">{item.id}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-block rounded-full px-3 py-1 text-label-sm whitespace-nowrap ${ROLE_BADGE_CLASSES[item.role] ?? ''}`}>
                              {t(`roles.${item.role}`)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1.5 text-body-sm whitespace-nowrap">
                              <span className={`h-2 w-2 rounded-full ${item.active ? 'bg-brand-green' : 'bg-outline'}`} />
                              {item.active ? t('admin.statusActive') : t('admin.statusDisabled')}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap tabular-nums">{formatDate(item.createdAt, locale)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              {item.active ? (
                                <button
                                  type="button"
                                  onClick={() => setUserToDisable(item)}
                                  disabled={isSelf}
                                  aria-label={t('admin.disableAction', { name: item.fullName })}
                                  title={isSelf ? t('admin.selfDisableTooltip') : t('admin.disableTooltip')}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-tertiary transition-colors hover:bg-tertiary-fixed disabled:cursor-not-allowed disabled:text-outline-variant disabled:hover:bg-transparent"
                                >
                                  <Icon name="block" className="text-xl" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleEnable(item)}
                                  disabled={isEnabling}
                                  aria-label={t('admin.enableAction', { name: item.fullName })}
                                  title={t('admin.enableTooltip')}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-secondary transition-colors hover:bg-secondary-container/50 disabled:cursor-wait"
                                >
                                  <Icon name={isEnabling ? 'progress_activity' : 'lock_open'} className={`text-xl ${isEnabling ? 'animate-spin' : ''}`} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setUserToDelete(item)}
                                disabled={isSelf}
                                aria-label={t('admin.deleteAction', { name: item.fullName })}
                                title={isSelf ? t('admin.selfDeleteTooltip') : t('admin.deleteTooltip')}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-error transition-colors hover:bg-error-container disabled:cursor-not-allowed disabled:text-outline-variant disabled:hover:bg-transparent"
                              >
                                <Icon name="delete" className="text-xl" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!loading && !loadError && (
            <p className="mt-3 text-body-sm text-on-surface-variant">
              {t('admin.showing', { shown: visibleUsers.length, total: users.length })}
            </p>
          )}
        </div>
      </main>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}

      {userToDisable && (
        <ConfirmModal
          title={t('admin.disableTitle')}
          message={t('admin.disableMessage', { name: userToDisable.fullName, email: userToDisable.email })}
          cancelLabel={t('common.cancel')}
          confirmLabel={t('admin.disableConfirm')}
          pendingLabel={t('admin.disabling')}
          icon="block"
          onClose={() => setUserToDisable(null)}
          onConfirm={handleDisable}
        />
      )}

      {userToDelete && (
        <ConfirmModal
          title={t('admin.deleteTitle')}
          message={t('admin.deleteMessage', { name: userToDelete.fullName, email: userToDelete.email })}
          cancelLabel={t('admin.deleteKeep')}
          confirmLabel={t('admin.deleteConfirm')}
          pendingLabel={t('admin.deleting')}
          icon="delete"
          onClose={() => setUserToDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  )
}

export default AdminUsersPage
