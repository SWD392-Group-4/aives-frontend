import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ErrorBanner from '../components/ErrorBanner'
import Icon from '../components/Icon'
import Navbar from '../components/Navbar'
import TextField from '../components/TextField'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'
import { getErrorMessage } from '../i18n/errorMessage'
import { joinExamSession } from '../services/examSessionService'
import { gradingService } from '../services/gradingService'
import { GradeAppeal, VivaAttempt } from '../types'
import { formatDateTime } from '../utils/dateTime'

// Interface cho ca thi hiển thị trên Dashboard
export interface StudentExamCardData {
  id: string // AIVES_EXAM_yyyy_xxxxxx
  title: string
  courseCode: string
  lecturerName: string
  durationMinutes: number
  questionCount: number
  startAt: string
  endAt: string
  status: 'ONGOING' | 'UPCOMING' | 'ENDED'
  passcode?: string
  description?: string
  topics?: string[]
  maxAttempts?: number
  attemptsUsed?: number
}

// Mock data phong phú cho ca thi đang mở (Ongoing)
const MOCK_ONGOING_EXAMS: StudentExamCardData[] = [
  {
    id: 'AIVES_EXAM_2026_104829',
    title: 'Kiểm tra Vấn đáp Kiến trúc Phần mềm - K18',
    courseCode: 'SWD392',
    lecturerName: 'TS. Trần Anh Tuấn',
    durationMinutes: 20,
    questionCount: 3,
    startAt: '2026-10-18T08:00:00Z',
    endAt: '2026-10-18T23:59:00Z',
    status: 'ONGOING',
    passcode: '384920',
    description: 'Vấn đáp kiến trúc Microservices, Clean Architecture, Design Patterns và xử lý bất đồng bộ trong hệ thống phân tán.',
    topics: ['Microservices', 'Clean Architecture', 'Event-Driven'],
    maxAttempts: 2,
    attemptsUsed: 0,
  },
  {
    id: 'AIVES_EXAM_2026_837192',
    title: 'Vấn đáp Đồ án Phát triển Ứng dụng Di động',
    courseCode: 'PRM392',
    lecturerName: 'ThS. Nguyễn Văn Hải',
    durationMinutes: 15,
    questionCount: 3,
    startAt: '2026-10-18T14:00:00Z',
    endAt: '2026-10-19T12:00:00Z',
    status: 'ONGOING',
    passcode: '719284',
    description: 'Đánh giá kiến trúc MVVM, Jetpack Compose / React Native, State Management và tối ưu hóa tài nguyên mạng.',
    topics: ['MVVM Pattern', 'State Management', 'Local DB & Network'],
    maxAttempts: 1,
    attemptsUsed: 0,
  },
]

// Mock data cho ca thi sắp diễn ra (Upcoming)
const MOCK_UPCOMING_EXAMS: StudentExamCardData[] = [
  {
    id: 'AIVES_EXAM_2026_928371',
    title: 'Thi Vấn đáp Giữa kỳ Trí tuệ Nhân tạo Cơ bản',
    courseCode: 'AIL302m',
    lecturerName: 'PGS.TS. Lê Hoàng Minh',
    durationMinutes: 25,
    questionCount: 4,
    startAt: '2026-10-20T09:00:00Z',
    endAt: '2026-10-20T11:30:00Z',
    status: 'UPCOMING',
    description: 'Chủ đề: Search Algorithms (A*, Heuristic), Minimax với Alpha-Beta Pruning, Machine Learning Foundations.',
    topics: ['Heuristic Search', 'Game Theory', 'Linear Regression'],
    maxAttempts: 1,
  },
  {
    id: 'AIVES_EXAM_2026_574829',
    title: 'Vấn đáp Bảo mật Hệ thống Thông tin & Mật mã',
    courseCode: 'IA1601',
    lecturerName: 'TS. Đặng Quốc Huy',
    durationMinutes: 20,
    questionCount: 3,
    startAt: '2026-10-22T14:00:00Z',
    endAt: '2026-10-22T17:00:00Z',
    status: 'UPCOMING',
    description: 'Chủ đề: Mã hóa đối xứng / bất đối xứng, cơ chế bắt tay TLS 1.3, JSON Web Token (JWT) và xác thực OAuth2.',
    topics: ['Cryptography', 'OAuth2/JWT', 'OWASP Top 10'],
    maxAttempts: 1,
  },
]

