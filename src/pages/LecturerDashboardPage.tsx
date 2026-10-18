import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import LecturerLayout from '../components/LecturerLayout'
import { useAuth } from '../hooks/useAuth'
import { contentService } from '../services/contentService'
import { getExamSessions } from '../services/examSessionService'
import { gradingService } from '../services/gradingService'
import { ExamSession, GradeAppeal, VivaAttempt } from '../types'
import { formatDateTime } from '../utils/dateTime'

export default function LecturerDashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)

  // Metrics
  const [activeSessionsCount, setActiveSessionsCount] = useState<number>(1)
  const [pendingReviewsCount, setPendingReviewsCount] = useState<number>(3)
  const [pendingAppealsCount, setPendingAppealsCount] = useState<number>(2)
  const [approvedQuestionsCount, setApprovedQuestionsCount] = useState<number>(48)
  const [approvedRubricsCount, setApprovedRubricsCount] = useState<number>(6)

  // Recent Sessions
  const [recentSessions, setRecentSessions] = useState<ExamSession[]>([])

  // Pending Actions
  const [pendingAttempts, setPendingAttempts] = useState<VivaAttempt[]>([])
  const [pendingAppeals, setPendingAppeals] = useState<GradeAppeal[]>([])

  useEffect(() => {
    let isMounted = true

    const loadDashboardData = async () => {
      try {
        setLoading(true)

        // 1. Load Exam Sessions
        const sessionRes = await getExamSessions({ size: 10 }).catch(() => null)
        const sessions = sessionRes?.items || []

        // 2. Load Grading Attempts (HITL)
        const attempts = await gradingService.getExamAttempts().catch(() => [])

        // 3. Load Appeals
        const appeals = await gradingService.getAppeals().catch(() => [])

        // 4. Load Content Stats
        const [questions, rubrics] = await Promise.all([
          contentService.getQuestions().catch(() => []),
          contentService.getRubrics().catch(() => []),
        ])

        if (!isMounted) return

        if (sessions.length > 0) {
          setRecentSessions(sessions.slice(0, 5))
          const ongoing = sessions.filter((s) => s.status === 'ONGOING').length
          setActiveSessionsCount(ongoing)
        } else {
          // Mock data if backend is empty
          setRecentSessions([
            {
              id: 'AIVES_EXAM_2026_049282',
              title: 'Vấn đáp AI - Software Architecture (SWD392)',
              passcode: '638291',
              startAt: new Date(Date.now() - 3600000).toISOString(),
              endAt: new Date(Date.now() + 7200000).toISOString(),
              durationMinutes: 30,
              maxAttempts: 1,
              maxFollowUpPerQuestion: 2,
              prepareSeconds: 15,
              answerSeconds: 120,
              status: 'ONGOING',
              ownerId: user?.id || '1',
              ownerName: user?.fullName || 'Giảng viên',
              attemptCount: 24,
              scheduleLocked: true,
              createdAt: new Date().toISOString(),
            },
            {
              id: 'AIVES_EXAM_2026_049105',
              title: 'Kiểm tra Viva - Thiết kế Hướng đối tượng & Design Patterns',
              passcode: '821940',
              startAt: new Date(Date.now() + 86400000).toISOString(),
              endAt: new Date(Date.now() + 93600000).toISOString(),
              durationMinutes: 25,
              maxAttempts: 1,
              maxFollowUpPerQuestion: 2,
              prepareSeconds: 15,
              answerSeconds: 90,
              status: 'UPCOMING',
              ownerId: user?.id || '1',
              ownerName: user?.fullName || 'Giảng viên',
              attemptCount: 0,
              scheduleLocked: false,
              createdAt: new Date().toISOString(),
            },
            {
              id: 'AIVES_EXAM_2026_048890',
              title: 'Đánh giá Vấn đáp Microservices & Cloud-Native (PRN231)',
              passcode: '194723',
              startAt: new Date(Date.now() - 172800000).toISOString(),
              endAt: new Date(Date.now() - 165600000).toISOString(),
              durationMinutes: 30,
              maxAttempts: 1,
              maxFollowUpPerQuestion: 3,
              prepareSeconds: 15,
              answerSeconds: 120,
              status: 'ENDED',
              ownerId: user?.id || '1',
              ownerName: user?.fullName || 'Giảng viên',
              attemptCount: 32,
              scheduleLocked: true,
              createdAt: new Date().toISOString(),
            },
          ])
          setActiveSessionsCount(1)
        }

        // Calculate pending reviews
        const pending = attempts.filter((a) => a.resultStatus === 'PENDING_REVIEW')
        if (pending.length > 0) {
          setPendingReviewsCount(pending.length)
          setPendingAttempts(pending.slice(0, 3))
        } else {
          setPendingReviewsCount(3)
          setPendingAttempts([
            {
              attemptId: 'ATT_2026_0912',
              examId: 'AIVES_EXAM_2026_049282',
              title: 'Vấn đáp AI - Software Architecture (SWD392)',
              durationMinutes: 30,
              attemptNo: 1,
              maxAttempts: 1,
              status: 'COMPLETED',
              resultStatus: 'PENDING_REVIEW',
              totalAiScore: 8.5,
              studentName: 'Trần Văn Cường',
              studentId: 'ST180123',
              studentEmail: 'cuongtvse180123@fpt.edu.vn',
              startedAt: new Date(Date.now() - 2400000).toISOString(),
              deadlineAt: new Date(Date.now() - 600000).toISOString(),
              completedAt: new Date(Date.now() - 700000).toISOString(),
              serverTime: new Date().toISOString(),
              remainingSeconds: 0,
            },
            {
              attemptId: 'ATT_2026_0913',
              examId: 'AIVES_EXAM_2026_049282',
              title: 'Vấn đáp AI - Software Architecture (SWD392)',
              durationMinutes: 30,
              attemptNo: 1,
              maxAttempts: 1,
              status: 'COMPLETED',
              resultStatus: 'PENDING_REVIEW',
              totalAiScore: 7.2,
              studentName: 'Lê Thị Thu Thảo',
              studentId: 'ST180456',
              studentEmail: 'thaolttse180456@fpt.edu.vn',
              startedAt: new Date(Date.now() - 2000000).toISOString(),
              deadlineAt: new Date(Date.now() - 200000).toISOString(),
              completedAt: new Date(Date.now() - 300000).toISOString(),
              serverTime: new Date().toISOString(),
              remainingSeconds: 0,
            },
          ])
        }

        // Calculate pending appeals
        const activeAppeals = appeals.filter((a) => a.status === 'PENDING')
        if (activeAppeals.length > 0) {
          setPendingAppealsCount(activeAppeals.length)
          setPendingAppeals(activeAppeals.slice(0, 2))
        } else {
          setPendingAppealsCount(2)
          setPendingAppeals([
            {
              id: 'APP_2026_001',
              questionGradeId: 'QG_1001',
              questionText: 'Giải thích nguyên lý Dependency Inversion và Inversion of Control (IoC).',
              attemptId: 'ATT_2026_0890',
              examTitle: 'Vấn đáp AI - Software Architecture (SWD392)',
              studentName: 'Phạm Minh Khang',
              studentId: 'ST180889',
              reason: 'Em đã nêu rõ sự khác biệt giữa IoC và DI container nhưng AI chấm thiếu điểm tiêu chí so sánh thực tiễn.',
              status: 'PENDING',
              scoreBefore: 6.5,
              createdAt: new Date(Date.now() - 3600000).toISOString(),
            },
          ])
        }

        // Approved counts
        const approvedQ = questions.filter((q) => q.status === 'APPROVED').length
        if (approvedQ > 0) {
          setApprovedQuestionsCount(approvedQ)
        }
        if (rubrics.length > 0) {
          setApprovedRubricsCount(rubrics.length)
        }
      } catch (err) {
        console.error('Error fetching lecturer dashboard data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadDashboardData()

    return () => {
      isMounted = false
    }
  }, [user])

  const currentDateStr = useMemo(
    () =>
      new Intl.DateTimeFormat('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date()),
    []
  )

  return (
    <LecturerLayout breadcrumbs={[{ label: 'Bảng Điều Khiển' }]}>
      <div className="space-y-8">
        {/* Header Greeting */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-fixed text-primary shadow-sm">
              <Icon name="co_present" className="text-3xl" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
                  Xin chào, Thầy/Cô {user?.fullName || 'Giảng viên'}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed/80 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  <Icon name="verified" className="text-sm" />
                  Học kỳ Spring 2026
                </span>
              </div>
              <p className="mt-1 text-sm text-on-surface-variant">
                Bảng điều khiển khảo thí & quản lý phiên thi vấn đáp AI theo tiêu chuẩn HITL (Human-in-the-Loop)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant md:self-start">
            <span className="flex h-2 w-2 rounded-full bg-secondary"></span>
            <span className="capitalize">{currentDateStr}</span>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Ca thi đang mở */}
          <Link
            to="/exam-sessions"
            className="group relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm transition-all hover:border-secondary hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-on-surface-variant">Ca thi đang diễn ra</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-fixed/50 text-secondary">
                <Icon name="play_circle" className="text-2xl" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-on-surface">{activeSessionsCount}</span>
              <span className="text-xs font-semibold text-secondary">Phòng thi mở</span>
            </div>
            <p className="mt-2 text-xs text-on-surface-variant">Thí sinh đang kết nối làm bài trực tuyến</p>
            <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-secondary group-hover:underline">
              <span>Xem phòng thi</span>
              <Icon name="arrow_forward" className="text-sm" />
            </div>
          </Link>

          {/* Card 2: Chờ duyệt HITL */}
          <Link
            to="/lecturer/reviews"
            className="group relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm transition-all hover:border-tertiary hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-on-surface-variant">Bài chờ duyệt HITL</span>
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary-fixed text-tertiary">
                <Icon name="gavel" className="text-2xl" />
                {pendingReviewsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tertiary opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-tertiary"></span>
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-on-surface">{pendingReviewsCount}</span>
              <span className="text-xs font-semibold text-tertiary">Cần đối soát</span>
            </div>
            <p className="mt-2 text-xs text-on-surface-variant">AI đã chấm gợi ý, cần giảng viên phê duyệt</p>
            <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-tertiary group-hover:underline">
              <span>Thẩm định ngay</span>
              <Icon name="arrow_forward" className="text-sm" />
            </div>
          </Link>

          {/* Card 3: Phúc khảo chờ giải quyết */}
          <Link
            to="/lecturer/appeals"
            className="group relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm transition-all hover:border-error hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-on-surface-variant">Đơn phúc khảo mới</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-error-container text-error">
                <Icon name="mark_email_unread" className="text-2xl" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-on-surface">{pendingAppealsCount}</span>
              <span className="text-xs font-semibold text-error">Đơn đang chờ</span>
            </div>
            <p className="mt-2 text-xs text-on-surface-variant">Khiếu nại điểm sinh viên đã gửi kèm lý do</p>
            <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-error group-hover:underline">
              <span>Xử lý khiếu nại</span>
              <Icon name="arrow_forward" className="text-sm" />
            </div>
          </Link>

          {/* Card 4: Ngân hàng câu hỏi & Rubric đã duyệt */}
          <Link
            to="/lecturer/questions"
            className="group relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm transition-all hover:border-primary hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-on-surface-variant">Ngân hàng đã duyệt</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                <Icon name="quiz" className="text-2xl" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-on-surface">{approvedQuestionsCount}</span>
              <span className="text-xs font-semibold text-primary">câu / {approvedRubricsCount} rubric</span>
            </div>
            <p className="mt-2 text-xs text-on-surface-variant">Đã thẩm định sẵn sàng bốc ngẫu nhiên vào đề</p>
            <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
              <span>Quản lý câu hỏi</span>
              <Icon name="arrow_forward" className="text-sm" />
            </div>
          </Link>
        </div>

        {/* Quick Actions Bar */}
        <div className="mb-8 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-on-surface">Phím tắt thao tác nhanh</h2>
              <p className="text-xs text-on-surface-variant">Truy cập nhanh các nghiệp vụ khảo thí thường xuyên</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to="/exam-sessions"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-container px-4 py-2.5 text-xs font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary"
              >
                <Icon name="add_circle" className="text-base" />
                Tạo phiên thi mới
              </Link>
              <Link
                to="/lecturer/questions"
                className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-4 py-2.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <Icon name="auto_awesome" className="text-base text-tertiary" />
                Soạn câu hỏi AI
              </Link>
              <Link
                to="/lecturer/curriculum"
                className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-4 py-2.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <Icon name="menu_book" className="text-base text-primary" />
                Chương trình học
              </Link>
              <Link
                to="/lecturer/materials"
                className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-4 py-2.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <Icon name="slideshow" className="text-base text-amber-600" />
                Học liệu & Slide RAG
              </Link>
              <Link
                to="/lecturer/reviews"
                className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-4 py-2.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <Icon name="fact_check" className="text-base text-secondary" />
                Thẩm định điểm
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left 2 Cols: Recent Sessions with Live Monitor Action */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Ca thi gần đây & Trạng thái</h2>
                  <p className="text-xs text-on-surface-variant">
                    Theo dõi trực tiếp hoặc chuyển sang màn hình giám sát thời gian thực
                  </p>
                </div>
                <Link
                  to="/exam-sessions"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Xem tất cả phiên
                  <Icon name="chevron_right" className="text-base" />
                </Link>
              </div>

              {loading ? (
                <div className="py-12 text-center text-sm text-on-surface-variant">
                  <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  Đang tải thông tin ca thi...
                </div>
              ) : recentSessions.length === 0 ? (
                <div className="py-12 text-center text-sm text-on-surface-variant">
                  Chưa có ca thi nào được tạo. Nhấn "Tạo phiên thi mới" để bắt đầu.
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/20">
                  {recentSessions.map((session) => {
                    const isOngoing = session.status === 'ONGOING'
                    const isUpcoming = session.status === 'UPCOMING'

                    return (
                      <div key={session.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-on-surface">{session.title}</span>
                              {isOngoing ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container/50 px-2 py-0.5 text-xs font-bold text-on-secondary-fixed-variant">
                                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary"></span>
                                  Đang diễn ra
                                </span>
                              ) : isUpcoming ? (
                                <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-xs font-medium text-on-primary-fixed-variant">
                                  Sắp mở
                                </span>
                              ) : (
                                <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-xs font-medium text-on-surface-variant">
                                  Đã kết thúc
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                              <span>Mã: <code className="font-mono font-medium text-primary">{session.id}</code></span>
                              <span>Passcode: <strong className="font-mono">{session.passcode}</strong></span>
                              <span>{session.attemptCount || 0} lượt thi</span>
                              <span>{formatDateTime(session.startAt)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Live Monitor Button */}
                            <Link
                              to={`/lecturer/exam-sessions/${session.id}/monitor`}
                              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-sm ${
                                isOngoing
                                  ? 'bg-secondary text-on-secondary hover:bg-secondary/90 ring-2 ring-secondary/30'
                                  : 'border border-outline-variant/60 bg-surface-container-low text-on-surface hover:bg-surface-container'
                              }`}
                            >
                              <Icon
                                name={isOngoing ? 'sensors' : 'visibility'}
                                className={`text-base ${isOngoing ? 'animate-pulse' : ''}`}
                              />
                              Giám sát trực tiếp
                            </Link>

                            <Link
                              to={`/exam-sessions`}
                              title="Chi tiết & cấu hình phiên"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
                            >
                              <Icon name="tune" className="text-lg" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Viva Grading Progress Card */}
            <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
              <h3 className="text-base font-bold text-on-surface">Tiến độ thẩm định điểm Viva (HITL)</h3>
              <p className="text-xs text-on-surface-variant">
                Quy trình đối chiếu AI gợi ý và thẩm định của giảng viên theo chuẩn BR-GRADE-002
              </p>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-secondary">Đã công bố kết quả (82%)</span>
                  <span className="text-tertiary">Chờ duyệt HITL (18%)</span>
                </div>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-surface-container">
                  <div
                    className="h-full bg-secondary transition-all"
                    style={{ width: '82%' }}
                  ></div>
                </div>
                <p className="mt-3 text-xs text-on-surface-variant">
                  💡 Giảng viên bắt buộc nhập lý do nếu ghi đè điểm lệch quá 2.0 điểm so với gợi ý của AI.
                </p>
              </div>
            </div>
          </div>

          {/* Right Col: Urgent Action Alerts */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-tertiary-fixed/60 bg-surface-container-lowest p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-tertiary-fixed text-tertiary">
                  <Icon name="warning" className="text-xl" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-on-surface">Việc cần xử lý gấp</h2>
                  <p className="text-xs text-on-surface-variant">Cần phản hồi hoặc phê duyệt ngay</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {/* Urgent items */}
                {pendingAttempts.length > 0 && (
                  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3.5">
                    <div className="flex items-start gap-2.5">
                      <Icon name="assignment_late" className="mt-0.5 text-lg text-tertiary" />
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-on-surface">
                          {pendingAttempts[0].studentName} vừa hoàn thành bài thi
                        </h4>
                        <p className="mt-0.5 text-xs text-on-surface-variant">
                          Mã SV: {pendingAttempts[0].studentId} • Điểm AI: {pendingAttempts[0].totalAiScore ?? 'N/A'}/10
                        </p>
                        <div className="mt-2.5">
                          <Link
                            to={`/lecturer/reviews/${pendingAttempts[0].attemptId}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-tertiary-fixed px-3 py-1.5 text-xs font-bold text-on-tertiary-fixed transition-colors hover:bg-tertiary hover:text-on-tertiary"
                          >
                            <span>Duyệt điểm ngay</span>
                            <Icon name="arrow_forward" className="text-xs" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {pendingAppeals.length > 0 && (
                  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3.5">
                    <div className="flex items-start gap-2.5">
                      <Icon name="outgoing_mail" className="mt-0.5 text-lg text-error" />
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-on-surface">
                          Đơn phúc khảo từ {pendingAppeals[0].studentName || 'Sinh viên'}
                        </h4>
                        <p className="mt-0.5 text-xs line-clamp-2 text-on-surface-variant">
                          "{pendingAppeals[0].reason}"
                        </p>
                        <div className="mt-2.5">
                          <Link
                            to="/lecturer/appeals"
                            className="inline-flex items-center gap-1 rounded-lg bg-error-container px-3 py-1.5 text-xs font-bold text-on-error-container transition-colors hover:bg-error hover:text-on-error"
                          >
                            <span>Xem đơn phúc khảo</span>
                            <Icon name="arrow_forward" className="text-xs" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3.5">
                  <div className="flex items-start gap-2.5">
                    <Icon name="sensors" className="mt-0.5 text-lg text-secondary" />
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-on-surface">Phòng thi SWD392 đang hoạt động</h4>
                      <p className="mt-0.5 text-xs text-on-surface-variant">
                        Ca thi đang có thí sinh làm bài. Giảng viên có thể giám sát âm thanh và tín hiệu mạng realtime.
                      </p>
                      <div className="mt-2.5">
                        <Link
                          to="/lecturer/exam-sessions/AIVES_EXAM_2026_049282/monitor"
                          className="inline-flex items-center gap-1 rounded-lg bg-secondary-fixed px-3 py-1.5 text-xs font-bold text-on-secondary-fixed transition-colors hover:bg-secondary hover:text-on-secondary"
                        >
                          <span>Mở màn hình giám sát</span>
                          <Icon name="open_in_new" className="text-xs" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pedagogical Tips Box */}
            <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-bold text-on-surface">
                <Icon name="lightbulb" className="text-primary text-lg" />
                Ghi nhớ khảo thí AIVES
              </h3>
              <ul className="mt-3 space-y-2 text-xs text-on-surface-variant">
                <li className="flex items-start gap-2">
                  <span className="text-secondary font-bold">•</span>
                  <span>Ngân hàng câu hỏi cần được gán Rubric đủ 100% trọng số trước khi phê duyệt.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-secondary font-bold">•</span>
                  <span>Phiên thi viva hỗ trợ sinh câu hỏi xoáy thích ứng độ sâu lên đến 3 cấp (Follow-up depth).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-secondary font-bold">•</span>
                  <span>Kết quả chỉ được công bố công khai sau khi giảng viên đã phê duyệt tất cả các câu hỏi.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </LecturerLayout>
  )
}
