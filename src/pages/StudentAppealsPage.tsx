import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import Navbar from '../components/Navbar'
import { useLanguage } from '../hooks/useLanguage'
import { gradingService } from '../services/gradingService'
import { AppealStatus, GradeAppeal } from '../types'
import { formatDateTime } from '../utils/dateTime'

// Mock appeals phong phú nếu chưa có dữ liệu từ backend
const MOCK_STUDENT_APPEALS: GradeAppeal[] = [
  {
    id: 'APP-2026-0042',
    questionGradeId: 'qg-101',
    questionText:
      'Giải thích nguyên lý Dependency Inversion Principle (DIP) và cách áp dụng trong Spring Boot thông qua Inversion of Control (IoC) Container?',
    attemptId: 'ATT-2026-001',
    examId: 'AIVES_EXAM_2026_019283',
    examTitle: 'Kiểm tra Vấn đáp Kiến trúc Phần mềm - K18',
    studentId: 'ST180293',
    studentName: 'Nguyễn Văn Sinh Viên',
    reason:
      'Trong phần trả lời vấn đáp của câu hỏi này, em đã trình bày đầy đủ cả 2 vế của nguyên lý DIP: (1) Module cấp cao không được phụ thuộc module cấp thấp, cả hai phải phụ thuộc vào Abstraction; (2) Abstraction không được phụ thuộc vào chi tiết, chi tiết phải phụ thuộc vào Abstraction. Đồng thời em đã nêu rõ ví dụ thực tế về chú thích @Autowired và Bean Lifecycle trong Spring IoC Container. Tuy nhiên điểm số ban đầu do AI gợi ý cho phần Rubric "Tính hoàn thiện giải thuật và kiến trúc" chỉ đạt 6.0/10.',
    status: 'ACCEPTED',
    scoreBefore: 6.0,
    scoreAfter: 8.5,
    maxScore: 10,
    response:
      'Giảng viên đã nghe lại audio bản ghi âm và đối soát với transcript chi tiết của lượt thi. Thí sinh đã giải thích chính xác bản chất DIP và cơ chế Dependency Injection của Spring IoC. Phần nhận diện giọng nói của AI gặp một chút nhiễu sóng âm ở đoạn giải thích ApplicationContext dẫn đến chấm sót ý. Chấp thuận tăng điểm câu này lên 8.5/10 và cập nhật lại điểm tổng kết đợt thi.',
    resolvedBy: 'LEC-001',
    resolvedByName: 'TS. Trần Anh Tuấn',
    createdAt: '2026-10-16T08:30:00Z',
    resolvedAt: '2026-10-16T15:45:00Z',
  },
  {
    id: 'APP-2026-0043',
    questionGradeId: 'qg-102',
    questionText:
      'Phân biệt sự khác nhau giữa Pessimistic Locking và Optimistic Locking trong quản lý tương tranh cơ sở dữ liệu?',
    attemptId: 'ATT-2026-002',
    examId: 'AIVES_EXAM_2026_038174',
    examTitle: 'Kiểm tra Vấn đáp Cơ sở Dữ liệu Phân tán',
    studentId: 'ST180293',
    studentName: 'Nguyễn Văn Sinh Viên',
    reason:
      'Em đã phân tích chi tiết cơ chế Versioning column (@Version trong Hibernate JPA) cho Optimistic Locking và SELECT FOR UPDATE trong Pessimistic Locking. Em kiến nghị Giảng viên xem xét lại điểm tiêu chí "Ví dụ tình huống thực tế" vì em đã đưa ra case study thực tế về xung đột đặt chỗ chuyến bay và thanh toán đồng thời.',
    status: 'PENDING',
    scoreBefore: 7.0,
    scoreAfter: undefined,
    maxScore: 10,
    response: undefined,
    resolvedBy: undefined,
    resolvedByName: undefined,
    createdAt: '2026-10-17T11:20:00Z',
    resolvedAt: undefined,
  },
  {
    id: 'APP-2026-0038',
    questionGradeId: 'qg-103',
    questionText:
      'Trình bày cách thức tối ưu hóa hiệu năng render trong React với React.memo, useMemo và useCallback?',
    attemptId: 'ATT-2026-003',
    examId: 'AIVES_EXAM_2026_048123',
    examTitle: 'Vấn đáp Lập trình Web với Framework Hiện đại',
    studentId: 'ST180293',
    studentName: 'Nguyễn Văn Sinh Viên',
    reason:
      'Em muốn khiếu nại về câu hỏi phụ (follow-up question) của AI xoáy vào việc so sánh tham chiếu (reference equality). Em cho rằng em đã nêu đúng định nghĩa shallow comparison trong React.memo và em xứng đáng nhận điểm tối đa cho câu hỏi này.',
    status: 'REJECTED',
    scoreBefore: 5.5,
    scoreAfter: 5.5,
    maxScore: 10,
    response:
      'Sau khi hội đồng giảng viên thẩm định lại audio tại mốc thời gian 03:25, thí sinh đã nhầm lẫn cơ bản giữa so sánh tham chiếu của Object và Primitive value khi truyền inline arrow function qua component con. AI đã đặt câu hỏi phụ để tạo cơ hội đính chính nhưng thí sinh vẫn khẳng định định nghĩa sai. Điểm đánh giá ban đầu 5.5/10 theo Rubric là hoàn toàn chuẩn xác và giữ nguyên.',
    resolvedBy: 'LEC-002',
    resolvedByName: 'ThS. Nguyễn Văn Hải',
    createdAt: '2026-10-13T14:10:00Z',
    resolvedAt: '2026-10-14T09:15:00Z',
  },
]

