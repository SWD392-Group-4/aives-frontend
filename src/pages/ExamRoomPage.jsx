import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal.jsx'
import Icon from '../components/Icon.jsx'
import LanguageSwitch from '../components/LanguageSwitch.jsx'
import Logo from '../components/Logo.jsx'
import { useLanguage } from '../hooks/useLanguage.js'
import { getErrorMessage } from '../i18n/errorMessage.js'
import { finishExamAttempt, getExamAttempt } from '../services/examSessionService.js'
import { formatDateTime } from '../utils/dateTime.js'

// Hỏi lại máy chủ mỗi 60 giây để đồng hồ không lệch và biết phiên có bị huỷ không.
const RESYNC_INTERVAL_MS = 60_000
const TICK_INTERVAL_MS = 250
// Đổi màu đồng hồ khi sắp hết giờ.
const WARNING_SECONDS = 5 * 60
const DANGER_SECONDS = 60

const pad = (value) => String(value).padStart(2, '0')

/** Tách số giây còn lại thành giờ / phút / giây. */
function splitTime(totalSeconds) {
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

/**
 * Đồng bộ lượt thi với máy chủ rồi đếm ngược.
 *
 * Không dùng đồng hồ của máy sinh viên (Date.now) để tính giờ còn lại: máy chủ trả về
 * deadlineAt và serverTime, hiệu của chúng là số mili giây còn lại tại lúc nhận phản hồi.
 * Sau đó trừ dần bằng performance.now(), bộ đếm này không đổi khi sinh viên chỉnh giờ máy.
 */
function useExamCountdown(attemptId) {
  const [attempt, setAttempt] = useState(null)
  const [error, setError] = useState(null)
  // { remainingMs: còn lại lúc đồng bộ, at: performance.now() lúc đồng bộ }
  const [sync, setSync] = useState(null)
  const [remainingSeconds, setRemainingSeconds] = useState(null)

  // Nhận lượt thi mới nhất từ máy chủ (lúc tải trang, đồng bộ định kỳ, hoặc sau khi bấm kết thúc).
  const applyAttempt = useCallback((data) => {
    // Đã kết thúc (bấm kết thúc sớm hoặc hết giờ) thì không còn thời gian, dù chưa tới deadlineAt.
    const remainingMs =
      data.status === 'COMPLETED'
        ? 0
        : Math.max(new Date(data.deadlineAt).getTime() - new Date(data.serverTime).getTime(), 0)
    setAttempt(data)
    setSync({ remainingMs, at: performance.now() })
    setRemainingSeconds(Math.ceil(remainingMs / 1000))
  }, [])

  // Tải lượt thi, tải lại định kỳ và khi quay lại tab.
  useEffect(() => {
    let cancelled = false
    let hasLoaded = false

    const load = () => {
      getExamAttempt(attemptId)
        .then((data) => {
          if (cancelled) return
          hasLoaded = true
          setError(null)
          applyAttempt(data)
        })
        .catch((apiError) => {
          if (cancelled) return
          // Mất mạng thoáng qua khi đang thi: giữ đồng hồ chạy tiếp. Phiên bị huỷ thì phải dừng lại.
          if (!hasLoaded || apiError.code === 'EXAM_SESSION_CANCELLED') setError(apiError)
        })
    }

    load()
    const intervalId = setInterval(load, RESYNC_INTERVAL_MS)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [attemptId, applyAttempt])

  // Cập nhật số giây còn lại. Tính lại từ mốc đồng bộ ở mỗi nhịp, nên tab bị trình duyệt làm chậm cũng không lệch.
  useEffect(() => {
    if (!sync) return undefined
    const tick = () => {
      const remainingMs = Math.max(sync.remainingMs - (performance.now() - sync.at), 0)
      setRemainingSeconds(Math.ceil(remainingMs / 1000))
      return remainingMs
    }
    const intervalId = setInterval(() => {
      if (tick() === 0) clearInterval(intervalId)
    }, TICK_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [sync])

  return { attempt, error, remainingSeconds, applyAttempt }
}

/** Khung chung của phòng thi: thanh trên cùng gọn, không có menu để sinh viên tập trung. */
function RoomLayout({ children }) {
  const { t } = useLanguage()
  return (
    <div className="flex min-h-screen w-full flex-col bg-linear-to-b from-hero-from via-primary-container to-hero-to text-on-primary">
      <header className="mx-auto flex h-20 w-full max-w-5xl items-center justify-between gap-2 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {/* Rời phòng thi không dừng đồng hồ: máy chủ vẫn tính giờ, vào lại bằng mã phiên + mã truy cập. */}
          <Link
            to="/exam/join"
            title={t('room.backHint')}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-container-lowest px-4 py-2.5 text-label-md text-primary transition-colors hover:bg-surface-container"
          >
            <Icon name="arrow_back" className="text-lg" />
            {t('room.back')}
          </Link>
          <div className="hidden rounded-full bg-surface-container-lowest px-4 py-2 sm:block">
            <Logo compact />
          </div>
        </div>
        <div className="rounded-full bg-surface-container-lowest px-2 py-1">
          <LanguageSwitch />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pt-4 pb-12">{children}</main>
    </div>
  )
}

function RoomLinks() {
  const { t } = useLanguage()
  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <Link
        to="/"
        className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-container px-6 py-3 text-label-md text-on-primary shadow-lg shadow-primary-container/25 transition-colors hover:bg-primary"
      >
        <Icon name="home" className="text-lg" />
        {t('room.backHome')}
      </Link>
      <Link
        to="/exam/join"
        className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-label-md text-primary transition-colors hover:bg-surface-container"
      >
        <Icon name="tag" className="text-lg" />
        {t('room.joinAnother')}
      </Link>
    </div>
  )
}

/** Phòng thi của sinh viên. Hiện tại chỉ có trạng thái "Đang thi" và đồng hồ đếm ngược. */
function ExamRoomPage() {
  const { attemptId } = useParams()
  const { t, language, locale } = useLanguage()
  const { attempt, error, remainingSeconds, applyAttempt } = useExamCountdown(attemptId)
  const [confirmingFinish, setConfirmingFinish] = useState(false)

  // Gọi từ hộp thoại xác nhận, lỗi sẽ hiện ngay trong hộp thoại.
  const handleFinish = async () => {
    const finished = await finishExamAttempt(attemptId)
    setConfirmingFinish(false)
    applyAttempt(finished)
  }

  if (error) {
    return (
      <RoomLayout>
        <section className="w-full max-w-md rounded-[2rem] bg-surface-container-lowest p-8 text-center text-on-surface shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error-container text-error">
            <Icon name="error" filled className="text-4xl" />
          </div>
          <h1 className="mt-5 text-headline-md">{t('room.errorTitle')}</h1>
          <p role="alert" className="mt-2 text-body-md text-on-surface-variant">
            {getErrorMessage(error, language)}
          </p>
          <RoomLinks />
        </section>
      </RoomLayout>
    )
  }

  if (!attempt || remainingSeconds === null) {
    return (
      <RoomLayout>
        <p className="flex items-center gap-2 text-body-lg">
          <Icon name="progress_activity" className="animate-spin text-2xl" />
          {t('room.loading')}
        </p>
      </RoomLayout>
    )
  }

  // Số lượt thi còn lại của sinh viên trong phiên này (sau lượt đang xem).
  const attemptsLeft = Math.max((attempt.maxAttempts ?? 1) - (attempt.attemptNo ?? 1), 0)

  if (remainingSeconds === 0) {
    // Kết thúc trước hạn nghĩa là sinh viên tự bấm "Kết thúc bài thi"; còn lại là hết giờ.
    const endedEarly =
      Boolean(attempt.completedAt) && new Date(attempt.completedAt).getTime() < new Date(attempt.deadlineAt).getTime()
    return (
      <RoomLayout>
        <section className="w-full max-w-md rounded-[2rem] bg-surface-container-lowest p-8 text-center text-on-surface shadow-2xl">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
              endedEarly ? 'bg-secondary-container text-secondary' : 'bg-tertiary-fixed text-tertiary'
            }`}
          >
            <Icon name={endedEarly ? 'task_alt' : 'timer_off'} filled className="text-4xl" />
          </div>
          <h1 className="mt-5 text-headline-lg">{endedEarly ? t('room.submittedTitle') : t('room.finishedTitle')}</h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            {endedEarly
              ? t('room.submittedMessage', { time: formatDateTime(attempt.completedAt, locale) })
              : t('room.finishedMessage')}
          </p>
          <p className="mt-4 text-label-md text-on-surface">{attempt.title}</p>
          <p className="text-body-sm text-on-surface-variant tabular-nums">{attempt.examId}</p>
          <p className="mt-4 text-body-sm text-on-surface-variant">
            {attemptsLeft > 0
              ? t('room.attemptsLeft', { no: attempt.attemptNo, max: attempt.maxAttempts, left: attemptsLeft })
              : t('room.noAttemptsLeft', { no: attempt.attemptNo, max: attempt.maxAttempts })}
          </p>
          <RoomLinks />
        </section>
      </RoomLayout>
    )
  }

  const time = splitTime(remainingSeconds)
  const totalSeconds = Math.max(
    (new Date(attempt.deadlineAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000,
    1,
  )
  const remainingPercent = Math.min((remainingSeconds / totalSeconds) * 100, 100)
  const isDanger = remainingSeconds <= DANGER_SECONDS
  const isWarning = !isDanger && remainingSeconds <= WARNING_SECONDS
  const timerColor = isDanger ? 'text-error' : isWarning ? 'text-tertiary-container' : 'text-primary'
  const barColor = isDanger ? 'bg-error' : isWarning ? 'bg-brand-orange' : 'bg-primary-container'

  const details = [
    { label: t('room.examCode'), value: attempt.examId },
    { label: t('room.duration'), value: t('room.minutes', { count: attempt.durationMinutes }) },
    { label: t('room.attemptNo'), value: t('room.attemptOf', { no: attempt.attemptNo, max: attempt.maxAttempts }) },
    { label: t('room.startedAt'), value: formatDateTime(attempt.startedAt, locale) },
    { label: t('room.deadlineAt'), value: formatDateTime(attempt.deadlineAt, locale) },
  ]

  return (
    <RoomLayout>
      <section className="w-full max-w-2xl rounded-[2rem] bg-surface-container-lowest p-6 text-center text-on-surface shadow-2xl sm:p-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-secondary-container/50 px-4 py-1.5 text-label-md text-on-secondary-fixed-variant">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-green" />
          </span>
          <span className="break-words">{attempt.title}</span>
        </span>

        <h1 className="mt-5 text-headline-xl-mobile md:text-headline-xl">{t('room.inProgress')}</h1>

        <p className="mt-8 text-label-sm tracking-wider text-on-surface-variant uppercase">
          {isWarning || isDanger ? t('room.lowTime') : t('room.timeLeft')}
        </p>
        {/* role="timer" không tự đọc mỗi giây; aria-label cho biết thời gian khi người dùng chủ động xem */}
        <p
          role="timer"
          aria-label={t('room.timerLabel', time)}
          className={`mt-2 text-[3.25rem] leading-none font-extrabold tracking-tight tabular-nums transition-colors sm:text-[5.5rem] ${timerColor}`}
        >
          {pad(time.hours)}:{pad(time.minutes)}:{pad(time.seconds)}
        </p>

        <div className="mt-8 h-2.5 w-full overflow-hidden rounded-full bg-surface-container-high" aria-hidden="true">
          <div
            className={`h-full rounded-full transition-[width,background-color] duration-300 ease-linear ${barColor}`}
            style={{ width: `${remainingPercent}%` }}
          />
        </div>

        <dl className="mt-8 grid gap-3 text-left sm:grid-cols-2">
          {details.map((item) => (
            <div key={item.label} className="rounded-2xl bg-surface-container-low px-4 py-3">
              <dt className="text-label-sm tracking-wider text-on-surface-variant uppercase">{item.label}</dt>
              <dd className="mt-1 text-label-md break-words text-on-surface tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>

        <button
          type="button"
          onClick={() => setConfirmingFinish(true)}
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-error px-8 py-3.5 text-label-lg text-on-error shadow-lg shadow-error/20 transition-opacity hover:opacity-90"
        >
          <Icon name="flag" className="text-xl" />
          {t('room.finishButton')}
        </button>

        <p className="mt-6 flex items-start justify-center gap-2 text-body-sm text-on-surface-variant">
          <Icon name="info" className="text-base text-primary" />
          {t('room.keepOpenNote')}
        </p>
      </section>

      {confirmingFinish && (
        <ConfirmModal
          title={t('room.finishTitle')}
          message={
            attemptsLeft > 0 ? t('room.finishMessageRetake', { left: attemptsLeft }) : t('room.finishMessage')
          }
          cancelLabel={t('room.finishKeep')}
          confirmLabel={t('room.finishConfirm')}
          pendingLabel={t('room.finishing')}
          icon="flag"
          onClose={() => setConfirmingFinish(false)}
          onConfirm={handleFinish}
        />
      )}
    </RoomLayout>
  )
}

export default ExamRoomPage
