import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal.jsx'
import CopyButton from '../components/CopyButton.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import Icon from '../components/Icon.jsx'
import Modal from '../components/Modal.jsx'
import Navbar from '../components/Navbar.jsx'
import TextField from '../components/TextField.jsx'
import { ROLES } from '../constants/roles.js'
import { useAuth } from '../hooks/useAuth.js'
import { useLanguage } from '../hooks/useLanguage.js'
import { getErrorMessage } from '../i18n/errorMessage.js'
import {
  createExamSession,
  deleteExamSession,
  getExamSessions,
  regeneratePasscode,
  updateExamSession,
} from '../services/examSessionService.js'
import {
  dateToInputValue,
  formatDateTime,
  getDeviceTimeZone,
  inputValueToDate,
  isoToInputValue,
} from '../utils/dateTime.js'

// Các giới hạn dưới đây khớp với ExamSessionRequest và ExamSessionServiceImpl của backend.
const TITLE_MAX = 200
const DESCRIPTION_MAX = 2000
const MIN_DURATION = 5
const MAX_DURATION = 300
const MAX_WINDOW_DAYS = 30
const PAGE_SIZE = 10
const SEARCH_DELAY_MS = 350
const MINUTE_MS = 60_000

const STATUS = { UPCOMING: 'UPCOMING', ONGOING: 'ONGOING', ENDED: 'ENDED', CANCELLED: 'CANCELLED' }
// Các tab lọc theo trạng thái. null nghĩa là tất cả.
const STATUS_TABS = [null, STATUS.ONGOING, STATUS.UPCOMING, STATUS.ENDED, STATUS.CANCELLED]

/** Màu nhãn của từng trạng thái (class lấy từ src/styles/colors.css). */
const STATUS_BADGE_CLASSES = {
  UPCOMING: 'bg-primary-fixed text-on-primary-fixed-variant',
  ONGOING: 'bg-secondary-container/50 text-on-secondary-fixed-variant',
  ENDED: 'bg-surface-container-high text-on-surface-variant',
  CANCELLED: 'bg-error-container text-on-error-container',
}

// Lỗi nghiệp vụ của backend thuộc về ô nào trong form.
const ERROR_CODE_FIELDS = {
  EXAM_TIME_RANGE_INVALID: 'endAt',
  EXAM_WINDOW_TOO_LONG: 'endAt',
  EXAM_END_CANNOT_SHORTEN: 'endAt',
  EXAM_START_IN_PAST: 'startAt',
  EXAM_START_TOO_FAR: 'startAt',
  EXAM_DURATION_EXCEEDS_WINDOW: 'durationMinutes',
}

/** Form trống khi tạo mới: mở sau 10 phút nữa (làm tròn lên 5 phút), mở trong 2 giờ, làm bài 60 phút. */
function createEmptyForm() {
  const fiveMinutes = 5 * MINUTE_MS
  const start = new Date(Math.ceil((Date.now() + 10 * MINUTE_MS) / fiveMinutes) * fiveMinutes)
  const end = new Date(start.getTime() + 120 * MINUTE_MS)
  return {
    title: '',
    description: '',
    startAt: dateToInputValue(start),
    endAt: dateToInputValue(end),
    durationMinutes: '60',
  }
}

function sessionToForm(session) {
  return {
    title: session.title,
    description: session.description ?? '',
    startAt: isoToInputValue(session.startAt),
    endAt: isoToInputValue(session.endAt),
    durationMinutes: String(session.durationMinutes),
  }
}

/**
 * Lấy thời điểm (Date) từ ô datetime-local. Ô chỉ chính xác tới phút, nên nếu người dùng
 * không đổi giá trị thì giữ nguyên thời điểm gốc của phiên (có thể có giây lẻ khi tạo qua Swagger).
 */
function resolveDate(inputValue, originalIso) {
  if (originalIso && inputValue === isoToInputValue(originalIso)) return new Date(originalIso)
  return inputValueToDate(inputValue)
}

