import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal'
import Icon from '../components/Icon'
import Modal from '../components/Modal'
import LecturerLayout from '../components/LecturerLayout'
import TextField from '../components/TextField'
import { contentService } from '../services/contentService'
import { Lesson, Topic } from '../types'

interface LessonWithStats extends Lesson {
  topicsCount: number
  questionsCount: number
}

interface TopicWithStats extends Topic {
  bloomDistribution?: {
    remember: number
    understand: number
    apply: number
    analyze: number
  }
}

const SAMPLE_CURRICULUM_SEED = [
  {
    title: 'Bài 1: Kiến trúc Hướng đối tượng & Design Patterns',
    description: 'Nguyên lý SOLID, các mẫu thiết kế Creational, Structural và Behavioral trong phát triển phần mềm chuyên nghiệp.',
    topics: [
      {
        name: 'Creational Patterns (Factory, Abstract Factory, Singleton)',
        description: 'Mẫu khởi tạo đối tượng, kiểm soát khởi tạo instance duy nhất và trừu tượng hoá quy trình tạo lập.',
      },
      {
        name: 'Structural Patterns (Adapter, Decorator, Facade)',
        description: 'Mẫu cấu trúc ghép nối các interface không tương thích và mở rộng hành vi linh hoạt lúc runtime.',
      },
      {
        name: 'Behavioral Patterns (Observer, Strategy, Command)',
        description: 'Mẫu hành vi phân định trách nhiệm thuật toán và cơ chế Publish-Subscribe giữa các đối tượng.',
      },
    ],
  },
  {
    title: 'Bài 2: Kiến trúc Microservices & Phân Tán',
    description: 'Thiết kế hệ thống phân tán, giao tiếp đồng bộ/bất đồng bộ qua REST/gRPC/Kafka và các mẫu chịu lỗi (Fault Tolerance).',
    topics: [
      {
        name: 'Clean Architecture & Onion Architecture',
        description: 'Tách biệt Domain layer, Application use cases và Infrastructure theo quy tắc Dependency Inversion.',
      },
      {
        name: 'Giao tiếp Dịch vụ: RESTful API vs gRPC vs Message Queue',
        description: 'So sánh độ trễ, serialization (JSON vs Protobuf) và kịch bản áp dụng Event-Driven Architecture.',
      },
      {
        name: 'Resilience Patterns: Circuit Breaker, Retry & Rate Limiter',
        description: 'Thiết kế hệ thống chịu tải, ngắt mạch tự động khi dịch vụ phụ thuộc quá tải hoặc sụp đổ.',
      },
    ],
  },
  {
    title: 'Bài 3: CSDL Phân Tán & Quản Lý Transaction',
    description: 'Mô hình nhất quán dữ liệu (CAP theorem), Eventual Consistency, giao dịch phân tán 2PC và Saga Pattern.',
    topics: [
      {
        name: 'CAP Theorem, Eventual Consistency & Caching',
        description: 'Cân bằng giữa Consistency và Availability, chiến lược Cache Aside, Write-Through và Cache Invalidation.',
      },
      {
        name: 'Giao Dịch Phân Tán: Two-Phase Commit & Saga Pattern',
        description: 'Xử lý Rollback và Compensating Transactions trong môi trường phân tán nhiều database riêng biệt.',
      },
    ],
  },
  {
    title: 'Bài 4: Bảo Mật Hệ Thống & Xác Thực Phân Quyền',
    description: 'Mô hình RBAC, ABAC, chuẩn xác thực OAuth 2.0, OpenID Connect và bảo vệ API Gateway chống tấn công mạng.',
    topics: [
      {
        name: 'OAuth 2.0, OpenID Connect & Stateless JWT',
        description: 'Cơ chế uỷ quyền token, Access Token vs Refresh Token, ký số asymmetric RSA vs symmetric HMAC.',
      },
      {
        name: 'Phân Quyền RBAC/ABAC & Bảo Mật Lớp API Gateway',
        description: 'Kiểm soát truy cập theo vai trò và thuộc tính động, phòng chống tấn công OWASP Top 10.',
      },
    ],
  },
]

