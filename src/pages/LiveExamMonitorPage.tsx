import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CopyButton from '../components/CopyButton'
import Icon from '../components/Icon'
import Modal from '../components/Modal'
import LecturerLayout from '../components/LecturerLayout'
import { getExamSessionById } from '../services/examSessionService'
import { ExamSession } from '../types'
import { formatDateTime } from '../utils/dateTime'

export interface LiveCandidate {
  id: string
  studentId: string // STxxxxxx
  fullName: string
  email: string
  platform: 'WEB' | 'MOBILE_IOS' | 'MOBILE_ANDROID'
  clientDetails: string
  currentQuestion: number
  totalQuestions: number
  currentPhase: 'ANSWERING' | 'FOLLOW_UP' | 'PREPARING' | 'COMPLETED' | 'DISCONNECTED'
  followUpDepth?: number
  remainingSeconds: number
  micStatus: 'SPEAKING' | 'SILENT' | 'MUTED'
  networkStatus: 'EXCELLENT' | 'GOOD' | 'POOR' | 'DISCONNECTED'
  pingMs: number
  startedAt: string
  currentQuestionText?: string
  lastTranscript?: string
}

const MOCK_CANDIDATES: LiveCandidate[] = [
  {
    id: 'cand-01',
    studentId: 'ST180123',
    fullName: 'Trần Văn Cường',
    email: 'cuongtvse180123@fpt.edu.vn',
    platform: 'WEB',
    clientDetails: 'Chrome 128 / Windows 11',
    currentQuestion: 2,
    totalQuestions: 4,
    currentPhase: 'ANSWERING',
    remainingSeconds: 1145,
    micStatus: 'SPEAKING',
    networkStatus: 'EXCELLENT',
    pingMs: 16,
    startedAt: new Date(Date.now() - 655000).toISOString(),
    currentQuestionText: 'Trình bày cách thức triển khai Factory Method Pattern và ưu điểm của nó so với việc khởi tạo đối tượng trực tiếp bằng từ khóa new.',
    lastTranscript: 'Theo em, Factory Method giúp đóng gói việc tạo đối tượng con, tuân thủ nguyên lý Open/Closed...',
  },
  {
    id: 'cand-02',
    studentId: 'ST180456',
    fullName: 'Lê Thị Thu Thảo',
    email: 'thaolttse180456@fpt.edu.vn',
    platform: 'MOBILE_IOS',
    clientDetails: 'AIVES iOS App / iPhone 15 Pro',
    currentQuestion: 1,
    totalQuestions: 4,
    currentPhase: 'FOLLOW_UP',
    followUpDepth: 1,
    remainingSeconds: 1420,
    micStatus: 'SILENT',
    networkStatus: 'GOOD',
    pingMs: 42,
    startedAt: new Date(Date.now() - 380000).toISOString(),
    currentQuestionText: '[Câu hỏi xoáy AI] Em vừa nhắc đến Loose Coupling, hãy giải thích trường hợp cụ thể nếu không dùng Dependency Injection thì code sẽ bị Tight Coupling như thế nào?',
    lastTranscript: 'Thưa giám khảo AI, nếu một Service tự new Repository bên trong constructor...',
  },
  {
    id: 'cand-03',
    studentId: 'ST180789',
    fullName: 'Nguyễn Đăng Khoa',
    email: 'khoandse180789@fpt.edu.vn',
    platform: 'WEB',
    clientDetails: 'Edge 127 / macOS Sequoia',
    currentQuestion: 3,
    totalQuestions: 4,
    currentPhase: 'PREPARING',
    remainingSeconds: 610,
    micStatus: 'SILENT',
    networkStatus: 'EXCELLENT',
    pingMs: 22,
    startedAt: new Date(Date.now() - 1190000).toISOString(),
    currentQuestionText: 'Phân tích sự khác biệt giữa kiến trúc Microservices và Modular Monolith. Khi nào một startup nên chọn Monolith?',
    lastTranscript: 'Em đang chuẩn bị câu trả lời...',
  },
  {
    id: 'cand-04',
    studentId: 'ST180321',
    fullName: 'Phạm Minh Khang',
    email: 'khangpmse180321@fpt.edu.vn',
    platform: 'MOBILE_ANDROID',
    clientDetails: 'AIVES Android App / Galaxy S24',
    currentQuestion: 4,
    totalQuestions: 4,
    currentPhase: 'COMPLETED',
    remainingSeconds: 0,
    micStatus: 'MUTED',
    networkStatus: 'EXCELLENT',
    pingMs: 28,
    startedAt: new Date(Date.now() - 1700000).toISOString(),
    currentQuestionText: 'Đã hoàn thành toàn bộ 4 câu hỏi chính và 2 câu hỏi xoáy.',
    lastTranscript: 'Em đã nộp bài thành công lúc 09:45.',
  },
  {
    id: 'cand-05',
    studentId: 'ST180654',
    fullName: 'Hoàng Quốc Bảo',
    email: 'baohqse180654@fpt.edu.vn',
    platform: 'WEB',
    clientDetails: 'Chrome 128 / Ubuntu Linux',
    currentQuestion: 2,
    totalQuestions: 4,
    currentPhase: 'DISCONNECTED',
    remainingSeconds: 890,
    micStatus: 'MUTED',
    networkStatus: 'DISCONNECTED',
    pingMs: 999,
    startedAt: new Date(Date.now() - 910000).toISOString(),
    currentQuestionText: 'Giải thích cơ chế Circuit Breaker trong hệ thống phân tán chịu tải cao.',
    lastTranscript: 'Mất kết nối mạng đột ngột (Socket timeout 5000ms)...',
  },
  {
    id: 'cand-06',
    studentId: 'ST180992',
    fullName: 'Vũ Hải Đăng',
    email: 'dangvhse180992@fpt.edu.vn',
    platform: 'WEB',
    clientDetails: 'Firefox 129 / Windows 11',
    currentQuestion: 3,
    totalQuestions: 4,
    currentPhase: 'ANSWERING',
    remainingSeconds: 520,
    micStatus: 'SPEAKING',
    networkStatus: 'GOOD',
    pingMs: 55,
    startedAt: new Date(Date.now() - 1280000).toISOString(),
    currentQuestionText: 'Sự khác biệt giữa Two-Phase Commit (2PC) và Saga Pattern khi quản lý giao dịch phân tán?',
    lastTranscript: 'Theo em, 2PC có nhược điểm là khóa tài nguyên dạng đồng bộ gây nghẽn cổ chai...',
  },
  {
    id: 'cand-07',
    studentId: 'ST180210',
    fullName: 'Đỗ Thùy Trang',
    email: 'trangdtse180210@fpt.edu.vn',
    platform: 'MOBILE_IOS',
    clientDetails: 'AIVES iOS App / iPad Air 5',
    currentQuestion: 4,
    totalQuestions: 4,
    currentPhase: 'COMPLETED',
    remainingSeconds: 0,
    micStatus: 'MUTED',
    networkStatus: 'EXCELLENT',
    pingMs: 19,
    startedAt: new Date(Date.now() - 1750000).toISOString(),
    currentQuestionText: 'Đã hoàn thành lượt thi.',
    lastTranscript: 'Em cảm ơn thầy cô và ban giám khảo.',
  },
  {
    id: 'cand-08',
    studentId: 'ST180447',
    fullName: 'Bùi Gia Huy',
    email: 'huybgse180447@fpt.edu.vn',
    platform: 'WEB',
    clientDetails: 'Chrome 128 / Windows 11',
    currentQuestion: 2,
    totalQuestions: 4,
    currentPhase: 'FOLLOW_UP',
    followUpDepth: 2,
    remainingSeconds: 830,
    micStatus: 'SPEAKING',
    networkStatus: 'POOR',
    pingMs: 310,
    startedAt: new Date(Date.now() - 970000).toISOString(),
    currentQuestionText: '[Câu hỏi xoáy cấp 2] Nếu áp dụng Saga Choreography, khi một microservice trung gian gặp lỗi thì làm sao các service trước đó biết để kích hoạt compensating transaction?',
    lastTranscript: 'Mỗi service sẽ publish event thất bại lên message broker, các service khác lắng nghe để rollback...',
  },
]

