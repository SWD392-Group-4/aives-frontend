import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import ImportContentModal from '../components/ImportContentModal'
import Navbar from '../components/Navbar'
import { ContentImportResult, contentService } from '../services/contentService'
import { Question, QuestionStatus, Rubric, Topic } from '../types'

export default function QuestionBankPage() {
  const [loading, setLoading] = useState(true)
  const [topics, setTopics] = useState<Topic[]>([])
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string>('ALL')
  const [selectedBloom, setSelectedBloom] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')

  // Gửi file câu hỏi (.pdf / .docx / .txt) để AI tách thành câu hỏi nháp
  const [importModalOpen, setImportModalOpen] = useState(false)
  // Rubric giảng viên chọn cho câu nháp chưa có rubric (theo id câu hỏi)
  const [rubricChoices, setRubricChoices] = useState<Record<string, string>>({})
  const [approvingAll, setApprovingAll] = useState(false)

  // Thông báo
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadData = async () => {
    try {
      const [top, r, q] = await Promise.all([
        contentService.getTopics(),
        contentService.getRubrics(),
        contentService.getQuestions(),
      ])
      setTopics(top)
      setRubrics(r)
      setQuestions(q)
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

  // Câu nháp đang hiển thị và đã có rubric: duyệt được ngay
  const approvableDrafts = filteredQuestions.filter((q) => q.status === 'DRAFT' && q.rubricId)

  // Duyệt hoặc từ chối câu hỏi
  const handleUpdateStatus = async (id: string, status: QuestionStatus, rubricId?: string) => {
    try {
      const updated = await contentService.updateQuestionStatus(id, status, rubricId || undefined)
      setQuestions((prev) => prev.map((item) => (item.id === id ? updated : item)))
      setBanner({
        type: 'success',
        message: status === 'APPROVED' ? 'Đã phê duyệt câu hỏi thành công!' : 'Đã cập nhật trạng thái câu hỏi.',
      })
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message })
    }
  }

  // Duyệt lần lượt mọi câu nháp đang hiển thị (đã có rubric)
  const handleApproveAll = async () => {
    setApprovingAll(true)
    let approved = 0
    try {
      for (const question of approvableDrafts) {
        const updated = await contentService.updateQuestionStatus(question.id, 'APPROVED')
        setQuestions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
        approved += 1
      }
      setBanner({ type: 'success', message: `Đã duyệt ${approved} câu hỏi.` })
    } catch (err: any) {
      setBanner({ type: 'error', message: `Đã duyệt ${approved} câu, sau đó gặp lỗi: ${err.message}` })
    } finally {
      setApprovingAll(false)
    }
  }

  // AI tách xong file: tải lại dữ liệu và chuyển bộ lọc sang chủ đề vừa tạo để giảng viên xem lại
  const handleImported = async (result: ContentImportResult) => {
    setImportModalOpen(false)
    if (result.topic) setSelectedTopicId(result.topic.id)
    setSelectedBloom('ALL')
    setSelectedStatus('ALL')
    const rubricName = result.rubrics[0]?.name
    setBanner({
      type: 'success',
      message:
        `Đã tách ${result.questions.length} câu hỏi nháp từ file "${result.fileName}". ` +
        (rubricName
          ? `Các câu đã được gắn rubric "${rubricName}". Hãy xem lại rồi bấm duyệt.`
          : 'Các câu chưa có rubric: chọn rubric ở từng câu rồi bấm duyệt.'),
    })
    await loadData()
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/40 pb-6">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Ngân hàng Câu hỏi</h1>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Gửi file câu hỏi để AI tách thành câu hỏi nháp, xem lại rồi duyệt để dùng cho phiên thi.
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
              onClick={() => setImportModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-primary-container px-5 py-2.5 text-label-md font-semibold text-on-primary shadow-md hover:bg-primary transition-colors"
            >
              <Icon name="upload_file" />
              <span>Gửi file câu hỏi</span>
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
                <option value="ARCHIVED">Archived (Lưu trữ)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-body-sm text-outline">
              Hiển thị <span className="font-bold text-on-surface">{filteredQuestions.length}</span> câu hỏi
            </span>
            {approvableDrafts.length > 0 && (
              <button
                type="button"
                onClick={handleApproveAll}
                disabled={approvingAll}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-4 py-1.5 text-label-sm font-semibold text-secondary hover:bg-secondary-fixed transition-colors disabled:opacity-50"
              >
                <Icon name={approvingAll ? 'progress_activity' : 'done_all'} className={approvingAll ? 'animate-spin text-sm' : 'text-sm'} />
                <span>Duyệt {approvableDrafts.length} câu nháp đang hiển thị</span>
              </button>
            )}
          </div>
        </div>

        {/* Danh sách thẻ câu hỏi */}
        <div className="mt-6 space-y-4">
          {loading && (
            <div className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center text-body-md text-on-surface-variant">
              Đang tải ngân hàng câu hỏi...
            </div>
          )}
          {!loading && filteredQuestions.length === 0 && (
            <div className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center text-body-md text-on-surface-variant">
              {questions.length === 0
                ? 'Chưa có câu hỏi nào. Bấm "Gửi file câu hỏi" để bắt đầu.'
                : 'Không có câu hỏi nào khớp với bộ lọc.'}
            </div>
          )}
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
                        AI sinh
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
                            : q.status === 'ARCHIVED'
                              ? 'bg-surface-container-high text-on-surface-variant'
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
                          onClick={() => handleUpdateStatus(q.id, 'APPROVED', q.rubricId || rubricChoices[q.id])}
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
                      {/* Câu nháp chưa có rubric: chọn rubric ở đây rồi bấm "Duyệt câu" */}
                      {isDraft && !q.rubricId && rubrics.length > 0 && (
                        <select
                          value={rubricChoices[q.id] ?? ''}
                          onChange={(e) => setRubricChoices((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          aria-label="Chọn rubric cho câu hỏi"
                          className="mt-2 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface"
                        >
                          <option value="">-- Chọn rubric để duyệt --</option>
                          {rubrics.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      )}
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

      {importModalOpen && (
        <ImportContentModal
          kind="questions"
          rubrics={rubrics}
          onClose={() => setImportModalOpen(false)}
          onImported={handleImported}
        />
      )}
    </div>
  )
}