/**
 * Kiểm tra form trước khi gửi. Backend vẫn kiểm tra lại toàn bộ.
 * session = null khi tạo mới. session.scheduleLocked = true khi phiên đã mở
 * (giờ mở và thời lượng bị khoá, giờ đóng chỉ được kéo dài).
 */
function validate(form, session, t) {
  const errors = {}
  const locked = session?.scheduleLocked === true

  const title = form.title.trim()
  if (!title) {
    errors.title = t('sessions.validation.titleRequired')
  } else if (title.length > TITLE_MAX) {
    errors.title = t('sessions.validation.titleMax', { max: TITLE_MAX })
  }
  if (form.description.trim().length > DESCRIPTION_MAX) {
    errors.description = t('sessions.validation.descriptionMax', { max: DESCRIPTION_MAX })
  }

  const start = resolveDate(form.startAt, session?.startAt)
  const end = resolveDate(form.endAt, session?.endAt)
  if (!start) {
    errors.startAt = t('sessions.validation.startRequired')
  } else if (!locked && start.getTime() < Date.now() - MINUTE_MS) {
    errors.startAt = t('sessions.validation.startInPast')
  }
  if (!end) {
    errors.endAt = t('sessions.validation.endRequired')
  } else if (start && end.getTime() <= start.getTime()) {
    errors.endAt = t('sessions.validation.endAfterStart')
  } else if (start && end.getTime() - start.getTime() > MAX_WINDOW_DAYS * 24 * 60 * MINUTE_MS) {
    errors.endAt = t('sessions.validation.windowMax', { days: MAX_WINDOW_DAYS })
  } else if (locked && end.getTime() < new Date(session.endAt).getTime()) {
    errors.endAt = t('sessions.validation.endCannotShorten')
  }

  if (!locked) {
    const durationText = form.durationMinutes.trim()
    const duration = Number(durationText)
    if (!durationText) {
      errors.durationMinutes = t('sessions.validation.durationRequired')
    } else if (!/^\d+$/.test(durationText) || duration < MIN_DURATION || duration > MAX_DURATION) {
      errors.durationMinutes = t('sessions.validation.durationRange', { min: MIN_DURATION, max: MAX_DURATION })
    } else if (start && end && !errors.endAt && duration * MINUTE_MS > end.getTime() - start.getTime()) {
      errors.durationMinutes = t('sessions.validation.durationWindow')
    }
  }
  return errors
}