export default function CurriculumManagementPage() {
  const [loading, setLoading] = useState(true)
  const [lessons, setLessons] = useState<LessonWithStats[]>([])
  const [topicsMap, setTopicsMap] = useState<Record<string, TopicWithStats[]>>({})
  const [selectedLessonId, setSelectedLessonId] = useState<string>('')

  const [lessonSearch, setLessonSearch] = useState('')
  const [topicSearch, setTopicSearch] = useState('')

  // Toast / Banner
  const [banner, setBanner] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null)

  // Lesson Modals
  const [lessonModalOpen, setLessonModalOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<LessonWithStats | null>(null)
  const [lessonForm, setLessonForm] = useState({ title: '', description: '' })
  const [lessonFormError, setLessonFormError] = useState('')
  const [savingLesson, setSavingLesson] = useState(false)

  // Delete Lesson Confirm
  const [deletingLesson, setDeletingLesson] = useState<LessonWithStats | null>(null)

  // Topic Modals
  const [topicModalOpen, setTopicModalOpen] = useState(false)
  const [editingTopic, setEditingTopic] = useState<TopicWithStats | null>(null)
  const [topicForm, setTopicForm] = useState({ name: '', description: '' })
  const [topicFormError, setTopicFormError] = useState('')
  const [savingTopic, setSavingTopic] = useState(false)

  // Delete Topic Confirm
  const [deletingTopic, setDeletingTopic] = useState<TopicWithStats | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Seeding
  const [seeding, setSeeding] = useState(false)

  // Fetch Curriculum from Backend API
  const fetchCurriculum = useCallback(async () => {
    try {
      setLoading(true)
      const [backendLessons, backendTopics] = await Promise.all([
        contentService.getLessons(),
        contentService.getTopics(),
      ])

      const newTopicsMap: Record<string, TopicWithStats[]> = {}
      for (const t of backendTopics) {
        if (!newTopicsMap[t.lessonId]) {
          newTopicsMap[t.lessonId] = []
        }
        newTopicsMap[t.lessonId].push(t)
      }

      const mappedLessons: LessonWithStats[] = backendLessons.map((l) => ({
        ...l,
        topicsCount: (newTopicsMap[l.id] || []).length,
        questionsCount: l.questionCount || 0,
      }))

      setLessons(mappedLessons)
      setTopicsMap(newTopicsMap)

      setSelectedLessonId((prev) => {
        if (prev && mappedLessons.some((l) => l.id === prev)) {
          return prev
        }
        return mappedLessons.length > 0 ? mappedLessons[0].id : ''
      })
    } catch (err: any) {
      console.error('Error fetching curriculum:', err)
      setBanner({
        type: 'error',
        message: err.message || 'Không thể tải danh sách chương trình học từ server.',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCurriculum()
  }, [fetchCurriculum])

  const selectedLesson = lessons.find((l) => l.id === selectedLessonId) || lessons[0]
  const currentTopics = (selectedLesson ? topicsMap[selectedLesson.id] : []) || []

  // Filtered lists
  const filteredLessons = lessons.filter(
    (l) =>
      l.title.toLowerCase().includes(lessonSearch.toLowerCase()) ||
      (l.description && l.description.toLowerCase().includes(lessonSearch.toLowerCase())),
  )

  const filteredTopics = currentTopics.filter(
    (t) =>
      t.name.toLowerCase().includes(topicSearch.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(topicSearch.toLowerCase())),
  )

  // Lesson Handlers
  const handleOpenCreateLesson = () => {
    setEditingLesson(null)
    setLessonForm({ title: '', description: '' })
    setLessonFormError('')
    setLessonModalOpen(true)
  }

  const handleOpenEditLesson = (lesson: LessonWithStats, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingLesson(lesson)
    setLessonForm({ title: lesson.title, description: lesson.description || '' })
    setLessonFormError('')
    setLessonModalOpen(true)
  }

  const handleSaveLesson = async () => {
    if (!lessonForm.title.trim()) {
      setLessonFormError('Vui lòng nhập tiêu đề bài học')
      return
    }

    try {
      setSavingLesson(true)
      if (editingLesson) {
        const updated = await contentService.updateLesson(editingLesson.id, {
          title: lessonForm.title.trim(),
          description: lessonForm.description.trim(),
        })
        setBanner({ type: 'success', message: `Đã cập nhật bài học "${updated.title}" thành công!` })
      } else {
        const created = await contentService.createLesson({
          title: lessonForm.title.trim(),
          description: lessonForm.description.trim(),
        })
        setSelectedLessonId(created.id)
        setBanner({ type: 'success', message: `Đã tạo bài học mới "${created.title}" thành công!` })
      }
      setLessonModalOpen(false)
      await fetchCurriculum()
    } catch (err: any) {
      setLessonFormError(err.message || 'Lỗi khi lưu bài học lên máy chủ.')
    } finally {
      setSavingLesson(false)
    }
  }

  const handleDeleteLesson = async () => {
    if (!deletingLesson) return
    try {
      setDeleting(true)
      await contentService.deleteLesson(deletingLesson.id)
      setBanner({ type: 'success', message: `Đã xóa bài học "${deletingLesson.title}".` })
      setDeletingLesson(null)
      await fetchCurriculum()
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err.message || `Không thể xóa bài học "${deletingLesson.title}". Vui lòng xóa hết các chủ đề thuộc bài học trước.`,
      })
      setDeletingLesson(null)
    } finally {
      setDeleting(false)
    }
  }

  // Topic Handlers
  const handleOpenCreateTopic = () => {
    setEditingTopic(null)
    setTopicForm({ name: '', description: '' })
    setTopicFormError('')
    setTopicModalOpen(true)
  }

  const handleOpenEditTopic = (topic: TopicWithStats) => {
    setEditingTopic(topic)
    setTopicForm({ name: topic.name, description: topic.description || '' })
    setTopicFormError('')
    setTopicModalOpen(true)
  }

  const handleSaveTopic = async () => {
    if (!selectedLesson) return
    if (!topicForm.name.trim()) {
      setTopicFormError('Vui lòng nhập tên chủ đề')
      return
    }

    try {
      setSavingTopic(true)
      if (editingTopic) {
        const updated = await contentService.updateTopic(editingTopic.id, {
          name: topicForm.name.trim(),
          description: topicForm.description.trim(),
        })
        setBanner({ type: 'success', message: `Đã cập nhật chủ đề "${updated.name}" thành công!` })
      } else {
        const created = await contentService.createTopic({
          lessonId: selectedLesson.id,
          name: topicForm.name.trim(),
          description: topicForm.description.trim(),
        })
        setBanner({ type: 'success', message: `Đã thêm chủ đề "${created.name}" vào bài học!` })
      }
      setTopicModalOpen(false)
      await fetchCurriculum()
    } catch (err: any) {
      setTopicFormError(err.message || 'Lỗi khi lưu chủ đề lên máy chủ.')
    } finally {
      setSavingTopic(false)
    }
  }

  const handleDeleteTopic = async () => {
    if (!deletingTopic) return
    try {
      setDeleting(true)
      await contentService.deleteTopic(deletingTopic.id)
      setBanner({ type: 'success', message: `Đã xóa chủ đề "${deletingTopic.name}".` })
      setDeletingTopic(null)
      await fetchCurriculum()
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err.message || `Không thể xóa chủ đề "${deletingTopic.name}". Vui lòng xóa các câu hỏi thuộc chủ đề trước.`,
      })
      setDeletingTopic(null)
    } finally {
      setDeleting(false)
    }
  }

  // Khởi tạo bộ dữ liệu mẫu SWD trực tiếp qua API
  const handleSeedSampleCurriculum = async () => {
    try {
      setSeeding(true)
      for (const item of SAMPLE_CURRICULUM_SEED) {
        const createdLesson = await contentService.createLesson({
          title: item.title,
          description: item.description,
        })
        for (const topic of item.topics) {
          await contentService.createTopic({
            lessonId: createdLesson.id,
            name: topic.name,
            description: topic.description,
          })
        }
      }
      setBanner({
        type: 'success',
        message: 'Đã khởi tạo thành công chương trình môn học mẫu (4 Bài học & 10 Chủ đề) vào cơ sở dữ liệu!',
      })
      await fetchCurriculum()
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err.message || 'Lỗi khi khởi tạo chương trình môn học mẫu.',
      })
    } finally {
      setSeeding(false)
    }
  }

  // Summary counts
  const totalTopicsCount = Object.values(topicsMap).reduce((acc, list) => acc + list.length, 0)
  const totalApprovedQuestions = Object.values(topicsMap).reduce(
    (acc, list) => acc + list.reduce((sub, t) => sub + (t.approvedQuestionCount || 0), 0),
    0,
  )

  return (
    <LecturerLayout breadcrumbs={[{ label: 'Chương trình học' }]}>
      <div className="space-y-6">
        {/* Banner Notification */}
        {banner && (
          <div
            className={`mb-6 flex items-center justify-between rounded-2xl p-4 shadow-sm transition-all ${
              banner.type === 'success'
                ? 'bg-secondary-fixed/50 text-on-secondary-fixed-variant'
                : banner.type === 'error'
                  ? 'bg-error-container text-on-error-container'
                  : 'bg-primary-fixed/50 text-on-primary-fixed-variant'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon
                name={banner.type === 'success' ? 'check_circle' : banner.type === 'error' ? 'error' : 'info'}
                className="text-xl"
              />
              <span className="text-sm font-semibold">{banner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="rounded-full p-1 hover:bg-black/10"
              aria-label="Đóng"
            >
              <Icon name="close" className="text-lg" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Link to="/lecturer/dashboard" className="hover:underline">
                Bảng điều khiển
              </Link>
              <span>/</span>
              <span>Chương trình học</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
              Quản lý Chương trình học
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Cấu trúc môn học: Môn học ➔ Bài học ➔ Chủ đề ➔ Ngân hàng câu hỏi
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:self-center">
            {lessons.length === 0 && !loading && (
              <button
                type="button"
                onClick={handleSeedSampleCurriculum}
                disabled={seeding}
                className="inline-flex items-center gap-1.5 rounded-full border border-secondary/40 bg-secondary-container px-3.5 py-1.5 text-xs font-bold text-on-secondary-container hover:bg-secondary hover:text-on-secondary transition-colors disabled:opacity-60"
              >
                <Icon name={seeding ? 'hourglass_top' : 'auto_awesome'} className={seeding ? 'animate-spin text-base' : 'text-base'} />
                <span>{seeding ? 'Đang tải...' : 'Tải dữ liệu mẫu môn học'}</span>
              </button>
            )}
            <Link
              to="/lecturer/materials"
              className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-surface-container-high transition-colors"
            >
              <Icon name="folder_open" className="text-amber-600 text-base" />
              <span>Tài liệu môn học</span>
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/40 bg-surface-container-low px-3.5 py-1.5 text-xs font-semibold text-on-surface">
              <Icon name="library_books" className="text-primary text-base" />
              {lessons.length} Bài học
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/40 bg-surface-container-low px-3.5 py-1.5 text-xs font-semibold text-on-surface">
              <Icon name="topic" className="text-secondary text-base" />
              {totalTopicsCount} Chủ đề
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/40 bg-surface-container-low px-3.5 py-1.5 text-xs font-semibold text-on-surface">
              <Icon name="fact_check" className="text-tertiary text-base" />
              {totalApprovedQuestions} Câu đã duyệt
            </span>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-16 text-center shadow-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
            <p className="text-sm font-semibold text-on-surface">Đang tải cấu trúc chương trình học từ máy chủ...</p>
          </div>
        ) : lessons.length === 0 ? (
          /* Empty state */
          <div className="rounded-3xl border border-dashed border-outline-variant/80 bg-surface-container-lowest p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon name="menu_book" className="text-3xl" />
            </div>
            <h3 className="text-base font-bold text-on-surface">Chưa có bài học nào trong môn học</h3>
            <p className="mt-1 text-sm text-on-surface-variant max-w-md mx-auto">
              Hãy tạo bài học đầu tiên hoặc khởi tạo cấu trúc mẫu để bắt đầu phân loại tài liệu và câu hỏi vấn đáp.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleOpenCreateLesson}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-on-primary shadow-sm hover:bg-primary/90 transition-colors"
              >
                <Icon name="add" className="text-base" />
                <span>Thêm bài học</span>
              </button>
              <button
                type="button"
                onClick={handleSeedSampleCurriculum}
                disabled={seeding}
                className="inline-flex items-center gap-2 rounded-xl border border-secondary bg-secondary-container px-5 py-2.5 text-xs font-semibold text-on-secondary-container shadow-sm hover:bg-secondary hover:text-on-secondary transition-colors disabled:opacity-60"
              >
                <Icon name={seeding ? 'hourglass_top' : 'auto_awesome'} className={seeding ? 'animate-spin text-base' : 'text-base'} />
                <span>{seeding ? 'Đang tạo môn học mẫu...' : 'Khởi tạo cấu trúc mẫu (4 bài, 10 chủ đề)'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* 2-Column Split Layout */
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* CỘT TRÁI: DANH SÁCH BÀI HỌC - 5 Cols */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                    <Icon name="book" className="text-lg" />
                  </div>
                  <h2 className="text-base font-bold text-on-surface">Danh sách Bài học</h2>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateLesson}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary-container px-3 py-1.5 text-xs font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary"
                >
                  <Icon name="add" className="text-base" />
                  Thêm bài học
                </button>
              </div>

              {/* Lesson Search */}
              <div className="relative">
                <Icon name="search" className="pointer-events-none absolute left-3.5 top-2.5 text-lg text-outline" />
                <input
                  type="text"
                  value={lessonSearch}
                  onChange={(e) => setLessonSearch(e.target.value)}
                  placeholder="Tìm bài học..."
                  className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest py-2 pr-4 pl-10 text-xs text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
                />
              </div>

              {/* Lesson List */}
              <div className="space-y-3">
                {filteredLessons.length === 0 ? (
                  <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-8 text-center text-xs text-on-surface-variant">
                    Không tìm thấy bài học nào phù hợp.
                  </div>
                ) : (
                  filteredLessons.map((lesson, idx) => {
                    const isSelected = selectedLesson?.id === lesson.id
                    const topicsOfThis = topicsMap[lesson.id] || []

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => setSelectedLessonId(lesson.id)}
                        className={`group relative cursor-pointer rounded-2xl border p-4 transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary'
                            : 'border-outline-variant/30 bg-surface-container-lowest hover:border-outline hover:bg-surface-container-low'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-[10px] font-bold text-on-surface-variant">
                                {idx + 1}
                              </span>
                              <h3 className="text-sm font-bold text-on-surface truncate">
                                {lesson.title}
                              </h3>
                            </div>
                            {lesson.description && (
                              <p className="text-xs text-on-surface-variant line-clamp-2">
                                {lesson.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-on-surface-variant">
                              <span className="inline-flex items-center gap-1 rounded-md bg-surface-container px-2 py-0.5 font-medium">
                                <Icon name="topic" className="text-xs text-primary" />
                                {topicsOfThis.length} chủ đề
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-md bg-surface-container px-2 py-0.5 font-medium">
                                <Icon name="help_outline" className="text-xs text-secondary" />
                                {lesson.questionsCount || 0} câu hỏi
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditLesson(lesson, e)}
                              title="Sửa bài học"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-outline hover:bg-surface-container hover:text-on-surface"
                            >
                              <Icon name="edit" className="text-sm" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeletingLesson(lesson)
                              }}
                              title="Xóa bài học"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-outline hover:bg-error-container hover:text-error"
                            >
                              <Icon name="delete" className="text-sm" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* CỘT PHẢI: DANH SÁCH CHỦ ĐỀ (TOPICS) CỦA BÀI HỌC - 7 Cols */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-fixed text-secondary">
                      <Icon name="category" className="text-lg" />
                    </div>
                    <h2 className="text-base font-bold text-on-surface">
                      Chủ đề thuộc: <span className="text-primary">{selectedLesson?.title || 'Chưa chọn'}</span>
                    </h2>
                  </div>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    Các chủ đề dùng để phân loại và chọn câu hỏi cho các phiên thi vấn đáp
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateTopic}
                  disabled={!selectedLesson}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-on-secondary shadow-sm transition-colors hover:bg-secondary/90 disabled:opacity-50"
                >
                  <Icon name="add" className="text-base" />
                  Thêm chủ đề mới
                </button>
              </div>

              {/* Topic Search */}
              <div className="relative">
                <Icon name="search" className="pointer-events-none absolute left-3.5 top-2.5 text-lg text-outline" />
                <input
                  type="text"
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  placeholder="Tìm chủ đề trong bài học này..."
                  className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest py-2 pr-4 pl-10 text-xs text-on-surface placeholder:text-outline focus:border-secondary focus:outline-none"
                />
              </div>

              {/* Topic List Cards */}
              <div className="space-y-3">
                {filteredTopics.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-outline-variant/60 bg-surface-container-lowest p-10 text-center">
                    <Icon name="post_add" className="mx-auto text-3xl text-outline mb-2" />
                    <h3 className="text-sm font-bold text-on-surface">Chưa có chủ đề nào trong bài học này</h3>
                    <p className="mt-1 text-xs text-on-surface-variant max-w-sm mx-auto">
                      Mỗi bài học cần ít nhất một chủ đề để phân loại và quản lý câu hỏi đánh giá vấn đáp.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenCreateTopic}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-on-secondary shadow-sm hover:bg-secondary/90"
                    >
                      <Icon name="add" className="text-base" />
                      Thêm chủ đề đầu tiên
                    </button>
                  </div>
                ) : (
                  filteredTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm transition-all hover:border-outline-variant hover:shadow-md"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-secondary"></span>
                            <h4 className="text-sm font-bold text-on-surface">{topic.name}</h4>
                          </div>
                          {topic.description && (
                            <p className="text-xs text-on-surface-variant leading-relaxed">
                              {topic.description}
                            </p>
                          )}

                          {/* Badges & Statistics */}
                          <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px]">
                            <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-0.5 font-semibold text-on-surface">
                              <Icon name="quiz" className="text-xs text-primary" />
                              {topic.questionCount || 0} câu hỏi
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container/50 px-2.5 py-0.5 font-bold text-on-secondary-fixed-variant">
                              <Icon name="check_circle" className="text-xs text-secondary" />
                              {topic.approvedQuestionCount || 0} đã duyệt
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0">
                          {/* Link to Question Bank */}
                          <Link
                            to={`/lecturer/questions?topicId=${topic.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-primary-fixed px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary"
                          >
                            <Icon name="auto_awesome" className="text-sm" />
                            Soạn câu hỏi
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleOpenEditTopic(topic)}
                            title="Sửa chủ đề"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-outline-variant/40 text-outline hover:bg-surface-container hover:text-on-surface"
                          >
                            <Icon name="edit" className="text-sm" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingTopic(topic)}
                            title="Xóa chủ đề"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-outline-variant/40 text-outline hover:bg-error-container hover:text-error"
                          >
                            <Icon name="delete" className="text-sm" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Thêm / Sửa Bài Học */}
        {lessonModalOpen && (
          <Modal
            title={editingLesson ? 'Chỉnh sửa bài học' : 'Thêm bài học mới'}
            onClose={() => !savingLesson && setLessonModalOpen(false)}
          >
            <div className="space-y-4">
              <TextField
                id="lesson-title"
                label="Tiêu đề bài học"
                required
                icon="book"
                value={lessonForm.title}
                onChange={(e) => {
                  setLessonForm((prev) => ({ ...prev, title: e.target.value }))
                  setLessonFormError('')
                }}
                placeholder="VD: Bài 1: Thiết kế Hướng đối tượng & Design Patterns"
                error={lessonFormError}
              />

              <div className="space-y-1.5">
                <label htmlFor="lesson-desc" className="block text-label-md text-on-surface">
                  Mô tả bài học
                </label>
                <textarea
                  id="lesson-desc"
                  rows={3}
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Tóm tắt nội dung trọng tâm và kết quả học tập (CLO) của bài học..."
                  className="w-full rounded-2xl bg-surface-container-low p-3.5 text-body-md text-on-surface shadow-sm outline-none placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={savingLesson}
                  onClick={() => setLessonModalOpen(false)}
                  className="rounded-full px-5 py-2.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={savingLesson}
                  onClick={handleSaveLesson}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-6 py-2.5 text-xs font-semibold text-on-primary shadow-sm hover:bg-primary disabled:opacity-50"
                >
                  {savingLesson && <Icon name="hourglass_top" className="animate-spin text-sm" />}
                  {editingLesson ? 'Cập nhật bài học' : 'Tạo bài học'}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal Xác nhận Xóa Bài Học */}
        {deletingLesson && (
          <ConfirmModal
            title="Xóa bài học"
            message={`Bạn có chắc chắn muốn xóa bài học "${deletingLesson.title}" không? Lưu ý: Chỉ có thể xóa bài học khi bài học đó không còn chứa chủ đề nào.`}
            confirmLabel="Xác nhận xóa"
            cancelLabel="Hủy bỏ"
            pendingLabel="Đang xóa..."
            icon="delete"
            danger
            onClose={() => !deleting && setDeletingLesson(null)}
            onConfirm={handleDeleteLesson}
          />
        )}

        {/* Modal Thêm / Sửa Chủ Đề */}
        {topicModalOpen && (
          <Modal
            title={editingTopic ? 'Chỉnh sửa chủ đề' : `Thêm chủ đề vào "${selectedLesson?.title}"`}
            onClose={() => !savingTopic && setTopicModalOpen(false)}
          >
            <div className="space-y-4">
              <TextField
                id="topic-name"
                label="Tên chủ đề"
                required
                icon="topic"
                value={topicForm.name}
                onChange={(e) => {
                  setTopicForm((prev) => ({ ...prev, name: e.target.value }))
                  setTopicFormError('')
                }}
                placeholder="VD: Creational Patterns (Factory & Singleton)"
                error={topicFormError}
              />

              <div className="space-y-1.5">
                <label htmlFor="topic-desc" className="block text-label-md text-on-surface">
                  Mô tả chi tiết chủ đề
                </label>
                <textarea
                  id="topic-desc"
                  rows={3}
                  value={topicForm.description}
                  onChange={(e) => setTopicForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Mô tả phạm vi câu hỏi và các khía cạnh lý thuyết/thực hành liên quan..."
                  className="w-full rounded-2xl bg-surface-container-low p-3.5 text-body-md text-on-surface shadow-sm outline-none placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={savingTopic}
                  onClick={() => setTopicModalOpen(false)}
                  className="rounded-full px-5 py-2.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={savingTopic}
                  onClick={handleSaveTopic}
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-6 py-2.5 text-xs font-semibold text-on-secondary shadow-sm hover:bg-secondary/90 disabled:opacity-50"
                >
                  {savingTopic && <Icon name="hourglass_top" className="animate-spin text-sm" />}
                  {editingTopic ? 'Lưu thay đổi' : 'Thêm chủ đề'}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal Xác nhận Xóa Chủ Đề */}
        {deletingTopic && (
          <ConfirmModal
            title="Xóa chủ đề"
            message={`Bạn có chắc chắn muốn xóa chủ đề "${deletingTopic.name}"? Lưu ý: Chỉ có thể xóa chủ đề khi chưa có câu hỏi nào gắn vào chủ đề này.`}
            confirmLabel="Xác nhận xóa"
            cancelLabel="Hủy bỏ"
            pendingLabel="Đang xóa..."
            icon="delete"
            danger
            onClose={() => !deleting && setDeletingTopic(null)}
            onConfirm={handleDeleteTopic}
          />
        )}
      </div>
    </LecturerLayout>
  )
}