export default function LiveExamMonitorPage() {
  const { id } = useParams<{ id: string }>()
  const examId = id || 'AIVES_EXAM_2026_049282'

  const [session, setSession] = useState<ExamSession | null>(null)
  const [candidates, setCandidates] = useState<LiveCandidate[]>(MOCK_CANDIDATES)
  const [_loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [platformFilter, setPlatformFilter] = useState<string>('ALL')

  // Auto-refresh timer state
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(() => new Date())

  // Inspector Modal
  const [inspectingCandidate, setInspectingCandidate] = useState<LiveCandidate | null>(null)
  const [alertNotice, setAlertNotice] = useState<string | null>(null)

  // Load Session Info
  useEffect(() => {
    let isMounted = true

    const loadSession = async () => {
      try {
        setLoading(true)
        const data = await getExamSessionById(examId)
        if (isMounted && data) {
          setSession(data)
        }
      } catch (err) {
        // Fallback session info
        console.debug('Using mock session info:', err)
        if (isMounted) {
          setSession({
            id: examId,
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
            ownerId: '1',
            ownerName: 'TS. Nguyễn Hoài Nam',
            attemptCount: 28,
            scheduleLocked: true,
            createdAt: new Date().toISOString(),
          })
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadSession()

    return () => {
      isMounted = false
    }
  }, [examId])

  // Countdown timer effect (decrements seconds remaining every second)
  useEffect(() => {
    const timer = setInterval(() => {
      setCandidates((prev) =>
        prev.map((c) => {
          if (c.currentPhase === 'COMPLETED' || c.currentPhase === 'DISCONNECTED') {
            return c
          }
          return {
            ...c,
            remainingSeconds: Math.max(0, c.remainingSeconds - 1),
          }
        }),
      )
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Auto-refresh simulation effect every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const refreshTimer = setInterval(() => {
      setLastUpdated(new Date())
      // Randomly tweak mic status or ping to demonstrate real-time vitality
      setCandidates((prev) =>
        prev.map((c) => {
          if (c.currentPhase === 'ANSWERING') {
            const isSpeaking = Math.random() > 0.35
            return {
              ...c,
              micStatus: isSpeaking ? 'SPEAKING' : 'SILENT',
              pingMs: Math.max(12, Math.min(180, c.pingMs + Math.floor(Math.random() * 9 - 4))),
            }
          }
          return c
        }),
      )
    }, 5000)

    return () => clearInterval(refreshTimer)
  }, [autoRefresh])

  const handleManualRefresh = () => {
    setLastUpdated(new Date())
  }

  const handleSendReminder = (student: LiveCandidate) => {
    setAlertNotice(`Đã gửi thông báo nhắc nhở giữ trật tự và tập trung tới sinh viên ${student.fullName} (${student.studentId}).`)
    setTimeout(() => setAlertNotice(null), 4000)
  }

  const handleInterveneCandidate = (student: LiveCandidate) => {
    setAlertNotice(`Đã gửi tín hiệu khôi phục phiên kết nối khẩn cấp cho ${student.fullName}. Thí sinh có thể reload trang để tiếp tục lượt thi.`)
    setTimeout(() => setAlertNotice(null), 4000)
    // Update local state to reconnecting
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === student.id
          ? { ...c, currentPhase: 'ANSWERING', networkStatus: 'GOOD', pingMs: 45 }
          : c,
      ),
    )
    if (inspectingCandidate?.id === student.id) {
      setInspectingCandidate(null)
    }
  }

  // Filter logic
  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? c.currentPhase === 'ANSWERING' || c.currentPhase === 'PREPARING'
        : statusFilter === 'FOLLOW_UP'
        ? c.currentPhase === 'FOLLOW_UP'
        : statusFilter === 'COMPLETED'
        ? c.currentPhase === 'COMPLETED'
        : statusFilter === 'DISCONNECTED'
        ? c.currentPhase === 'DISCONNECTED'
        : true

    const matchesPlatform =
      platformFilter === 'ALL'
        ? true
        : platformFilter === 'WEB'
        ? c.platform === 'WEB'
        : platformFilter === 'MOBILE'
        ? c.platform.startsWith('MOBILE')
        : true

    return matchesSearch && matchesStatus && matchesPlatform
  })

  // Metric aggregates
  const totalCount = candidates.length
  const activeCount = candidates.filter((c) => c.currentPhase === 'ANSWERING' || c.currentPhase === 'PREPARING').length
  const followUpCount = candidates.filter((c) => c.currentPhase === 'FOLLOW_UP').length
  const completedCount = candidates.filter((c) => c.currentPhase === 'COMPLETED').length
  const disconnectedCount = candidates.filter((c) => c.currentPhase === 'DISCONNECTED').length

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const s = sec % 60
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <LecturerLayout breadcrumbs={[{ label: 'Phiên thi', to: '/exam-sessions' }, { label: 'Giám sát trực tiếp' }]}>
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-primary font-medium">
            <Link to="/lecturer/dashboard" className="hover:underline">
              Bảng điều khiển
            </Link>
            <span>/</span>
            <Link to="/exam-sessions" className="hover:underline">
              Phiên thi
            </Link>
            <span>/</span>
            <span className="text-on-surface-variant font-normal">Giám sát trực tiếp</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                autoRefresh
                  ? 'bg-secondary-fixed/50 text-secondary'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-secondary animate-pulse' : 'bg-outline'}`}></span>
              {autoRefresh ? 'Tự động làm mới: 5s' : 'Đã tạm dừng tự động'}
            </button>

            <button
              type="button"
              onClick={handleManualRefresh}
              title="Làm mới ngay"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-outline-variant/60 text-outline hover:bg-surface-container hover:text-on-surface"
            >
              <Icon name="refresh" className="text-sm" />
            </button>

            <span className="text-[11px] text-outline">
              Cập nhật: {lastUpdated.toLocaleTimeString('vi-VN')}
            </span>
          </div>
        </div>

        {/* Global Notice Toast */}
        {alertNotice && (
          <div className="mb-6 flex items-center justify-between rounded-2xl bg-primary-fixed/80 p-4 text-xs font-bold text-primary shadow-md">
            <div className="flex items-center gap-2">
              <Icon name="campaign" className="text-xl" />
              <span>{alertNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setAlertNotice(null)}
              className="rounded-full p-1 hover:bg-black/10"
            >
              <Icon name="close" className="text-sm" />
            </button>
          </div>
        )}

        {/* Exam Session Header Banner */}
        <div className="mb-8 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-extrabold text-on-surface sm:text-2xl">
                  {session?.title || 'Ca thi Vấn đáp AI'}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container/60 px-3 py-0.5 text-xs font-bold text-on-secondary-fixed-variant">
                  <span className="h-2 w-2 animate-ping rounded-full bg-secondary"></span>
                  LIVE MONITOR
                </span>
                <span className="rounded-full bg-primary-fixed px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Phòng thi trực tuyến
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-on-surface-variant">
                <span className="flex items-center gap-1">
                  Mã phiên: <code className="font-mono font-bold text-primary">{session?.id}</code>
                </span>
                <span className="flex items-center gap-1">
                  Passcode: <strong className="font-mono text-on-surface">{session?.passcode}</strong>
                  {session && <CopyButton value={session.passcode} label="Chép passcode" copiedLabel="Đã chép" />}
                </span>
                <span>
                  Thời lượng: <strong>{session?.durationMinutes || 30} phút / thí sinh</strong>
                </span>
                <span>
                  Khung giờ: {session ? formatDateTime(session.startAt) : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                to={`/exam-sessions`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3.5 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container"
              >
                <Icon name="settings" className="text-base text-outline" />
                Cấu hình ca thi
              </Link>
              <Link
                to={`/lecturer/reviews`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary-container px-4 py-2 text-xs font-semibold text-on-primary shadow-sm hover:bg-primary"
              >
                <Icon name="fact_check" className="text-base" />
                Thẩm định điểm (HITL)
              </Link>
            </div>
          </div>

          {/* Quick Realtime KPI Stats Bar */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-outline-variant/20 pt-5 sm:grid-cols-5">
            <div className="rounded-xl bg-surface-container-low p-3 text-center">
              <span className="block text-2xl font-extrabold text-on-surface">{totalCount}</span>
              <span className="block text-[11px] font-medium text-on-surface-variant">Tổng thí sinh</span>
            </div>
            <div className="rounded-xl bg-secondary-fixed/30 p-3 text-center">
              <span className="block text-2xl font-extrabold text-secondary">{activeCount}</span>
              <span className="block text-[11px] font-semibold text-secondary">Đang trả lời câu chính</span>
            </div>
            <div className="rounded-xl bg-primary-fixed/40 p-3 text-center">
              <span className="block text-2xl font-extrabold text-primary">{followUpCount}</span>
              <span className="block text-[11px] font-semibold text-primary">Đang bị xoáy (Follow-up)</span>
            </div>
            <div className="rounded-xl bg-surface-container p-3 text-center">
              <span className="block text-2xl font-extrabold text-on-surface-variant">{completedCount}</span>
              <span className="block text-[11px] font-medium text-on-surface-variant">Đã nộp bài</span>
            </div>
            <div className="col-span-2 rounded-xl bg-error-container/40 p-3 text-center sm:col-span-1">
              <span className={`block text-2xl font-extrabold ${disconnectedCount > 0 ? 'text-error animate-pulse' : 'text-on-surface'}`}>
                {disconnectedCount}
              </span>
              <span className="block text-[11px] font-bold text-error">Sự cố / Mất mạng</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Controls */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              Tất cả ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === 'ACTIVE'
                  ? 'bg-secondary text-on-secondary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              Đang trả lời ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('FOLLOW_UP')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === 'FOLLOW_UP'
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              Đang nghe câu xoáy ({followUpCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === 'COMPLETED'
                  ? 'bg-surface-container-highest text-on-surface shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              Đã nộp bài ({completedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('DISCONNECTED')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === 'DISCONNECTED'
                  ? 'bg-error text-on-error shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              Mất kết nối ({disconnectedCount})
            </button>
          </div>

          {/* Search & Platform Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1 sm:flex-initial">
              <Icon name="search" className="pointer-events-none absolute left-3.5 top-2.5 text-base text-outline" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên hoặc mã SV..."
                className="w-full rounded-full border border-outline-variant/50 bg-surface-container-lowest py-2 pr-4 pl-9 text-xs text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 rounded-full border border-outline-variant/40 bg-surface-container-lowest p-1">
              <button
                type="button"
                onClick={() => setPlatformFilter('ALL')}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  platformFilter === 'ALL' ? 'bg-primary-fixed text-primary font-bold' : 'text-on-surface-variant'
                }`}
              >
                Mọi thiết bị
              </button>
              <button
                type="button"
                onClick={() => setPlatformFilter('WEB')}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  platformFilter === 'WEB' ? 'bg-primary-fixed text-primary font-bold' : 'text-on-surface-variant'
                }`}
              >
                Web
              </button>
              <button
                type="button"
                onClick={() => setPlatformFilter('MOBILE')}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  platformFilter === 'MOBILE' ? 'bg-primary-fixed text-primary font-bold' : 'text-on-surface-variant'
                }`}
              >
                Mobile
              </button>
            </div>
          </div>
        </div>

        {/* Realtime Candidates Table */}
        <div className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-outline-variant/30 bg-surface-container-low text-on-surface-variant">
                <tr>
                  <th scope="col" className="py-3.5 px-4 font-semibold">
                    Thí sinh
                  </th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">
                    Nền tảng
                  </th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">
                    Tiến độ phỏng vấn
                  </th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">
                    Thời gian còn lại
                  </th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">
                    Âm thanh & Tín hiệu
                  </th>
                  <th scope="col" className="py-3.5 px-4 font-semibold text-right">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-on-surface-variant">
                      Không có thí sinh nào khớp với bộ lọc tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((candidate) => {
                    const isAnswering = candidate.currentPhase === 'ANSWERING'
                    const isFollowUp = candidate.currentPhase === 'FOLLOW_UP'
                    const isPreparing = candidate.currentPhase === 'PREPARING'
                    const isCompleted = candidate.currentPhase === 'COMPLETED'
                    const isDisconnected = candidate.currentPhase === 'DISCONNECTED'

                    const isTimeCritical = candidate.remainingSeconds > 0 && candidate.remainingSeconds < 180

                    return (
                      <tr
                        key={candidate.id}
                        className={`transition-colors hover:bg-surface-container-low/60 ${
                          isDisconnected ? 'bg-error-container/10' : ''
                        }`}
                      >
                        {/* 1. Thí sinh Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary font-bold text-xs">
                              {candidate.fullName.split(' ').slice(-1)[0][0]}
                            </div>
                            <div className="min-w-0">
                              <span className="block font-bold text-on-surface truncate">
                                {candidate.fullName}
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                                <code className="font-mono font-medium text-primary">{candidate.studentId}</code>
                                <span>•</span>
                                <span className="truncate max-w-[120px]">{candidate.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Platform Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {candidate.platform === 'WEB' ? (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/40 bg-surface-container-high px-2 py-1 text-[11px] font-medium text-on-surface">
                              <Icon name="laptop_mac" className="text-xs text-primary" />
                              Web Browser
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-secondary-container bg-secondary-fixed/40 px-2 py-1 text-[11px] font-semibold text-on-secondary-fixed-variant">
                              <Icon name="smartphone" className="text-xs text-secondary" />
                              {candidate.platform === 'MOBILE_IOS' ? 'iOS App' : 'Android App'}
                            </span>
                          )}
                          <span className="block text-[10px] text-outline mt-0.5">{candidate.clientDetails}</span>
                        </td>

                        {/* 3. Tiến độ câu hỏi */}
                        <td className="py-3.5 px-4 min-w-[200px]">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              {isAnswering ? (
                                <span className="font-bold text-secondary flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse"></span>
                                  Đang trả lời câu {candidate.currentQuestion}/{candidate.totalQuestions}
                                </span>
                              ) : isFollowUp ? (
                                <span className="font-bold text-tertiary flex items-center gap-1">
                                  <Icon name="psychology_alt" className="text-xs animate-spin" />
                                  Đang nghe câu xoáy (Cấp {candidate.followUpDepth || 1})
                                </span>
                              ) : isPreparing ? (
                                <span className="font-medium text-primary flex items-center gap-1">
                                  <Icon name="hourglass_top" className="text-xs" />
                                  Đang chuẩn bị câu {candidate.currentQuestion}
                                </span>
                              ) : isCompleted ? (
                                <span className="font-semibold text-on-surface-variant flex items-center gap-1">
                                  <Icon name="task_alt" className="text-xs text-secondary" />
                                  Đã nộp bài (Chờ duyệt)
                                </span>
                              ) : (
                                <span className="font-bold text-error flex items-center gap-1">
                                  <Icon name="wifi_off" className="text-xs" />
                                  Mất kết nối
                                </span>
                              )}
                              <span className="text-outline text-[10px]">
                                {Math.round((candidate.currentQuestion / candidate.totalQuestions) * 100)}%
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                              <div
                                className={`h-full transition-all ${
                                  isCompleted
                                    ? 'bg-secondary'
                                    : isFollowUp
                                    ? 'bg-tertiary'
                                    : isDisconnected
                                    ? 'bg-error'
                                    : 'bg-primary'
                                }`}
                                style={{
                                  width: `${(candidate.currentQuestion / candidate.totalQuestions) * 100}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* 4. Countdown Timer */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isCompleted ? (
                            <span className="font-mono text-xs font-semibold text-on-surface-variant">
                              --:--
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Icon
                                name="timer"
                                className={`text-sm ${
                                  isTimeCritical ? 'text-error animate-ping' : 'text-outline'
                                }`}
                              />
                              <span
                                className={`font-mono text-xs font-bold ${
                                  isTimeCritical
                                    ? 'text-error font-extrabold'
                                    : 'text-on-surface'
                                }`}
                              >
                                {formatTimer(candidate.remainingSeconds)}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 5. Mic & Network Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {/* Mic Status */}
                            {candidate.micStatus === 'SPEAKING' ? (
                              <div
                                title="Đang phát biểu qua micro"
                                className="inline-flex items-center gap-1 rounded-md bg-secondary-fixed/50 px-2 py-0.5 text-[11px] font-bold text-secondary"
                              >
                                <Icon name="mic" className="text-xs" />
                                <span className="flex items-center gap-0.5">
                                  <span className="h-2 w-0.5 animate-pulse bg-secondary"></span>
                                  <span className="h-3 w-0.5 animate-pulse bg-secondary"></span>
                                  <span className="h-1.5 w-0.5 animate-pulse bg-secondary"></span>
                                </span>
                              </div>
                            ) : candidate.micStatus === 'SILENT' ? (
                              <div
                                title="Micro đang im lặng"
                                className="inline-flex items-center gap-1 rounded-md bg-surface-container px-2 py-0.5 text-[11px] text-on-surface-variant"
                              >
                                <Icon name="mic_none" className="text-xs" />
                                <span>Im lặng</span>
                              </div>
                            ) : (
                              <div
                                title="Micro đã tắt"
                                className="inline-flex items-center gap-1 rounded-md bg-surface-container px-2 py-0.5 text-[11px] text-outline"
                              >
                                <Icon name="mic_off" className="text-xs" />
                                <span>Tắt</span>
                              </div>
                            )}

                            {/* Network Ping */}
                            {candidate.networkStatus === 'EXCELLENT' ? (
                              <span
                                title={`Tín hiệu mạng tuyệt vời: ${candidate.pingMs}ms`}
                                className="flex items-center gap-1 text-[11px] font-semibold text-secondary"
                              >
                                <span className="h-2 w-2 rounded-full bg-secondary"></span>
                                {candidate.pingMs}ms
                              </span>
                            ) : candidate.networkStatus === 'GOOD' ? (
                              <span
                                title={`Tín hiệu mạng tốt: ${candidate.pingMs}ms`}
                                className="flex items-center gap-1 text-[11px] font-semibold text-primary"
                              >
                                <span className="h-2 w-2 rounded-full bg-primary"></span>
                                {candidate.pingMs}ms
                              </span>
                            ) : candidate.networkStatus === 'POOR' ? (
                              <span
                                title={`Tín hiệu mạng chập chờn: ${candidate.pingMs}ms`}
                                className="flex items-center gap-1 text-[11px] font-semibold text-tertiary"
                              >
                                <span className="h-2 w-2 rounded-full bg-tertiary"></span>
                                {candidate.pingMs}ms
                              </span>
                            ) : (
                              <span
                                title="Mất kết nối với máy chủ"
                                className="flex items-center gap-1 text-[11px] font-bold text-error animate-pulse"
                              >
                                <span className="h-2 w-2 rounded-full bg-error"></span>
                                Offline
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setInspectingCandidate(candidate)}
                              className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/60 bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-on-surface hover:bg-surface-container"
                            >
                              <Icon name="search" className="text-xs text-primary" />
                              Soi phòng
                            </button>

                            {isDisconnected ? (
                              <button
                                type="button"
                                onClick={() => handleInterveneCandidate(candidate)}
                                title="Khôi phục kết nối khẩn cấp"
                                className="inline-flex items-center gap-1 rounded-lg bg-error px-2 py-1 text-xs font-bold text-on-error hover:bg-error/90"
                              >
                                <Icon name="restart_alt" className="text-xs" />
                                Cấp lại
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSendReminder(candidate)}
                                title="Gửi nhắc nhở thí sinh"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-outline hover:bg-surface-container hover:text-on-surface"
                              >
                                <Icon name="notification_important" className="text-sm" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Inspector Modal */}
        {inspectingCandidate && (
          <Modal
            title={`Giám sát phòng thi: ${inspectingCandidate.fullName} (${inspectingCandidate.studentId})`}
            onClose={() => setInspectingCandidate(null)}
          >
            <div className="space-y-4">
              {/* Top Banner inside modal */}
              <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-3">
                <div className="space-y-0.5">
                  <span className="text-xs text-on-surface-variant">Thiết bị & Nền tảng:</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
                    <Icon
                      name={inspectingCandidate.platform === 'WEB' ? 'laptop' : 'smartphone'}
                      className="text-base text-primary"
                    />
                    {inspectingCandidate.clientDetails}
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="text-xs text-on-surface-variant">Thời gian còn lại:</span>
                  <div className="font-mono text-sm font-bold text-primary">
                    {formatTimer(inspectingCandidate.remainingSeconds)}
                  </div>
                </div>
              </div>

              {/* Current Question Box */}
              <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-primary">
                    Câu hỏi đang tương tác (Câu {inspectingCandidate.currentQuestion}/{inspectingCandidate.totalQuestions})
                  </span>
                  <span className="rounded bg-surface-container px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                    {inspectingCandidate.currentPhase}
                  </span>
                </div>
                <p className="text-xs font-medium text-on-surface leading-relaxed">
                  {inspectingCandidate.currentQuestionText}
                </p>
              </div>

              {/* Live Audio Transcript Preview */}
              <div className="rounded-xl border border-secondary/30 bg-surface-container-low p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-secondary">
                    <Icon name="record_voice_over" className="text-sm animate-pulse" />
                    Trực tiếp âm thanh & Transcript (STT)
                  </span>
                  <span className="text-[10px] text-outline">Realtime Stream</span>
                </div>
                <div className="rounded-lg bg-surface-container-lowest p-3 font-mono text-xs text-on-surface leading-relaxed border border-outline-variant/30">
                  {inspectingCandidate.lastTranscript || 'Chưa ghi nhận tín hiệu âm thanh gần đây...'}
                </div>
              </div>

              {/* Technical Diagnostics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-surface-container-low p-2.5">
                  <span className="text-on-surface-variant block text-[10px]">Độ trễ WebSocket:</span>
                  <span className="font-bold text-secondary">{inspectingCandidate.pingMs} ms</span>
                </div>
                <div className="rounded-lg bg-surface-container-low p-2.5">
                  <span className="text-on-surface-variant block text-[10px]">Trạng thái Microphone:</span>
                  <span className="font-bold text-on-surface capitalize">
                    {inspectingCandidate.micStatus.toLowerCase()}
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/20 pt-4">
                <button
                  type="button"
                  onClick={() => handleSendReminder(inspectingCandidate)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant/60 bg-surface-container px-3.5 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
                >
                  <Icon name="campaign" className="text-base text-tertiary" />
                  Gửi nhắc nhở
                </button>

                <div className="flex items-center gap-2">
                  {inspectingCandidate.currentPhase === 'DISCONNECTED' && (
                    <button
                      type="button"
                      onClick={() => handleInterveneCandidate(inspectingCandidate)}
                      className="rounded-xl bg-error px-4 py-2 text-xs font-bold text-on-error hover:bg-error/90"
                    >
                      Khôi phục kết nối
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setInspectingCandidate(null)}
                    className="rounded-xl bg-primary-container px-5 py-2 text-xs font-semibold text-on-primary hover:bg-primary"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </LecturerLayout>
  )
}