export default function StudentAppealsPage() {
  const { locale } = useLanguage()

  const [appeals, setAppeals] = useState<GradeAppeal[]>(MOCK_STUDENT_APPEALS)
  const [_loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Bộ lọc & Tìm kiếm
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | AppealStatus>('ALL')

  // Modal chi tiết đơn phúc khảo
  const [selectedAppeal, setSelectedAppeal] = useState<GradeAppeal | null>(null)

  // Tải dữ liệu từ backend
  useEffect(() => {
    gradingService
      .getMyAppeals()
      .then((data) => {
        if (data && data.length > 0) {
          setAppeals(data)
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải danh sách phúc khảo từ API, dùng dữ liệu mẫu:', err?.message)
        setErrorMsg('Đang hiển thị dữ liệu mẫu do không kết nối được máy chủ.')
      })
      .finally(() => setLoading(false))
  }, [])

  // Thống kê số lượng đơn
  const summary = useMemo(() => {
    const total = appeals.length
    const pending = appeals.filter((a) => a.status === 'PENDING').length
    const accepted = appeals.filter((a) => a.status === 'ACCEPTED').length
    const rejected = appeals.filter((a) => a.status === 'REJECTED').length
    return { total, pending, accepted, rejected }
  }, [appeals])

  // Lọc và tìm kiếm
  const filteredAppeals = useMemo(() => {
    return appeals.filter((ap) => {
      // Lọc trạng thái
      if (statusFilter !== 'ALL' && ap.status !== statusFilter) {
        return false
      }

      // Tìm kiếm theo từ khóa
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const matchTitle = (ap.examTitle || '').toLowerCase().includes(query)
        const matchCode = (ap.id || '').toLowerCase().includes(query)
        const matchQuestion = (ap.questionText || '').toLowerCase().includes(query)
        const matchReason = (ap.reason || '').toLowerCase().includes(query)
        const matchLecturer = (ap.resolvedByName || '').toLowerCase().includes(query)
        return matchTitle || matchCode || matchQuestion || matchReason || matchLecturer
      }

      return true
    })
  }, [appeals, statusFilter, searchTerm])

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <Link
            to="/student/dashboard"
            className="flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <Icon name="arrow_back" className="text-base" />
            Bảng điều khiển
          </Link>
          <span>/</span>
          <span className="text-on-surface font-semibold">Theo dõi đơn phúc khảo</span>
        </div>

        {/* Tiêu đề trang */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/30 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-tertiary-fixed text-tertiary">
                <Icon name="mark_email_unread" filled className="text-2xl" />
              </span>
              <h1 className="text-headline-md font-bold tracking-tight text-on-surface">
                Theo Dõi Đơn Phúc Khảo
              </h1>
            </div>
            <p className="mt-2 text-body-md text-on-surface-variant">
              Minh bạch tiến độ xử lý và phản hồi chính thức từ Giảng viên đối với các khiếu nại điểm số của bạn theo chuẩn quy chế khảo thí.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              to="/student/results"
              className="inline-flex items-center gap-2 rounded-full bg-primary-container px-5 py-2.5 text-label-md font-semibold text-on-primary shadow-md hover:bg-primary transition-colors"
            >
              <Icon name="add_circle" className="text-lg" />
              Xem bài thi để nộp đơn mới
            </Link>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-secondary-container/50 px-4 py-2.5 text-body-sm text-on-secondary-fixed-variant border border-secondary/20">
            <div className="flex items-center gap-2">
              <Icon name="info" className="text-lg text-secondary" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-label-xs font-bold text-secondary hover:underline"
            >
              Đóng
            </button>
          </div>
        )}

        {/* 4 Thẻ Tóm Tắt (Summary Cards) */}
        <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          {/* Card: Tổng số đơn */}
          <div className="flex flex-col justify-between rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-label-md font-medium text-on-surface-variant">Tổng số đơn</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container text-on-surface">
                <Icon name="assignment" className="text-xl" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-headline-md font-black text-on-surface font-mono">
                {summary.total}
              </span>
              <span className="text-label-xs text-outline">yêu cầu</span>
            </div>
          </div>

          {/* Card: Đang chờ duyệt (PENDING) */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`cursor-pointer flex flex-col justify-between rounded-3xl border p-5 shadow-sm transition-all ${
              statusFilter === 'PENDING'
                ? 'border-tertiary bg-tertiary-fixed/30 ring-2 ring-tertiary/20'
                : 'border-outline-variant/30 bg-surface-container-lowest hover:border-tertiary/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-label-md font-medium text-on-surface-variant">Đang chờ duyệt</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary-fixed text-tertiary">
                <Icon name="hourglass_top" filled className="text-xl" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-headline-md font-black text-tertiary font-mono">
                {summary.pending}
              </span>
              <span className="text-label-xs text-outline">đơn</span>
            </div>
          </div>

          {/* Card: Đã chấp thuận (ACCEPTED) */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'ACCEPTED' ? 'ALL' : 'ACCEPTED')}
            className={`cursor-pointer flex flex-col justify-between rounded-3xl border p-5 shadow-sm transition-all ${
              statusFilter === 'ACCEPTED'
                ? 'border-secondary bg-secondary-container/30 ring-2 ring-secondary/20'
                : 'border-outline-variant/30 bg-surface-container-lowest hover:border-secondary/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-label-md font-medium text-on-surface-variant">Đã chấp thuận</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-fixed text-secondary">
                <Icon name="check_circle" filled className="text-xl" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-headline-md font-black text-secondary font-mono">
                {summary.accepted}
              </span>
              <span className="text-label-xs text-outline">tăng điểm</span>
            </div>
          </div>

          {/* Card: Đã từ chối (REJECTED) */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'REJECTED' ? 'ALL' : 'REJECTED')}
            className={`cursor-pointer flex flex-col justify-between rounded-3xl border p-5 shadow-sm transition-all ${
              statusFilter === 'REJECTED'
                ? 'border-error bg-error-container/30 ring-2 ring-error/20'
                : 'border-outline-variant/30 bg-surface-container-lowest hover:border-error/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-label-md font-medium text-on-surface-variant">Đã từ chối</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-error-container text-error">
                <Icon name="cancel" filled className="text-xl" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-headline-md font-black text-error font-mono">
                {summary.rejected}
              </span>
              <span className="text-label-xs text-outline">giữ nguyên</span>
            </div>
          </div>
        </section>

        {/* Thanh Tìm Kiếm & Lọc Trạng Thái */}
        <section className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 max-w-md">
            <Icon
              name="search"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-outline"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo ca thi, mã đơn, câu hỏi hoặc giảng viên..."
              className="w-full rounded-full border border-outline-variant/50 bg-surface-container-lowest py-2.5 pl-11 pr-4 text-body-sm text-on-surface shadow-sm outline-none transition-all placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
              >
                <Icon name="close" className="text-base" />
              </button>
            )}
          </div>

          {/* Tabs bộ lọc trạng thái */}
          <div className="inline-flex rounded-full bg-surface-container p-1 border border-outline-variant/30">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`rounded-full px-3.5 py-1.5 text-label-xs font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Tất cả ({summary.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className={`rounded-full px-3.5 py-1.5 text-label-xs font-bold transition-all ${
                statusFilter === 'PENDING'
                  ? 'bg-surface-container-lowest text-tertiary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Chờ duyệt ({summary.pending})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACCEPTED')}
              className={`rounded-full px-3.5 py-1.5 text-label-xs font-bold transition-all ${
                statusFilter === 'ACCEPTED'
                  ? 'bg-surface-container-lowest text-secondary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Chấp thuận ({summary.accepted})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('REJECTED')}
              className={`rounded-full px-3.5 py-1.5 text-label-xs font-bold transition-all ${
                statusFilter === 'REJECTED'
                  ? 'bg-surface-container-lowest text-error shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Từ chối ({summary.rejected})
            </button>
          </div>
        </section>

        {/* Danh Sách Đơn Phúc Khảo */}
        <section className="mt-6">
          {filteredAppeals.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-outline-variant/60 bg-surface-container-lowest p-12 text-center">
              <Icon name="inbox" className="text-5xl text-outline mb-2" />
              <p className="text-body-lg font-medium text-on-surface">
                {searchTerm || statusFilter !== 'ALL'
                  ? 'Không tìm thấy đơn phúc khảo phù hợp với bộ lọc.'
                  : 'Bạn chưa có đơn phúc khảo nào.'}
              </p>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Nếu bạn cho rằng phần chấm điểm của AI chưa chính xác, hãy vào chi tiết kết quả bài thi để gửi đơn khiếu nại.
              </p>
              {(searchTerm || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('ALL')
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-surface-container px-4 py-2 text-label-sm font-bold text-primary hover:bg-surface-container-high transition-colors"
                >
                  <Icon name="refresh" className="text-base" />
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppeals.map((appeal) => {
                const isPending = appeal.status === 'PENDING'
                const isAccepted = appeal.status === 'ACCEPTED'
                const isRejected = appeal.status === 'REJECTED'

                const scoreDiff =
                  appeal.scoreAfter !== undefined ? appeal.scoreAfter - appeal.scoreBefore : 0

                return (
                  <div
                    key={appeal.id}
                    className="overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
                  >
                    {/* Header Thẻ: Mã đơn, Tên ca thi, Trạng thái */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/20 bg-surface-container/30 px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-label-sm font-bold text-primary bg-primary-fixed/60 px-3 py-1 rounded-full">
                          {appeal.id}
                        </span>
                        <span className="text-body-sm font-bold text-on-surface">
                          {appeal.examTitle || 'Ca thi vấn đáp'}
                        </span>
                        {appeal.examId && (
                          <span className="font-mono text-body-xs text-outline">
                            ({appeal.examId})
                          </span>
                        )}
                      </div>

                      {/* Trạng thái Badge chuẩn M3 */}
                      <div>
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-tertiary-fixed px-3 py-1 text-label-xs font-bold text-on-tertiary-fixed-variant">
                            <span className="h-2 w-2 rounded-full bg-tertiary animate-pulse" />
                            ĐANG CHỜ DUYỆT (PENDING)
                          </span>
                        )}
                        {isAccepted && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1 text-label-xs font-bold text-on-secondary-fixed-variant">
                            <Icon name="check_circle" className="text-sm" />
                            ĐÃ CHẤP THUẬN (+{scoreDiff > 0 ? scoreDiff.toFixed(1) : 0} điểm)
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-error-container px-3 py-1 text-label-xs font-bold text-on-error-container">
                            <Icon name="cancel" className="text-sm" />
                            ĐÃ TỪ CHỐI (GIỮ NGUYÊN ĐIỂM)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Nội dung chính: Câu hỏi, Điểm số, Lý do SV, Phản hồi GV */}
                    <div className="p-6 space-y-5">
                      {/* Câu hỏi khiếu nại */}
                      <div>
                        <div className="flex items-center gap-1 text-label-xs font-semibold text-outline uppercase tracking-wider">
                          <Icon name="help_outline" className="text-sm" />
                          Câu hỏi khiếu nại
                        </div>
                        <p className="mt-1 text-body-md font-semibold text-on-surface">
                          {appeal.questionText || 'Câu hỏi vấn đáp'}
                        </p>
                      </div>

                      {/* Khung Đối Chiếu Điểm Số & Thời gian */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-2xl bg-surface-container-low/60 p-4 border border-outline-variant/20">
                        {/* Điểm trước */}
                        <div>
                          <span className="text-label-xs text-outline block">Điểm số ban đầu</span>
                          <span className="text-title-lg font-bold text-on-surface font-mono">
                            {appeal.scoreBefore}
                            <span className="text-label-sm text-outline"> / {appeal.maxScore ?? 10}</span>
                          </span>
                        </div>

                        {/* Điểm sau điều chỉnh */}
                        <div>
                          <span className="text-label-xs text-outline block">Điểm sau phúc khảo</span>
                          {isPending ? (
                            <span className="text-label-md font-medium text-tertiary italic">
                              Đang chờ hội đồng duyệt
                            </span>
                          ) : (
                            <div className="flex items-baseline gap-2">
                              <span
                                className={`text-title-lg font-bold font-mono ${
                                  isAccepted ? 'text-secondary' : 'text-on-surface'
                                }`}
                              >
                                {appeal.scoreAfter ?? appeal.scoreBefore}
                                <span className="text-label-sm text-outline"> / {appeal.maxScore ?? 10}</span>
                              </span>
                              {isAccepted && scoreDiff > 0 && (
                                <span className="rounded-full bg-secondary-fixed px-2 py-0.5 text-label-xs font-bold text-secondary">
                                  +{scoreDiff.toFixed(1)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Thời gian gửi đơn */}
                        <div>
                          <span className="text-label-xs text-outline block">Thời gian nộp đơn</span>
                          <span className="text-body-sm font-medium text-on-surface">
                            {formatDateTime(appeal.createdAt, locale)}
                          </span>
                        </div>
                      </div>

                      {/* Lý do khiếu nại của sinh viên */}
                      <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4">
                        <div className="flex items-center gap-1.5 text-label-xs font-bold text-primary">
                          <Icon name="edit_note" className="text-base" />
                          LÝ DO KHIẾU NẠI TỪ SINH VIÊN:
                        </div>
                        <p className="mt-2 text-body-sm text-on-surface whitespace-pre-line leading-relaxed">
                          {appeal.reason}
                        </p>
                      </div>

                      {/* Phản hồi chính thức của Giảng viên (nếu đã xử lý) */}
                      {appeal.response ? (
                        <div
                          className={`rounded-2xl p-4 border ${
                            isAccepted
                              ? 'bg-secondary-container/20 border-secondary/30'
                              : 'bg-error-container/20 border-error/30'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                  isAccepted
                                    ? 'bg-secondary text-on-secondary'
                                    : 'bg-error text-on-error'
                                }`}
                              >
                                <Icon name="gavel" className="text-sm" />
                              </span>
                              <span className="text-label-sm font-bold text-on-surface">
                                GIẢI TRÌNH CHÍNH THỨC CỦA GIẢNG VIÊN
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-label-xs text-outline">
                              <span>GV: <strong className="text-on-surface">{appeal.resolvedByName || 'Hội đồng Khảo thí'}</strong></span>
                              {appeal.resolvedAt && (
                                <span>• Duyệt lúc: {formatDateTime(appeal.resolvedAt, locale)}</span>
                              )}
                            </div>
                          </div>

                          <p className="mt-3 text-body-sm text-on-surface whitespace-pre-line leading-relaxed font-normal">
                            {appeal.response}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-2xl bg-surface-container px-4 py-3 text-body-xs text-on-surface-variant">
                          <Icon name="info" className="text-base text-tertiary" />
                          <span>
                            Đơn đang được Giảng viên phụ trách xem xét lại đoạn ghi âm phỏng vấn và tiêu chí Rubric. Bạn sẽ nhận được thông báo ngay khi có kết quả.
                          </span>
                        </div>
                      )}

                      {/* Footer Thao tác: Xem chi tiết & Xem bài thi */}
                      <div className="flex items-center justify-between border-t border-outline-variant/20 pt-4">
                        <button
                          type="button"
                          onClick={() => setSelectedAppeal(appeal)}
                          className="inline-flex items-center gap-1.5 text-label-sm font-bold text-primary hover:underline"
                        >
                          <Icon name="open_in_new" className="text-base" />
                          Xem toàn văn đơn & đối chiếu
                        </button>

                        {appeal.attemptId && (
                          <Link
                            to={`/student/results/${encodeURIComponent(appeal.attemptId)}`}
                            className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-4 py-2 text-label-xs font-bold text-on-surface hover:bg-primary-fixed hover:text-primary transition-colors"
                          >
                            <Icon name="history_edu" className="text-base" />
                            Xem lại bài thi này &rarr;
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* Modal Xem Toàn Văn Chi Tiết Đơn Phúc Khảo */}
      {selectedAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-surface-container-lowest shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/30 px-6 py-4 bg-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="font-mono text-label-md font-bold text-primary bg-primary-fixed px-2.5 py-0.5 rounded-md">
                  {selectedAppeal.id}
                </span>
                <h3 className="text-title-md font-bold text-on-surface">
                  Chi Tiết Đơn Phúc Khảo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppeal(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-outline hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <Icon name="close" className="text-xl" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <span className="text-label-xs font-bold text-outline uppercase tracking-wider">
                  Ca thi / Môn học
                </span>
                <p className="text-title-sm font-bold text-on-surface">
                  {selectedAppeal.examTitle || 'Chưa rõ ca thi'}
                </p>
                {selectedAppeal.examId && (
                  <p className="font-mono text-body-xs text-outline">Mã phiên: {selectedAppeal.examId}</p>
                )}
              </div>

              <div>
                <span className="text-label-xs font-bold text-outline uppercase tracking-wider">
                  Nội dung câu hỏi
                </span>
                <div className="mt-1 rounded-2xl bg-surface-container-low p-4 text-body-md font-medium text-on-surface">
                  {selectedAppeal.questionText}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-outline-variant/30 p-3.5">
                  <span className="text-label-xs text-outline block">Điểm ban đầu</span>
                  <span className="text-title-md font-bold text-on-surface font-mono">
                    {selectedAppeal.scoreBefore} / {selectedAppeal.maxScore ?? 10}
                  </span>
                </div>
                <div className="rounded-2xl border border-outline-variant/30 p-3.5">
                  <span className="text-label-xs text-outline block">Điểm sau xử lý</span>
                  <span
                    className={`text-title-md font-bold font-mono ${
                      selectedAppeal.status === 'ACCEPTED'
                        ? 'text-secondary'
                        : selectedAppeal.status === 'PENDING'
                        ? 'text-tertiary'
                        : 'text-error'
                    }`}
                  >
                    {selectedAppeal.scoreAfter !== undefined
                      ? `${selectedAppeal.scoreAfter} / ${selectedAppeal.maxScore ?? 10}`
                      : 'Đang chờ thẩm định'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-label-xs font-bold text-primary uppercase tracking-wider block mb-1">
                  Giải trình của thí sinh
                </span>
                <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-4 text-body-sm text-on-surface leading-relaxed">
                  {selectedAppeal.reason}
                </div>
              </div>

              {selectedAppeal.response && (
                <div>
                  <span className="text-label-xs font-bold text-secondary uppercase tracking-wider block mb-1">
                    Ý kiến phản hồi từ Giảng viên
                  </span>
                  <div className="rounded-2xl bg-secondary-container/20 border border-secondary/30 p-4 text-body-sm text-on-surface leading-relaxed">
                    <p>{selectedAppeal.response}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-outline-variant/20 pt-2 text-label-xs text-outline">
                      <span>Người duyệt: {selectedAppeal.resolvedByName || 'Hội đồng môn học'}</span>
                      {selectedAppeal.resolvedAt && (
                        <span>Thời gian: {formatDateTime(selectedAppeal.resolvedAt, locale)}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-outline-variant/30 px-6 py-4 bg-surface-container-lowest">
              <button
                type="button"
                onClick={() => setSelectedAppeal(null)}
                className="rounded-full bg-surface-container px-5 py-2 text-label-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
              >
                Đóng
              </button>
              {selectedAppeal.attemptId && (
                <Link
                  to={`/student/results/${encodeURIComponent(selectedAppeal.attemptId)}`}
                  className="rounded-full bg-primary-container px-5 py-2 text-label-sm font-semibold text-on-primary hover:bg-primary transition-colors"
                >
                  Xem bài thi chi tiết
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