// Mock data cho ca thi đã hoàn thành (Completed Attempts)
const MOCK_COMPLETED_ATTEMPTS: (VivaAttempt & { courseCode?: string })[] = [
  {
    attemptId: 'ATT-2026-001',
    examId: 'AIVES_EXAM_2026_019283',
    title: 'Kiểm tra Vấn đáp Cơ sở Dữ liệu Phân tán',
    courseCode: 'DBI202',
    durationMinutes: 20,
    attemptNo: 1,
    maxAttempts: 1,
    status: 'COMPLETED',
    resultStatus: 'PUBLISHED',
    totalFinalScore: 8.8,
    totalAiScore: 8.5,
    completedAt: '2026-10-15T15:30:00Z',
    startedAt: '2026-10-15T15:10:00Z',
    deadlineAt: '2026-10-15T15:30:00Z',
    serverTime: '2026-10-18T17:54:00Z',
    remainingSeconds: 0,
  },
  {
    attemptId: 'ATT-2026-002',
    examId: 'AIVES_EXAM_2026_038174',
    title: 'Vấn đáp Lập trình Web với Framework Hiện đại',
    courseCode: 'SWP391',
    durationMinutes: 25,
    attemptNo: 1,
    maxAttempts: 1,
    status: 'COMPLETED',
    resultStatus: 'PUBLISHED',
    totalFinalScore: 8.0,
    totalAiScore: 7.8,
    completedAt: '2026-10-12T10:20:00Z',
    startedAt: '2026-10-12T09:55:00Z',
    deadlineAt: '2026-10-12T10:20:00Z',
    serverTime: '2026-10-18T17:54:00Z',
    remainingSeconds: 0,
  },
  {
    attemptId: 'ATT-2026-003',
    examId: 'AIVES_EXAM_2026_048123',
    title: 'Kiểm tra Vấn đáp Mạng Máy Tính & An ninh mạng',
    courseCode: 'NW101',
    durationMinutes: 15,
    attemptNo: 1,
    maxAttempts: 1,
    status: 'COMPLETED',
    resultStatus: 'PENDING_REVIEW',
    totalFinalScore: undefined,
    totalAiScore: 8.2,
    completedAt: '2026-10-17T16:45:00Z',
    startedAt: '2026-10-17T16:30:00Z',
    deadlineAt: '2026-10-17T16:45:00Z',
    serverTime: '2026-10-18T17:54:00Z',
    remainingSeconds: 0,
  },
]

// Mock data đơn phúc khảo dự phòng
const MOCK_APPEALS_FALLBACK: GradeAppeal[] = [
  {
    id: 'APP-2026-001',
    questionGradeId: 'qg-101',
    questionText: 'Giải thích nguyên lý Dependency Inversion Principle (DIP)?',
    attemptId: 'ATT-2026-001',
    examTitle: 'Kiểm tra Vấn đáp Cơ sở Dữ liệu Phân tán',
    studentId: 'ST180293',
    reason: 'Em đã nêu chi tiết về Inversion of Control container và Bean lifecycle trong Spring.',
    status: 'ACCEPTED',
    scoreBefore: 6.0,
    scoreAfter: 8.5,
    maxScore: 10,
    createdAt: '2026-10-16T08:30:00Z',
    resolvedAt: '2026-10-16T15:45:00Z',
  },
  {
    id: 'APP-2026-002',
    questionGradeId: 'qg-102',
    questionText: 'Phân biệt Pessimistic Locking và Optimistic Locking?',
    attemptId: 'ATT-2026-002',
    examTitle: 'Vấn đáp Lập trình Web với Framework Hiện đại',
    studentId: 'ST180293',
    reason: 'Em đã nêu rõ cơ chế @Version trong JPA và SELECT FOR UPDATE.',
    status: 'PENDING',
    scoreBefore: 7.0,
    maxScore: 10,
    createdAt: '2026-10-17T11:20:00Z',
  },
]