/* ============ Form tạo / sửa phiên thi ============ */
function SessionFormModal({ session, onClose, onSaved }) {
  const { t, language } = useLanguage()
  const isEdit = session !== null
  const locked = session?.scheduleLocked === true
  const [form, setForm] = useState(() => (isEdit ? sessionToForm(session) : createEmptyForm()))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setFormError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(form, session, t)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      // Phiên đã mở: gửi lại đúng giờ mở và thời lượng cũ, backend không cho đổi 2 giá trị này.
      startAt: locked ? session.startAt : resolveDate(form.startAt, session?.startAt).toISOString(),
      endAt: resolveDate(form.endAt, session?.endAt).toISOString(),
      durationMinutes: locked ? session.durationMinutes : Number(form.durationMinutes),
    }

    setSubmitting(true)
    setFormError('')
    try {
      const saved = isEdit ? await updateExamSession(session.id, payload) : await createExamSession(payload)
      onSaved(saved)
    } catch (error) {
      const field = ERROR_CODE_FIELDS[error.code]
      if (field) {
        setErrors({ [field]: getErrorMessage(error, language) })
      } else if (Object.keys(error.fieldErrors ?? {}).length > 0) {
        setErrors(error.fieldErrors)
      } else {
        setFormError(getErrorMessage(error, language))
      }
      setSubmitting(false)
    }
  }

  return (
    <Modal title={isEdit ? t('sessions.editTitle') : t('sessions.createTitle')} onClose={onClose}>
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {locked && (
          <p className="flex items-start gap-2 rounded-2xl bg-tertiary-fixed px-4 py-3 text-body-sm text-on-tertiary-fixed-variant">
            <Icon name="lock_clock" className="text-lg" />
            {t('sessions.lockedHint')}
          </p>
        )}

        <TextField
          id="title"
          label={t('sessions.fieldTitle')}
          icon="edit_note"
          value={form.title}
          onChange={handleChange}
          placeholder={t('sessions.titlePlaceholder')}
          autoComplete="off"
          error={errors.title}
          required
          inputProps={{ maxLength: TITLE_MAX }}
        />

        <div className="space-y-1.5">
          <label htmlFor="description" className="block text-label-md text-on-surface">
            {t('sessions.fieldDescription')}
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            value={form.description}
            onChange={handleChange}
            placeholder={t('sessions.descriptionPlaceholder')}
            maxLength={DESCRIPTION_MAX}
            aria-invalid={errors.description ? 'true' : undefined}
            className={`w-full resize-y rounded-2xl bg-surface-container-low px-4 py-3.5 text-body-md text-on-surface shadow-sm outline-none transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 ${
              errors.description ? 'ring-2 ring-error focus:ring-error' : 'focus:ring-primary-container'
            }`}
          />
          {errors.description && (
            <p className="flex items-center gap-1 text-body-sm text-error">
              <Icon name="error" className="text-base" />
              {errors.description}
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="startAt"
            label={t('sessions.fieldStartAt')}
            type="datetime-local"
            value={form.startAt}
            onChange={handleChange}
            error={errors.startAt}
            required
            inputProps={{ disabled: locked }}
          />
          <TextField
            id="endAt"
            label={t('sessions.fieldEndAt')}
            type="datetime-local"
            value={form.endAt}
            onChange={handleChange}
            error={errors.endAt}
            required
            inputProps={{ min: form.startAt || undefined }}
          />
        </div>
        <p className="-mt-2 text-body-sm text-on-surface-variant">
          {t('sessions.timezoneHint', { zone: getDeviceTimeZone() })}
        </p>

        <TextField
          id="durationMinutes"
          label={t('sessions.fieldDuration')}
          icon="timer"
          type="number"
          value={form.durationMinutes}
          onChange={handleChange}
          hint={t('sessions.durationHint', { min: MIN_DURATION, max: MAX_DURATION })}
          error={errors.durationMinutes}
          required
          inputProps={{ min: MIN_DURATION, max: MAX_DURATION, step: 1, inputMode: 'numeric', disabled: locked }}
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
            <Icon
              name={submitting ? 'progress_activity' : isEdit ? 'save' : 'add_circle'}
              className={`text-lg ${submitting ? 'animate-spin' : ''}`}
            />
            {isEdit
              ? submitting ? t('sessions.saving') : t('sessions.saveSubmit')
              : submitting ? t('sessions.creating') : t('sessions.createSubmit')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ============ Hộp thoại hiện mã phiên + mã truy cập (sau khi tạo phiên hoặc tạo lại mã) ============ */
function CredentialsModal({ title, intro, session, onClose }) {
  const { t } = useLanguage()
  const rows = [
    { label: t('sessions.examCodeLabel'), value: session.id, copyLabel: t('sessions.copyCode'), valueClass: 'text-headline-sm' },
    { label: t('sessions.passcodeLabel'), value: session.passcode, copyLabel: t('sessions.copyPasscode'), valueClass: 'text-headline-lg tracking-[0.3em]' },
  ]

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-body-md text-on-surface-variant">{intro}</p>

      <dl className="mt-5 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-container-low px-5 py-4">
            <div className="min-w-0">
              <dt className="text-label-sm tracking-wider text-on-surface-variant uppercase">{row.label}</dt>
              <dd className={`mt-1 break-all text-primary tabular-nums ${row.valueClass}`}>{row.value}</dd>
            </div>
            <CopyButton value={row.value} label={row.copyLabel} copiedLabel={t('sessions.copied')} className="h-10 w-10" />
          </div>
        ))}
      </dl>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-primary-container px-8 py-3 text-label-md text-on-primary shadow-lg shadow-primary-container/25 transition-colors hover:bg-primary"
        >
          {t('sessions.done')}
        </button>
      </div>
    </Modal>
  )
}

const iconButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:text-outline-variant disabled:hover:bg-transparent'

/* ============ Trang quản lý phiên thi ============ */
function ExamSessionsPage() {
  const { user } = useAuth()
  const { t, language, locale } = useLanguage()
  const isAdmin = user.role === ROLES.ADMIN

  // Bộ lọc + trang đang xem. Mỗi lần đổi `query` thì danh sách được tải lại.
  const [query, setQuery] = useState({ status: null, keyword: '', page: 0, reloadKey: 0 })
  const [list, setList] = useState({ loading: true, error: null, data: null })
  const [keywordInput, setKeywordInput] = useState('')
  const searchTimerRef = useRef(null)

  const [formTarget, setFormTarget] = useState(undefined) // undefined: đóng, null: tạo mới, object: sửa
  const [credentials, setCredentials] = useState(null) // { session, kind: 'created' | 'regenerated' }
  const [sessionToRegenerate, setSessionToRegenerate] = useState(null)
  const [sessionToDelete, setSessionToDelete] = useState(null)
  const [revealedIds, setRevealedIds] = useState(() => new Set())
  const [notice, setNotice] = useState(null) // { type: 'success' | 'error', text }

  const updateQuery = (patch) => {
    setList((current) => ({ ...current, loading: true, error: null }))
    setQuery((current) => ({ ...current, ...patch }))
  }
  const reload = () => updateQuery({ reloadKey: query.reloadKey + 1 })

  useEffect(() => {
    let cancelled = false
    getExamSessions({ status: query.status, keyword: query.keyword, page: query.page, size: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return
        // Trang đang xem không còn tồn tại (ví dụ vừa xoá phiên cuối của trang): lùi về trang cuối.
        if (data.totalPages > 0 && data.page >= data.totalPages) {
          setQuery((current) => ({ ...current, page: data.totalPages - 1 }))
          return
        }
        setList({ loading: false, error: null, data })
      })
      .catch((error) => {
        if (!cancelled) setList((current) => ({ ...current, loading: false, error }))
      })

    return () => {
      cancelled = true
    }
  }, [query])

  useEffect(() => () => clearTimeout(searchTimerRef.current), [])

  // Gõ xong một lúc mới gọi API tìm kiếm.
  const handleKeywordChange = (event) => {
    const value = event.target.value
    setKeywordInput(value)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => updateQuery({ keyword: value.trim(), page: 0 }), SEARCH_DELAY_MS)
  }

  const toggleReveal = (id) => {
    setRevealedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSaved = (saved) => {
    const wasCreate = formTarget === null
    setFormTarget(undefined)
    if (wasCreate) {
      setNotice(null)
      setCredentials({ session: saved, kind: 'created' })
    } else {
      setNotice({ type: 'success', text: t('sessions.noticeUpdated', { title: saved.title }) })
    }
    reload()
  }

  // Gọi từ hộp thoại xác nhận, lỗi sẽ hiện ngay trong hộp thoại.
  const handleRegenerate = async () => {
    const updated = await regeneratePasscode(sessionToRegenerate.id)
    setSessionToRegenerate(null)
    setCredentials({ session: updated, kind: 'regenerated' })
    reload()
  }

  const handleDelete = async () => {
    const result = await deleteExamSession(sessionToDelete.id)
    const key = result.action === 'DELETED' ? 'sessions.noticeDeleted' : 'sessions.noticeCancelled'
    setNotice({ type: 'success', text: t(key, { title: sessionToDelete.title }) })
    setSessionToDelete(null)
    reload()
  }

  const sessions = list.data?.items ?? []
  const totalPages = list.data?.totalPages ?? 0
  const totalItems = list.data?.totalItems ?? 0
  const hasFilter = query.status !== null || query.keyword !== ''
  const isErrorNotice = notice?.type === 'error'
  const willCancel = (sessionToDelete?.attemptCount ?? 0) > 0

  return (
    <>
      <Navbar />

      <main className="min-h-screen w-full bg-surface-container-low pt-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-12 lg:py-10">
          {/* ---------- Tiêu đề ---------- */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-highest px-3 py-1 text-label-sm text-primary">
                <Icon name="event_note" filled className="text-base" />
                {t('sessions.badge')}
              </span>
              <h1 className="mt-3 text-headline-xl-mobile text-on-surface md:text-headline-xl">{t('sessions.title')}</h1>
              <p className="mt-1 text-body-md text-on-surface-variant">
                {isAdmin ? t('sessions.introAdmin') : t('sessions.intro')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormTarget(null)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary-container px-6 py-3.5 text-label-lg text-on-primary shadow-lg shadow-primary-container/30 transition-colors hover:bg-primary"
            >
              <Icon name="add_circle" className="text-xl" />
              {t('sessions.createButton')}
            </button>
          </div>

          {/* ---------- Thông báo sau khi sửa / xoá / huỷ ---------- */}
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
                aria-label={t('sessions.closeNotice')}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-on-surface/10"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>
          )}

          {/* ---------- Bộ lọc ---------- */}
          <div className="mt-6 flex flex-col gap-3 rounded-3xl bg-surface-container-lowest p-3 shadow-sm lg:flex-row lg:items-center">
            <div className="no-scrollbar flex gap-2 overflow-x-auto" role="group" aria-label={t('sessions.filterLabel')}>
              {STATUS_TABS.map((status) => {
                const active = query.status === status
                return (
                  <button
                    key={status ?? 'ALL'}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateQuery({ status, page: 0 })}
                    className={`shrink-0 rounded-full px-4 py-2.5 text-label-md transition-colors ${
                      active
                        ? 'bg-primary-container text-on-primary'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    {status ? t(`sessions.status.${status}`) : t('sessions.tabAll')}
                  </button>
                )
              })}
            </div>
            <label className="relative flex flex-1 items-center">
              <span className="sr-only">{t('sessions.searchLabel')}</span>
              <Icon name="search" className="pointer-events-none absolute left-4 text-xl text-outline" />
              <input
                type="search"
                value={keywordInput}
                onChange={handleKeywordChange}
                placeholder={t('sessions.searchPlaceholder')}
                className="w-full rounded-full bg-surface-container-low py-2.5 pr-4 pl-12 text-body-md text-on-surface outline-none transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container"
              />
            </label>
            <button
              type="button"
              onClick={reload}
              aria-label={t('sessions.refresh')}
              title={t('sessions.refresh')}
              className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-surface-container lg:flex"
            >
              <Icon name="refresh" className={`text-xl ${list.loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* ---------- Danh sách ---------- */}
          <div className="mt-4 overflow-hidden rounded-3xl bg-surface-container-lowest shadow-sm">
            {list.loading && !list.data ? (
              <p className="flex items-center justify-center gap-2 px-6 py-16 text-body-md text-on-surface-variant">
                <Icon name="progress_activity" className="animate-spin text-xl" />
                {t('sessions.loading')}
              </p>
            ) : list.error ? (
              <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
                <p role="alert" className="flex items-center gap-2 text-body-md text-error">
                  <Icon name="error" className="text-xl" />
                  {getErrorMessage(list.error, language)}
                </p>
                <button
                  type="button"
                  onClick={reload}
                  className="inline-flex items-center gap-2 rounded-full bg-surface-container px-5 py-2.5 text-label-md text-primary transition-colors hover:bg-surface-container-high"
                >
                  <Icon name="refresh" className="text-lg" />
                  {t('common.retry')}
                </button>
              </div>
            ) : sessions.length === 0 ? (
              <p className="px-6 py-16 text-center text-body-md text-on-surface-variant">
                {hasFilter ? t('sessions.empty') : t('sessions.emptyFirst')}
              </p>
            ) : (
              <div className={`overflow-x-auto transition-opacity ${list.loading ? 'opacity-60' : ''}`}>
                <table className="w-full min-w-[980px] text-left">
                  <thead className="bg-surface-container text-label-sm tracking-wider text-on-surface-variant uppercase">
                    <tr>
                      <th scope="col" className="px-6 py-4">{t('sessions.colSession')}</th>
                      <th scope="col" className="px-4 py-4 whitespace-nowrap">{t('sessions.colCode')}</th>
                      <th scope="col" className="px-4 py-4 whitespace-nowrap">{t('sessions.colWindow')}</th>
                      <th scope="col" className="px-4 py-4 whitespace-nowrap">{t('sessions.colDuration')}</th>
                      <th scope="col" className="px-4 py-4 whitespace-nowrap">{t('sessions.colStatus')}</th>
                      <th scope="col" className="px-4 py-4 text-right whitespace-nowrap">{t('sessions.colStudents')}</th>
                      <th scope="col" className="px-6 py-4 text-right whitespace-nowrap">{t('sessions.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((item) => {
                      const closed = item.status === STATUS.ENDED || item.status === STATUS.CANCELLED
                      const hasStudents = item.attemptCount > 0
                      // Đã huỷ thì không còn gì để xoá; đã kết thúc và có sinh viên thì backend không cho xoá.
                      const deleteDisabled = item.status === STATUS.CANCELLED || (item.status === STATUS.ENDED && hasStudents)
                      const revealed = revealedIds.has(item.id)
                      return (
                        <tr key={item.id} className="border-t border-surface-container text-body-md text-on-surface">
                          <td className="min-w-56 px-6 py-4">
                            <p className={`text-label-md break-words ${item.status === STATUS.CANCELLED ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>
                              {item.title}
                            </p>
                            {item.description && (
                              <p className="mt-0.5 line-clamp-2 text-body-sm break-words text-on-surface-variant">{item.description}</p>
                            )}
                            {isAdmin && (
                              <p className="mt-0.5 text-body-sm text-on-surface-variant">
                                {t('sessions.owner', { name: item.ownerName ?? item.ownerId })}
                              </p>
                            )}
                          </td>
                          {/* Mã phiên ở dòng trên, mã truy cập (mặc định ẩn) ở dòng dưới */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1 whitespace-nowrap tabular-nums">
                              {item.id}
                              <CopyButton value={item.id} label={t('sessions.copyCode')} copiedLabel={t('sessions.copied')} />
                            </div>
                            <div className="flex items-center gap-1 whitespace-nowrap">
                              <span className="text-body-sm text-on-surface-variant">{t('sessions.passcodeLabel')}:</span>
                              <span className="w-[4.5rem] text-label-lg tracking-widest tabular-nums">
                                {revealed ? item.passcode : '••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleReveal(item.id)}
                                aria-label={revealed ? t('sessions.hidePasscode') : t('sessions.showPasscode')}
                                title={revealed ? t('sessions.hidePasscode') : t('sessions.showPasscode')}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container hover:text-primary"
                              >
                                <Icon name={revealed ? 'visibility_off' : 'visibility'} className="text-lg" />
                              </button>
                              <CopyButton value={item.passcode} label={t('sessions.copyPasscode')} copiedLabel={t('sessions.copied')} />
                            </div>
                          </td>
                          <td className="px-4 py-4 text-body-sm whitespace-nowrap tabular-nums">
                            <p>{formatDateTime(item.startAt, locale)}</p>
                            <p className="text-on-surface-variant">
                              {t('sessions.windowTo')} {formatDateTime(item.endAt, locale)}
                            </p>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap tabular-nums">
                            {t('sessions.minutes', { count: item.durationMinutes })}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-block rounded-full px-3 py-1 text-label-sm whitespace-nowrap ${STATUS_BADGE_CLASSES[item.status] ?? ''}`}>
                              {t(`sessions.status.${item.status}`)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums">{item.attemptCount}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                to={`/lecturer/reviews?examId=${encodeURIComponent(item.id)}`}
                                aria-label={`Thẩm định bài thi ca ${item.title}`}
                                title="Thẩm định điểm (HITL Board)"
                                className={`${iconButtonClass} text-secondary hover:bg-secondary-container`}
                              >
                                <Icon name="fact_check" className="text-xl" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => setFormTarget(item)}
                                disabled={closed}
                                aria-label={t('sessions.editAction', { title: item.title })}
                                title={closed ? t('sessions.closedTooltip') : t('sessions.editTooltip')}
                                className={`${iconButtonClass} text-primary hover:bg-primary-fixed`}
                              >
                                <Icon name="edit" className="text-xl" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSessionToRegenerate(item)}
                                disabled={closed}
                                aria-label={t('sessions.regenerateAction', { title: item.title })}
                                title={closed ? t('sessions.closedTooltip') : t('sessions.regenerateTooltip')}
                                className={`${iconButtonClass} text-tertiary hover:bg-tertiary-fixed`}
                              >
                                <Icon name="lock_reset" className="text-xl" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSessionToDelete(item)}
                                disabled={deleteDisabled}
                                aria-label={t('sessions.deleteAction', { title: item.title })}
                                title={
                                  item.status === STATUS.CANCELLED
                                    ? t('sessions.closedTooltip')
                                    : deleteDisabled
                                      ? t('sessions.endedHasStudentsTooltip')
                                      : hasStudents
                                        ? t('sessions.cancelTooltip')
                                        : t('sessions.deleteTooltip')
                                }
                                className={`${iconButtonClass} text-error hover:bg-error-container`}
                              >
                                <Icon name={hasStudents ? 'event_busy' : 'delete'} className="text-xl" />
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

          {/* ---------- Phân trang ---------- */}
          {list.data && !list.error && totalItems > 0 && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-body-sm text-on-surface-variant">
                {t('sessions.showing', { page: query.page + 1, totalPages, total: totalItems })}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateQuery({ page: query.page - 1 })}
                    disabled={query.page === 0 || list.loading}
                    aria-label={t('sessions.prevPage')}
                    title={t('sessions.prevPage')}
                    className={`${iconButtonClass} text-primary hover:bg-surface-container`}
                  >
                    <Icon name="chevron_left" className="text-xl" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateQuery({ page: query.page + 1 })}
                    disabled={query.page >= totalPages - 1 || list.loading}
                    aria-label={t('sessions.nextPage')}
                    title={t('sessions.nextPage')}
                    className={`${iconButtonClass} text-primary hover:bg-surface-container`}
                  >
                    <Icon name="chevron_right" className="text-xl" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {formTarget !== undefined && (
        <SessionFormModal session={formTarget} onClose={() => setFormTarget(undefined)} onSaved={handleSaved} />
      )}

      {credentials && (
        <CredentialsModal
          title={credentials.kind === 'created' ? t('sessions.createdTitle') : t('sessions.regeneratedTitle')}
          intro={credentials.kind === 'created' ? t('sessions.createdIntro') : t('sessions.regeneratedIntro')}
          session={credentials.session}
          onClose={() => setCredentials(null)}
        />
      )}

      {sessionToRegenerate && (
        <ConfirmModal
          title={t('sessions.regenerateTitle')}
          message={t('sessions.regenerateMessage', { title: sessionToRegenerate.title })}
          cancelLabel={t('common.cancel')}
          confirmLabel={t('sessions.regenerateConfirm')}
          pendingLabel={t('sessions.regenerating')}
          icon="lock_reset"
          danger={false}
          onClose={() => setSessionToRegenerate(null)}
          onConfirm={handleRegenerate}
        />
      )}

      {sessionToDelete && (
        <ConfirmModal
          title={willCancel ? t('sessions.cancelTitle') : t('sessions.deleteTitle')}
          message={t(willCancel ? 'sessions.cancelMessage' : 'sessions.deleteMessage', {
            title: sessionToDelete.title,
            code: sessionToDelete.id,
            count: sessionToDelete.attemptCount,
          })}
          cancelLabel={t('sessions.deleteKeep')}
          confirmLabel={willCancel ? t('sessions.cancelConfirm') : t('sessions.deleteConfirm')}
          pendingLabel={willCancel ? t('sessions.cancelling') : t('sessions.deleting')}
          icon={willCancel ? 'event_busy' : 'delete'}
          onClose={() => setSessionToDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  )
}

export default ExamSessionsPage
