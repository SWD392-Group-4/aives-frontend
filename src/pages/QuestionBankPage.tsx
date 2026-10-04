import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import Navbar from '../components/Navbar'
import { useLanguage } from '../hooks/useLanguage'
import { contentService } from '../services/contentService'
import { BloomLevel, Lesson, Question, QuestionStatus, Rubric, Topic } from '../types'
import { formatDateTime } from '../utils/dateTime'

export default function QuestionBankPage() {
  const { t, locale } = useLanguage()

  const [lessons, setLessons] = useState<Lesson[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string>('ALL')
  const [selectedBloom, setSelectedBloom] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)

  // Modal tạo câu hỏi thủ công
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [newTopicId, setNewTopicId] = useState('')
  const [newRubricId, setNewRubricId] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newBloom, setNewBloom] = useState<BloomLevel>('UNDERSTAND')
  const [newModelAnswer, setNewModelAnswer] = useState('')
  const [newKeywords, setNewKeywords] = useState('')

  // Modal AI sinh câu hỏi (RAG)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiTopicId, setAiTopicId] = useState('')
  const [aiBloom, setAiBloom] = useState<BloomLevel>('ANALYZE')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiCount, setAiCount] = useState(2)
  const [aiGenerating, setAiGenerating] = useState(false)

  // Thông báo
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadData = async () => {
    try {
      const [l, top, r, q] = await Promise.all([
        contentService.getLessons(),
        contentService.getTopics(),
        contentService.getRubrics(),
        contentService.getQuestions(),
      ])
      setLessons(l)
      setTopics(top)
      setRubrics(r)
      setQuestions(q)
      if (top.length > 0) {
        setNewTopicId(top[0].id)
        setAiTopicId(top[0].id)
      }
      if (r.length > 0) {
        setNewRubricId(r[0].id)
      }
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Lỗi tải dữ liệu ngân hàng câu hỏi' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Lọc câu hỏi
  const filteredQuestions = questions.filter((q) => {
    if (selectedTopicId !== 'ALL' && q.topicId !== selectedTopicId) return false
    if (selectedBloom !== 'ALL' && q.bloomLevel !== selectedBloom) return false
    if (selectedStatus !== 'ALL' && q.status !== selectedStatus) return false
    return true
  })

  // Duyệt hoặc từ chối câu hỏi
  const handleUpdateStatus = async (id: string, status: QuestionStatus, rubricId?: string) => {
    try {
      const updated = await contentService.updateQuestionStatus(id, status, rubricId)
      setQuestions((prev) => prev.map((item) => (item.id === id ? updated : item)))
      setBanner({
        type: 'success',
        message: status === 'APPROVED' ? 'Đã phê duyệt câu hỏi thành công!' : 'Đã cập nhật trạng thái câu hỏi.',
      })
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message })
    }
  }

  // Tạo câu hỏi thủ công
  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContent.trim()) return

    try {
      const created = await contentService.createQuestion({
        topicId: newTopicId,
        rubricId: newRubricId || undefined,
        content: newContent,
        bloomLevel: newBloom,
        modelAnswer: newModelAnswer,
        expectedKeywords: newKeywords ? newKeywords.split(',').map((s) => s.trim()) : [],
        source: 'MANUAL',
        status: newRubricId ? 'APPROVED' : 'DRAFT',
      })
      setQuestions((prev) => [created, ...prev])
      setManualModalOpen(false)
      setNewContent('')
      setNewModelAnswer('')
      setNewKeywords('')
      setBanner({ type: 'success', message: 'Tạo câu hỏi mới thành công!' })
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message })
    }
  }

  // Gọi AI sinh câu hỏi (RAG)
  const handleGenerateAi = async () => {
    if (!aiPrompt.trim()) {
      alert('Vui lòng nhập chủ đề / từ khóa để AI tham chiếu.')
      return
    }

    setAiGenerating(true)
    try {
      const generated = await contentService.generateAiQuestions({
        topicId: aiTopicId,
        promptKeywords: aiPrompt,
        bloomLevel: aiBloom,
        count: aiCount,
      })
      setQuestions((prev) => [...generated, ...prev])
      setAiModalOpen(false)
      setAiPrompt('')
      setBanner({
        type: 'success',
        message: `AI đã sinh ${generated.length} câu hỏi dự thảo (DRAFT). Vui lòng rà soát và gán Rubric trước khi duyệt!`,
      })
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message })
    } finally {
      setAiGenerating(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/40 pb-6">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Ngân hàng Câu hỏi & Thẩm định AI (RAG)</h1>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Quản lý học liệu, câu hỏi theo thang Bloom và thẩm định câu hỏi AI sinh ra (Workflow 1).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/lecturer/rubrics"
              className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container px-4 py-2 text-label-md font-semibold text-primary hover:bg-surface-container-high transition-colors"
            >
              <Icon name="rule" />
              <span>Quản lý Rubric</span>
            </Link>

            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-track-blue-from to-track-blue-to px-5 py-2.5 text-label-md font-semibold text-on-primary shadow-md hover:opacity-95 transition-opacity"
            >
              <Icon name="auto_awesome" />
              <span>AI sinh câu hỏi (RAG)</span>
            </button>

            <button
              type="button"
              onClick={() => setManualModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-primary-container px-5 py-2.5 text-label-md font-semibold text-on-primary shadow-md hover:bg-primary transition-colors"
            >
              <Icon name="add" />
              <span>Tạo câu hỏi</span>
            </button>
          </div>
        </div>

        {/* Thông báo banner */}
        {banner && (
          <div
            className={`mt-6 flex items-center justify-between rounded-2xl p-4 ${
              banner.type === 'success'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-error-container text-on-error-container'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon name={banner.type === 'success' ? 'check_circle' : 'error'} />
              <span>{banner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="text-label-sm font-bold hover:underline"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Bộ lọc câu hỏi */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-surface-container-lowest p-4 sm:p-6 border border-outline-variant/30 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-label-xs font-semibold text-outline uppercase mb-1">Chủ đề:</label>
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1.5 text-body-sm text-on-surface focus:outline-none"
              >
                <option value="ALL">Tất cả chủ đề ({topics.length})</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-label-xs font-semibold text-outline uppercase mb-1">Mức độ Bloom:</label>
              <select
                value={selectedBloom}
                onChange={(e) => setSelectedBloom(e.target.value)}
                className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1.5 text-body-sm text-on-surface focus:outline-none"
              >
                <option value="ALL">Tất cả mức độ</option>
                <option value="REMEMBER">Remember (Nhớ)</option>
                <option value="UNDERSTAND">Understand (Hiểu)</option>
                <option value="APPLY">Apply (Vận dụng)</option>
                <option value="ANALYZE">Analyze (Phân tích)</option>
              </select>
            </div>

            <div>
              <label className="block text-label-xs font-semibold text-outline uppercase mb-1">Trạng thái:</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1.5 text-body-sm text-on-surface focus:outline-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="APPROVED">Approved (Đã duyệt)</option>
                <option value="DRAFT">Draft (Dự thảo)</option>
                <option value="REJECTED">Rejected (Từ chối)</option>
              </select>
            </div>
          </div>

          <div className="text-body-sm text-outline">
            Hiển thị <span className="font-bold text-on-surface">{filteredQuestions.length}</span> câu hỏi
          </div>
        </div>

        {/* Danh sách thẻ câu hỏi */}
        <div className="mt-6 space-y-4">
          {filteredQuestions.map((q) => {
            const isApproved = q.status === 'APPROVED'
            const isDraft = q.status === 'DRAFT'
            const isAi = q.source === 'AI_GENERATED'

            return (
              <div
                key={q.id}
                className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-outline-variant/30 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-label-xs font-mono font-bold text-primary">{q.id}</span>
                    <span className="rounded-full bg-surface-container px-3 py-0.5 text-label-xs font-semibold text-on-surface">
                      {q.topicName || 'Chủ đề môn học'}
                    </span>
                    <span className="rounded-full bg-primary-fixed px-3 py-0.5 text-label-xs font-bold text-primary">
                      Bloom: {q.bloomLevel}
                    </span>
                    {isAi && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-track-blue-from/20 to-track-blue-to/20 px-2.5 py-0.5 text-label-xs font-semibold text-primary">
                        <Icon name="auto_awesome" className="text-xs" />
                        AI sinh (RAG)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-label-xs font-bold ${
                        isApproved
                          ? 'bg-secondary-container text-secondary'
                          : isDraft
                            ? 'bg-tertiary-fixed text-tertiary'
                            : 'bg-error-container text-error'
                      }`}
                    >
                      {q.status}
                    </span>

                    {/* Nút duyệt nhanh cho giảng viên (BR-BANK-002) */}
                    {isDraft && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(q.id, 'APPROVED', q.rubricId || rubrics[0]?.id)}
                          className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-3 py-1 text-label-xs font-semibold text-secondary hover:bg-secondary-fixed transition-colors"
                        >
                          <Icon name="check" className="text-xs" />
                          <span>Duyệt câu</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(q.id, 'REJECTED')}
                          className="inline-flex items-center gap-1 rounded-full bg-error-container px-3 py-1 text-label-xs font-semibold text-error hover:bg-error/20 transition-colors"
                        >
                          <Icon name="close" className="text-xs" />
                          <span>Từ chối</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Nội dung câu hỏi */}
                <h3 className="mt-4 text-headline-xs font-bold text-on-surface leading-snug">{q.content}</h3>

                {/* Model answer & keywords */}
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-body-sm">
                  {q.modelAnswer && (
                    <div className="rounded-2xl bg-surface-container p-3.5">
                      <span className="text-label-xs font-semibold uppercase text-outline block mb-1">
                        Ý chính cần đạt (Model Answer):
                      </span>
                      <p className="text-on-surface">{q.modelAnswer}</p>
                    </div>
                  )}

                  <div className="rounded-2xl bg-surface-container p-3.5 flex flex-col justify-between">
                    <div>
                      <span className="text-label-xs font-semibold uppercase text-outline block mb-1">
                        Rubric chấm điểm gắn kèm (BR-BANK-001):
                      </span>
                      <p className="font-semibold text-primary">
                        {q.rubricName || (
                          <span className="text-tertiary italic">Chưa gán Rubric (Bắt buộc trước khi duyệt)</span>
                        )}
                      </p>
                    </div>

                    {q.expectedKeywords && q.expectedKeywords.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {q.expectedKeywords.map((kw, i) => (
                          <span key={i} className="rounded-md bg-surface-container-highest px-2 py-0.5 text-label-xs text-on-surface-variant">
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Modal tạo câu hỏi thủ công */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-surface-container-lowest p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
              <h3 className="text-headline-xs font-bold text-on-surface flex items-center gap-2">
                <Icon name="add_circle" className="text-primary" /> Soạn câu hỏi vấn đáp mới
              </h3>
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="rounded-full p-1.5 text-outline hover:bg-surface-container"
              >
                <Icon name="close" />
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-label-sm font-semibold text-on-surface mb-1">Chủ đề:</label>
                  <select
                    value={newTopicId}
                    onChange={(e) => setNewTopicId(e.target.value)}
                    className="w-full rounded-2xl border border-outline-variant bg-surface-container-low p-3 text-body-sm text-on-surface"
                  >
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-label-sm font-semibold text-on-surface mb-1">Mức độ Bloom:</label>
                  <select
                    value={newBloom}
                    onChange={(e) => setNewBloom(e.target.value as BloomLevel)}
                    className="w-full rounded-2xl border border-outline-variant bg-surface-container-low p-3 text-body-sm text-on-surface"
                  >
                    <option value="REMEMBER">Remember (Nhớ)</option>
                    <option value="UNDERSTAND">Understand (Hiểu)</option>
                    <option value="APPLY">Apply (Vận dụng)</option>
                    <option value="ANALYZE">Analyze (Phân tích)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-label-sm font-semibold text-on-surface mb-1">
                  Rubric chấm điểm (Bắt buộc theo BR-BANK-001):
                </label>
                <select
                  value={newRubricId}
                  onChange={(e) => setNewRubricId(e.target.value)}
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low p-3 text-body-sm text-on-surface"
                >
                  <option value="">-- Chọn Rubric chấm điểm --</option>
                  {rubrics.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Tối đa {r.maxScore}đ)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-label-sm font-semibold text-on-surface mb-1">Nội dung câu hỏi:</label>
                <textarea
                  rows={3}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Nhập câu hỏi vấn đáp cho sinh viên..."
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low p-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-label-sm font-semibold text-on-surface mb-1">Ý chính cần trả lời (Model Answer):</label>
                <textarea
                  rows={2}
                  value={newModelAnswer}
                  onChange={(e) => setNewModelAnswer(e.target.value)}
                  placeholder="Các luận điểm cốt lõi để làm cơ sở cho AI chấm điểm..."
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low p-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-label-sm font-semibold text-on-surface mb-1">Từ khóa mong đợi (cách nhau bởi dấu phẩy):</label>
                <input
                  type="text"
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  placeholder="Ví dụ: ACID, Saga, Dead Letter Queue, 2PC"
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low p-3 text-body-sm text-on-surface"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="rounded-full px-5 py-2 text-label-md text-on-surface-variant hover:bg-surface-container"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-primary-container px-6 py-2.5 text-label-md font-semibold text-on-primary hover:bg-primary shadow-md"
                >
                  Tạo câu hỏi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal AI sinh câu hỏi (RAG) */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-surface-container-lowest p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
              <h3 className="text-headline-xs font-bold text-on-surface flex items-center gap-2">
                <Icon name="auto_awesome" className="text-primary" /> AI Gợi ý sinh câu hỏi (RAG)
              </h3>
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                className="rounded-full p-1.5 text-outline hover:bg-surface-container"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-label-sm font-semibold text-on-surface mb-1">Gắn vào chủ đề:</label>
                <select
                  value={aiTopicId}
                  onChange={(e) => setAiTopicId(e.target.value)}
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low p-3 text-body-sm text-on-surface"
                >
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-label-sm font-semibold text-on-surface mb-1">Mức độ Bloom:</label>
                  <select
                    value={aiBloom}
                    onChange={(e) => setAiBloom(e.target.value as BloomLevel)}
                    className="w-full rounded-2xl border border-outline-variant bg-surface-container-low p-3 text-body-sm text-on-surface"
                  >
                    <option value="REMEMBER">Remember</option>
                    <option value="UNDERSTAND">Understand</option>
                    <option value="APPLY">Apply</option>
                    <option value="ANALYZE">Analyze</option>
                  </select>
                </div>

                <div>
                  <label className="block text-label-sm font-semibold text-on-surface mb-1">Số lượng câu:</label>
                  <select
                    value={aiCount}
                    onChange={(e) => setAiCount(Number(e.target.value))}
                    className="w-full rounded-2xl border border-outline-variant bg-surface-container-low p-3 text-body-sm text-on-surface"
                  >
                    <option value={1}>1 câu</option>
                    <option value={2}>2 câu</option>
                    <option value={3}>3 câu</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-label-sm font-semibold text-on-surface mb-1">
                  Trọng tâm tài liệu / Từ khóa chuyên ngành:
                </label>
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ví dụ: Distributed Locking, Redis Redlock, Cache Stampede, Dead Letter Queue"
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low p-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div className="rounded-2xl bg-surface-container p-3 text-body-xs text-on-surface-variant">
                <Icon name="info" className="text-primary mr-1 inline" />
                Câu hỏi sinh ra sẽ mang trạng thái <strong>DRAFT</strong> (BR-BANK-002). Bạn có thể xem trước, chỉnh sửa
                và gán Rubric trước khi đưa vào ca thi chính thức.
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                className="rounded-full px-5 py-2 text-label-md text-on-surface-variant hover:bg-surface-container"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleGenerateAi}
                disabled={aiGenerating}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-track-blue-from to-track-blue-to px-6 py-2.5 text-label-md font-semibold text-on-primary hover:opacity-95 shadow-md"
              >
                {aiGenerating && <Icon name="progress_activity" className="animate-spin" />}
                <span>Bắt đầu sinh</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