const EXAM_CODE_PATTERN = /^AIVES_EXAM_\d{4}_\d{6}$/
const PASSCODE_PATTERN = /^\d{6}$/

export default function StudentDashboardPage() {
  const { user } = useAuth()
  const { locale, language } = useLanguage()
  const navigate = useNavigate()

  // Đồng hồ hiển thị ngày giờ hiện tại
  const [currentDate, setCurrentDate] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Tab đang chọn
  const [activeTab, setActiveTab] = useState<'ongoing' | 'upcoming' | 'completed'>('ongoing')

  // Form Vào ca thi nhanh (Quick Join)
  const [examCode, setExamCode] = useState('')
  const [passcode, setPasscode] = useState('')
  const [quickJoinError, setQuickJoinError] = useState('')
  const [quickJoinSubmitting, setQuickJoinSubmitting] = useState(false)

  // Danh sách lượt thi đã hoàn thành và danh sách đơn phúc khảo
  const [completedAttempts, setCompletedAttempts] = useState<VivaAttempt[]>(MOCK_COMPLETED_ATTEMPTS)
  const [myAppeals, setMyAppeals] = useState<GradeAppeal[]>(MOCK_APPEALS_FALLBACK)
  const [ongoingExams] = useState<StudentExamCardData[]>(MOCK_ONGOING_EXAMS)
  const [upcomingExams] = useState<StudentExamCardData[]>(MOCK_UPCOMING_EXAMS)

  // Tải dữ liệu thực tế từ backend
  useEffect(() => {
    // 1. Tải các lượt thi đã thi xong
    gradingService
      .getStudentCompletedAttempts(user?.id)
      .then((data) => {
        if (data && data.length > 0) {
          setCompletedAttempts(data)
        }
      })
      .catch((err) => {
        console.warn('Dùng dữ liệu mẫu cho bài thi đã hoàn thành:', err?.message)
      })

    // 2. Tải các đơn phúc khảo của sinh viên
    gradingService
      .getMyAppeals()
      .then((data) => {
        if (data && data.length > 0) {
          setMyAppeals(data)
        }
      })
      .catch((err) => {
        console.warn('Dùng dữ liệu mẫu cho đơn phúc khảo:', err?.message)
      })
  }, [user?.id])

  // Thống kê (Metrics)
  const stats = useMemo(() => {
    const upcomingCount = upcomingExams.length
    const pendingAppealsCount = myAppeals.filter((a) => a.status === 'PENDING').length

    // Tính điểm trung bình của các bài thi đã công bố (PUBLISHED)
    const publishedAttempts = completedAttempts.filter(
      (a) => a.resultStatus === 'PUBLISHED' && typeof a.totalFinalScore === 'number'
    )
    const averageScore =
      publishedAttempts.length > 0
        ? (
            publishedAttempts.reduce((sum, a) => sum + (a.totalFinalScore ?? 0), 0) /
            publishedAttempts.length
          ).toFixed(1)
        : '8.4'

    return {
      upcomingCount,
      averageScore,
      pendingAppealsCount,
      completedCount: completedAttempts.length,
      publishedCount: publishedAttempts.length,
    }
  }, [upcomingExams, myAppeals, completedAttempts])

  // Format ngày giờ đẹp mắt
  const formattedToday = useMemo(() => {
    return currentDate.toLocaleDateString(locale === 'en' ? 'en-US' : 'vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [currentDate, locale])

  // Xử lý nộp form Vào ca thi nhanh
  const handleQuickJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setQuickJoinError('')

    const cleanExamCode = examCode.trim().toUpperCase()
    const cleanPasscode = passcode.trim()

    if (!cleanExamCode) {
      setQuickJoinError('Vui lòng nhập mã ca thi.')
      return
    }
    if (!EXAM_CODE_PATTERN.test(cleanExamCode)) {
      setQuickJoinError('Mã ca thi không đúng định dạng (AIVES_EXAM_yyyy_xxxxxx).')
      return
    }
    if (!cleanPasscode) {
      setQuickJoinError('Vui lòng nhập mã passcode 6 chữ số.')
      return
    }
    if (!PASSCODE_PATTERN.test(cleanPasscode)) {
      setQuickJoinError('Passcode phải bao gồm đúng 6 chữ số.')
      return
    }

    setQuickJoinSubmitting(true)
    try {
      const attempt = await joinExamSession({
        examId: cleanExamCode,
        passcode: cleanPasscode,
      })
      navigate(`/exam/attempts/${encodeURIComponent(attempt.attemptId)}`)
    } catch (err: any) {
      setQuickJoinError(getErrorMessage(err, language))
      setQuickJoinSubmitting(false)
    }
  }

  // Chọn nhanh ca thi đang mở để điền vào Quick Join
  const handleSelectOngoingExam = (exam: StudentExamCardData) => {
    setExamCode(exam.id)
    if (exam.passcode) {
      setPasscode(exam.passcode)
    }
    setQuickJoinError('')
    window.scrollTo({ top: 220, behavior: 'smooth' })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* Banner Lời Chào & Thông Tin Sinh Viên */}
        <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-primary/10 via-surface-container to-secondary/10 p-6 sm:p-10 border border-outline-variant/30 shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed px-3 py-1 text-label-xs font-bold text-on-primary-fixed-variant">
                  <Icon name="school" filled className="text-sm" />
                  CỔNG THÍ SINH SINH VIÊN
                </span>
                <span className="inline-flex items-center gap-1 text-label-xs font-medium text-on-surface-variant">
                  <Icon name="schedule" className="text-sm text-outline" />
                  {formattedToday}
                </span>
              </div>
              <h1 className="text-headline-sm sm:text-headline-md font-bold tracking-tight text-on-surface">
                👋 Chào mừng trở lại, {user?.fullName || 'Sinh viên'}!
              </h1>
              <p className="max-w-2xl text-body-md text-on-surface-variant">
                Bạn đã sẵn sàng cho buổi thi vấn đáp hôm nay chưa? Hãy kiểm tra kết nối mic, chuẩn bị không gian yên tĩnh và tự tin trả lời các câu hỏi từ Giám khảo AI nhé!
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Link
                to="/student/appeals"
                className="inline-flex items-center gap-2 rounded-full border border-outline-variant/50 bg-surface-container-lowest px-4 py-2.5 text-label-md font-semibold text-on-surface shadow-sm hover:bg-surface-container hover:border-primary/40 transition-colors"
              >
                <Icon name="mark_email_unread" className="text-lg text-tertiary" />
                Đơn phúc khảo ({stats.pendingAppealsCount})
              </Link>
              <Link
                to="/student/results"
                className="inline-flex items-center gap-2 rounded-full bg-primary-container px-5 py-2.5 text-label-md font-semibold text-on-primary shadow-md hover:bg-primary transition-colors"
              >
                <Icon name="assignment" className="text-lg" />
                Xem bảng điểm
              </Link>
            </div>
          </div>
        </section>

        {/* 3 Thẻ Thống Kê Chính (Metric Cards - M3 Style) */}
        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          {/* Card 1: Ca thi sắp tới */}
          <div className="group flex flex-col justify-between rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm hover:border-primary/40 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-label-md font-medium text-on-surface-variant">Ca thi sắp tới</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-headline-lg font-extrabold text-on-surface font-mono">
                    {stats.upcomingCount}
                  </span>
                  <span className="text-label-sm text-outline">ca thi</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-fixed text-primary group-hover:scale-105 transition-transform">
                <Icon name="calendar_month" filled className="text-2xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-outline-variant/20 pt-3">
              <span className="text-body-xs text-outline">Trong 7 ngày tiếp theo</span>
              <button
                type="button"
                onClick={() => setActiveTab('upcoming')}
                className="text-label-xs font-bold text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Xem lịch thi <Icon name="arrow_forward" className="text-xs" />
              </button>
            </div>
          </div>

          {/* Card 2: Điểm trung bình Viva */}
          <div className="group flex flex-col justify-between rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm hover:border-secondary/40 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-label-md font-medium text-on-surface-variant">Điểm trung bình Viva</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-headline-lg font-extrabold text-secondary font-mono">
                    {stats.averageScore}
                  </span>
                  <span className="text-label-sm text-outline">/ 10</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-fixed text-secondary group-hover:scale-105 transition-transform">
                <Icon name="military_tech" filled className="text-2xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-outline-variant/20 pt-3">
              <span className="text-body-xs text-outline">
                {stats.publishedCount > 0 ? `${stats.publishedCount} đợt đã công bố` : 'Dựa trên đợt thi gần nhất'}
              </span>
              <Link
                to="/student/results"
                className="text-label-xs font-bold text-secondary hover:underline inline-flex items-center gap-0.5"
              >
                Chi tiết Rubric <Icon name="arrow_forward" className="text-xs" />
              </Link>
            </div>
          </div>

          {/* Card 3: Đơn phúc khảo đang chờ */}
          <div className="group flex flex-col justify-between rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm hover:border-tertiary/40 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-label-md font-medium text-on-surface-variant">Đơn phúc khảo đang chờ</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-headline-lg font-extrabold text-tertiary font-mono">
                    {stats.pendingAppealsCount}
                  </span>
                  <span className="text-label-sm text-outline">đang xét duyệt</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tertiary-fixed text-tertiary group-hover:scale-105 transition-transform">
                <Icon name="pending_actions" filled className="text-2xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-outline-variant/20 pt-3">
              <span className="text-body-xs text-outline">Tổng số: {myAppeals.length} khiếu nại</span>
              <Link
                to="/student/appeals"
                className="text-label-xs font-bold text-tertiary hover:underline inline-flex items-center gap-0.5"
              >
                Xem phản hồi GV <Icon name="arrow_forward" className="text-xs" />
              </Link>
            </div>
          </div>
        </section>

        {/* Khung "Vào ca thi nhanh" (Quick Join Card) */}
        <section className="mt-8 rounded-3xl border-2 border-primary/20 bg-surface-container-lowest p-6 sm:p-8 shadow-lg shadow-primary/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/20 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary">
                <Icon name="rocket_launch" filled className="text-2xl" />
              </div>
              <div>
                <h2 className="text-title-lg font-bold text-on-surface">Vào Ca Thi Nhanh</h2>
                <p className="text-body-sm text-on-surface-variant">
                  Nhập mã ca thi do Giảng viên cung cấp và mã passcode 6 chữ số để vào phòng thi AI ngay tức thì.
                </p>
              </div>
            </div>
            <Link
              to="/exam/join"
              className="inline-flex shrink-0 items-center gap-1.5 text-label-sm font-semibold text-primary hover:underline"
            >
              <Icon name="settings_voice" className="text-base" />
              Kiểm tra thiết bị & phòng chờ chi tiết &rarr;
            </Link>
          </div>

          <form onSubmit={handleQuickJoinSubmit} className="mt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
              <div className="sm:col-span-6">
                <TextField
                  id="quickExamCode"
                  label="Mã ca thi (Exam Code)"
                  icon="tag"
                  value={examCode}
                  onChange={(e) => {
                    setExamCode(e.target.value.replace(/\s/g, '').toUpperCase())
                    setQuickJoinError('')
                  }}
                  placeholder="AIVES_EXAM_2026_xxxxxx"
                  required
                  inputProps={{ autoCapitalize: 'characters', spellCheck: false }}
                  inputClassName="font-mono text-title-sm tracking-wide"
                  hint="Ví dụ: AIVES_EXAM_2026_104829"
                />
              </div>

              <div className="sm:col-span-3">
                <TextField
                  id="quickPasscode"
                  label="Mã truy cập (Passcode)"
                  icon="key"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    setQuickJoinError('')
                  }}
                  placeholder="6 số"
                  required
                  inputProps={{ inputMode: 'numeric', maxLength: 6 }}
                  inputClassName="font-mono text-title-sm tracking-[0.25em] text-center"
                  hint="6 chữ số bảo mật"
                />
              </div>

              <div className="sm:col-span-3 flex">
                <button
                  type="submit"
                  disabled={quickJoinSubmitting}
                  className="inline-flex w-full h-[52px] items-center justify-center gap-2 rounded-2xl bg-primary-container px-6 text-label-md font-bold text-on-primary shadow-md hover:bg-primary transition-colors disabled:cursor-wait disabled:opacity-60"
                >
                  <Icon
                    name={quickJoinSubmitting ? 'progress_activity' : 'login'}
                    className={`text-xl ${quickJoinSubmitting ? 'animate-spin' : ''}`}
                  />
                  {quickJoinSubmitting ? 'Đang xác thực...' : 'Vào thi ngay'}
                </button>
              </div>
            </div>

            {quickJoinError && (
              <div className="mt-4">
                <ErrorBanner>{quickJoinError}</ErrorBanner>
              </div>
            )}
          </form>
        </section>

        {/* Danh Sách Ca Thi Dạng Tabs (Exam Tabs) */}
        <section className="mt-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/30 pb-4">
            <div>
              <h2 className="text-title-xl font-bold text-on-surface">Danh Sách Ca Thi Của Bạn</h2>
              <p className="text-body-sm text-on-surface-variant">
                Quản lý các ca thi vấn đáp đang mở, lịch thi sắp tới và kết quả các bài đã hoàn thành.
              </p>
            </div>

            {/* Tabs Header */}
            <div className="inline-flex rounded-full bg-surface-container p-1 border border-outline-variant/30">
              <button
                type="button"
                onClick={() => setActiveTab('ongoing')}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-label-sm font-bold transition-all ${
                  activeTab === 'ongoing'
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Icon name="campaign" className="text-base text-secondary" />
                Đang mở
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary-container px-1.5 text-label-xs font-bold text-on-secondary-fixed-variant">
                  {ongoingExams.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('upcoming')}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-label-sm font-bold transition-all ${
                  activeTab === 'upcoming'
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Icon name="event" className="text-base text-primary" />
                Sắp diễn ra
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-fixed px-1.5 text-label-xs font-bold text-on-primary-fixed-variant">
                  {upcomingExams.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('completed')}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-label-sm font-bold transition-all ${
                  activeTab === 'completed'
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Icon name="task_alt" className="text-base text-outline" />
                Đã thi xong
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-container-highest px-1.5 text-label-xs font-bold text-on-surface">
                  {completedAttempts.length}
                </span>
              </button>
            </div>
          </div>

          {/* Tab 1: ĐANG MỞ (ONGOING) */}
          {activeTab === 'ongoing' && (
            <div className="mt-6 space-y-4">
              {ongoingExams.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-outline-variant/60 p-12 text-center">
                  <Icon name="sentiment_satisfied" className="text-5xl text-outline mb-2" />
                  <p className="text-body-lg font-medium text-on-surface">Hiện không có ca thi nào đang mở.</p>
                  <p className="text-body-sm text-on-surface-variant">Hãy theo dõi tab "Sắp diễn ra" để biết lịch thi tiếp theo của bạn.</p>
                </div>
              ) : (
                ongoingExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-3xl border border-secondary-container/60 bg-surface-container-lowest p-6 sm:p-7 shadow-sm hover:border-secondary transition-all"
                  >
                    <div className="space-y-2.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-secondary-container px-3 py-1 text-label-xs font-bold text-on-secondary-fixed-variant flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
                          ĐANG MỞ THI
                        </span>
                        <span className="font-mono text-label-sm font-bold text-primary bg-primary-fixed/50 px-2.5 py-0.5 rounded-full">
                          {exam.courseCode}
                        </span>
                        <span className="text-body-xs font-mono text-outline">
                          Mã phiên: {exam.id}
                        </span>
                      </div>

                      <h3 className="text-title-lg font-bold text-on-surface">
                        {exam.title}
                      </h3>

                      {exam.description && (
                        <p className="text-body-sm text-on-surface-variant line-clamp-2">
                          {exam.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-body-xs text-on-surface-variant pt-1">
                        <span className="flex items-center gap-1">
                          <Icon name="person" className="text-base text-outline" />
                          GV: {exam.lecturerName}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-primary">
                          <Icon name="timer" className="text-base" />
                          Thời lượng: {exam.durationMinutes} phút
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="quiz" className="text-base text-outline" />
                          {exam.questionCount} câu hỏi chuẩn
                        </span>
                        <span className="flex items-center gap-1 text-error font-medium">
                          <Icon name="alarm" className="text-base" />
                          Hạn chót: {formatDateTime(exam.endAt, locale)}
                        </span>
                      </div>

                      {exam.topics && exam.topics.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-label-xs text-outline">Chủ đề:</span>
                          {exam.topics.map((tp, idx) => (
                            <span
                              key={idx}
                              className="rounded-lg bg-surface-container px-2 py-0.5 text-label-xs text-on-surface-variant font-medium"
                            >
                              {tp}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col shrink-0 gap-2.5 items-stretch lg:items-end justify-center border-t lg:border-t-0 lg:border-l border-outline-variant/30 pt-4 lg:pt-0 lg:pl-6">
                      {exam.passcode && (
                        <div className="text-right">
                          <span className="text-label-xs text-outline block">Mã Passcode gợi ý:</span>
                          <span className="font-mono text-label-md font-bold text-primary tracking-widest bg-primary-fixed/40 px-2 py-0.5 rounded">
                            {exam.passcode}
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSelectOngoingExam(exam)}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary-container px-6 py-3 text-label-md font-bold text-on-secondary-fixed-variant shadow-sm hover:bg-secondary-fixed transition-colors"
                      >
                        <Icon name="login" className="text-lg" />
                        Vào ca thi này
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 2: SẮP DIỄN RA (UPCOMING) */}
          {activeTab === 'upcoming' && (
            <div className="mt-6 space-y-4">
              {upcomingExams.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-outline-variant/60 p-12 text-center">
                  <Icon name="event_busy" className="text-5xl text-outline mb-2" />
                  <p className="text-body-lg font-medium text-on-surface">Chưa có lịch ca thi mới trong thời gian tới.</p>
                </div>
              ) : (
                upcomingExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 sm:p-7 shadow-sm hover:border-primary/40 transition-all"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary-fixed px-3 py-1 text-label-xs font-bold text-on-primary-fixed-variant flex items-center gap-1">
                          <Icon name="schedule" className="text-sm" />
                          SẮP DIỄN RA
                        </span>
                        <span className="font-mono text-label-sm font-bold text-on-surface bg-surface-container px-2.5 py-0.5 rounded-full">
                          {exam.courseCode}
                        </span>
                        <span className="text-body-xs font-mono text-outline">
                          Mã phiên: {exam.id}
                        </span>
                      </div>

                      <h3 className="text-title-lg font-bold text-on-surface">
                        {exam.title}
                      </h3>

                      {exam.description && (
                        <p className="text-body-sm text-on-surface-variant line-clamp-2">
                          {exam.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-body-xs text-on-surface-variant pt-1">
                        <span className="flex items-center gap-1">
                          <Icon name="person" className="text-base text-outline" />
                          GV: {exam.lecturerName}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <Icon name="event" className="text-base" />
                          Mở lúc: {formatDateTime(exam.startAt, locale)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="timer" className="text-base text-outline" />
                          {exam.durationMinutes} phút
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="quiz" className="text-base text-outline" />
                          {exam.questionCount} câu hỏi
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col shrink-0 gap-2 items-stretch lg:items-end justify-center border-t lg:border-t-0 lg:border-l border-outline-variant/30 pt-4 lg:pt-0 lg:pl-6">
                      <span className="rounded-full bg-surface-container px-4 py-2 text-label-sm font-semibold text-outline text-center">
                        Phòng thi chưa mở
                      </span>
                      <span className="text-body-xs text-outline text-center lg:text-right">
                        Sẵn sàng trước 10 phút để kiểm tra mic
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: ĐÃ THI XONG (COMPLETED) */}
          {activeTab === 'completed' && (
            <div className="mt-6 space-y-4">
              {completedAttempts.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-outline-variant/60 p-12 text-center">
                  <Icon name="history_edu" className="text-5xl text-outline mb-2" />
                  <p className="text-body-lg font-medium text-on-surface">Bạn chưa hoàn thành bài thi nào.</p>
                </div>
              ) : (
                completedAttempts.map((attempt) => {
                  const isPublished = attempt.resultStatus === 'PUBLISHED'
                  const finalScore = attempt.totalFinalScore ?? attempt.totalAiScore

                  return (
                    <div
                      key={attempt.attemptId}
                      className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 sm:p-7 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-label-xs font-bold flex items-center gap-1 ${
                              isPublished
                                ? 'bg-secondary-container text-on-secondary-fixed-variant'
                                : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                            }`}
                          >
                            <Icon name={isPublished ? 'verified' : 'hourglass_top'} className="text-sm" />
                            {isPublished ? 'ĐÃ CÔNG BỐ ĐIỂM' : 'ĐANG CHỜ DUYỆT ĐIỂM'}
                          </span>
                          <span className="font-mono text-label-xs text-outline">
                            Mã lượt: {attempt.attemptId}
                          </span>
                          <span className="font-mono text-label-xs text-outline">
                            Mã phiên: {attempt.examId}
                          </span>
                        </div>

                        <h3 className="text-title-lg font-bold text-on-surface">
                          {attempt.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-body-xs text-on-surface-variant pt-1">
                          <span className="flex items-center gap-1">
                            <Icon name="event_available" className="text-base text-outline" />
                            Nộp bài: {formatDateTime(attempt.completedAt || attempt.startedAt, locale)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon name="timer" className="text-base text-outline" />
                            Thời lượng: {attempt.durationMinutes} phút
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon name="replay" className="text-base text-outline" />
                            Lượt thi: {attempt.attemptNo} / {attempt.maxAttempts}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col shrink-0 gap-3 items-stretch lg:items-end justify-center border-t lg:border-t-0 lg:border-l border-outline-variant/30 pt-4 lg:pt-0 lg:pl-6">
                        {isPublished && typeof finalScore === 'number' ? (
                          <div className="text-center lg:text-right">
                            <span className="text-label-xs text-outline block">Điểm số chính thức:</span>
                            <div className="flex items-baseline justify-center lg:justify-end gap-1">
                              <span className="text-headline-md font-black text-secondary font-mono">
                                {finalScore.toFixed(1)}
                              </span>
                              <span className="text-label-sm text-outline">/ 10</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center lg:text-right">
                            <span className="text-label-xs text-outline block">Trạng thái điểm:</span>
                            <span className="text-label-sm font-semibold text-tertiary">
                              Giảng viên đang thẩm định
                            </span>
                          </div>
                        )}

                        <Link
                          to={`/student/results/${encodeURIComponent(attempt.attemptId)}`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-surface-container px-5 py-2.5 text-label-sm font-bold text-primary hover:bg-primary-fixed transition-colors"
                        >
                          <Icon name="visibility" className="text-base" />
                          Xem chi tiết kết quả &rarr;
                        </Link>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
