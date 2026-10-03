import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ErrorBanner from '../components/ErrorBanner.jsx'
import Icon from '../components/Icon.jsx'
import Navbar from '../components/Navbar.jsx'
import TextField from '../components/TextField.jsx'
import { useLanguage } from '../hooks/useLanguage.js'
import { getErrorMessage } from '../i18n/errorMessage.js'
import { joinExamSession } from '../services/examSessionService.js'

// Khớp với ExamCodeGenerator của backend.
const EXAM_CODE_PATTERN = /^AIVES_EXAM_\d{4}_\d{6}$/
const PASSCODE_PATTERN = /^\d{6}$/
const EXAM_CODE_LENGTH = 22
const PASSCODE_LENGTH = 6

// Lỗi của backend thuộc về ô nào trong form. Các lỗi khác hiện ở cuối form.
const ERROR_CODE_FIELDS = {
  EXAM_CODE_INVALID_FORMAT: 'examId',
  EXAM_PASSCODE_INVALID_FORMAT: 'passcode',
}

function validate(form, t) {
  const errors = {}
  if (!form.examId) {
    errors.examId = t('join.validation.examCodeRequired')
  } else if (!EXAM_CODE_PATTERN.test(form.examId)) {
    errors.examId = t('join.validation.examCodeFormat')
  }
  if (!form.passcode) {
    errors.passcode = t('join.validation.passcodeRequired')
  } else if (!PASSCODE_PATTERN.test(form.passcode)) {
    errors.passcode = t('join.validation.passcodeFormat')
  }
  return errors
}

/** Trang sinh viên nhập mã phiên + mã truy cập để vào thi. */
function JoinExamPage() {
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const [form, setForm] = useState({ examId: '', passcode: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name } = event.target
    let { value } = event.target
    // Mã phiên luôn viết hoa, không có khoảng trắng; mã truy cập chỉ gồm chữ số.
    // Cắt độ dài ở đây chứ không dùng maxLength của input: maxLength cắt trước khi bỏ khoảng trắng,
    // nên dán mã có dấu cách ở đầu sẽ bị mất ký tự cuối.
    if (name === 'examId') value = value.replace(/\s/g, '').toUpperCase().slice(0, EXAM_CODE_LENGTH)
    if (name === 'passcode') value = value.replace(/\D/g, '').slice(0, PASSCODE_LENGTH)
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
      const attempt = await joinExamSession(form)
      navigate(`/exam/attempts/${encodeURIComponent(attempt.attemptId)}`)
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
    <>
      <Navbar />

      <main className="flex min-h-screen w-full items-start justify-center bg-surface-container-low px-4 pt-28 pb-12 lg:pt-32">
        <section className="w-full max-w-md rounded-[2rem] bg-surface-container-lowest p-6 shadow-xl shadow-primary-container/10 sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
            <Icon name="meeting_room" filled className="text-3xl" />
          </div>
          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-surface-container-highest px-3 py-1 text-label-sm text-primary">
            <Icon name="school" filled className="text-base" />
            {t('join.badge')}
          </span>
          <h1 className="mt-3 text-headline-lg text-on-surface">{t('join.title')}</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">{t('join.intro')}</p>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
            <TextField
              id="examId"
              label={t('join.examCode')}
              icon="tag"
              value={form.examId}
              onChange={handleChange}
              placeholder={t('join.examCodePlaceholder')}
              autoComplete="off"
              error={errors.examId}
              required
              inputProps={{ autoCapitalize: 'characters', spellCheck: false }}
              inputClassName="tabular-nums"
            />
            <TextField
              id="passcode"
              label={t('join.passcode')}
              icon="key"
              value={form.passcode}
              onChange={handleChange}
              placeholder={t('join.passcodePlaceholder')}
              autoComplete="off"
              error={errors.passcode}
              required
              inputProps={{ inputMode: 'numeric' }}
              inputClassName="tabular-nums tracking-[0.3em] placeholder:tracking-normal"
            />

            {formError && <ErrorBanner>{formError}</ErrorBanner>}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary-container px-6 py-3.5 text-label-lg text-on-primary shadow-lg shadow-primary-container/25 transition-colors hover:bg-primary disabled:cursor-wait disabled:opacity-70"
            >
              <Icon name={submitting ? 'progress_activity' : 'login'} className={`text-xl ${submitting ? 'animate-spin' : ''}`} />
              {submitting ? t('join.submitting') : t('join.submit')}
            </button>
          </form>

          <p className="mt-5 flex items-start gap-2 rounded-2xl bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">
            <Icon name="info" className="text-lg text-primary" />
            {t('join.note')}
          </p>
        </section>
      </main>
    </>
  )
}

export default JoinExamPage
