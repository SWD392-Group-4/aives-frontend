import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GenerateQuestionsModal from '../components/GenerateQuestionsModal'
import Icon from '../components/Icon'
import ImportContentModal from '../components/ImportContentModal'
import LecturerLayout from '../components/LecturerLayout'
import QuestionFigure from '../components/QuestionFigure'
import RubricEditorModal from '../components/RubricEditorModal'
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
  // Sinh câu hỏi AI Grounded từ Slide RAG
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  // Chỉnh sửa tiêu chí & trọng số Rubric (BR-BANK-001)
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null)

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

  // Duyệt hoặc từ chối câu hỏi (Kiểm tra ràng buộc BR-BANK-001)
  const handleUpdateStatus = async (id: string, status: QuestionStatus, rubricId?: string) => {
    if (status === 'APPROVED') {
      const question = questions.find((q) => q.id === id)
      const activeRubricId = rubricId || question?.rubricId || rubricChoices[id]

      if (!activeRubricId) {
        setBanner({
          type: 'error',
          message: 'CẤM PHÊ DUYỆT (BR-BANK-001): Câu hỏi chưa được liên kết với Rubric nào (rubric_id IS NULL). Vui lòng chọn hoặc gán Rubric trước khi duyệt.',
        })
        return
      }

      const rubric = rubrics.find((r) => r.id === activeRubricId)
      if (rubric) {
        const totalWeight = rubric.criteria.reduce(
          (sum, c) => sum + (Number(c.weightPercent) || 0),
          0
        )
        if (Math.round(totalWeight) !== 100) {
          setBanner({
            type: 'error',
            message: `CẤM PHÊ DUYỆT (BR-BANK-001): Rubric "${rubric.name}" chưa hoàn chỉnh (tổng trọng số các tiêu chí = ${totalWeight}% ≠ 100%). Vui lòng bấm "Sửa Rubric" để điều chỉnh đạt đúng 100% trước khi duyệt.`,
          })
          return
        }
      }
    }

    try {
      const updated = await contentService.updateQuestionStatus(id, status, rubricId || undefined)
      setQuestions((prev) => prev.map((item) => (item.id === id ? updated : item)))
      setBanner({
        type: 'success',
        message:
          status === 'APPROVED'
            ? 'Đã phê duyệt câu hỏi thành công (Đạt chuẩn 100% Rubric BR-BANK-001)!'
            : 'Đã cập nhật trạng thái câu hỏi.',
      })
    } catch (err: any) {
      if (id.startsWith('q-rag-') || id.startsWith('mock-')) {
        setQuestions((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
        setBanner({
          type: 'success',
          message: 'Đã duyệt câu hỏi nháp. (Mẹo: Bạn có thể bấm "Sinh câu hỏi AI (RAG)" để AI tự động lưu câu hỏi và rubric 100% chuẩn vào cơ sở dữ liệu).',
        })
        return
      }
      setBanner({ type: 'error', message: err.message || 'Lỗi khi cập nhật trạng thái câu hỏi' })
    }
  }

  // Duyệt lần lượt mọi câu nháp đang hiển thị (đã có rubric đạt chuẩn 100% theo BR-BANK-001)
  const handleApproveAll = async () => {
    setApprovingAll(true)
    let approved = 0
    const invalidQuestions: string[] = []

    try {
      for (const question of approvableDrafts) {
        const activeRubricId = question.rubricId || rubricChoices[question.id]
        const rubric = rubrics.find((r) => r.id === activeRubricId)

        if (!rubric) {
          invalidQuestions.push(`Câu ${question.id}: Chưa tìm thấy thông tin Rubric`)
          continue
        }

        const totalWeight = rubric.criteria.reduce(
          (sum, c) => sum + (Number(c.weightPercent) || 0),
          0
        )
        if (Math.round(totalWeight) !== 100) {
          invalidQuestions.push(
            `Câu ${question.id}: Rubric "${rubric.name}" có trọng số ${totalWeight}% ≠ 100%`
          )
          continue
        }

        try {
          const updated = await contentService.updateQuestionStatus(question.id, 'APPROVED')
          setQuestions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
          approved += 1
        } catch (err: any) {
          if (question.id.startsWith('q-rag-') || question.id.startsWith('mock-')) {
            setQuestions((prev) => prev.map((item) => (item.id === question.id ? { ...item, status: 'APPROVED' } : item)))
            approved += 1
          } else {
            throw err
          }
        }
      }

      if (invalidQuestions.length > 0) {
        setBanner({
          type: 'error',
          message: `Đã duyệt ${approved} câu hợp lệ. Có ${invalidQuestions.length} câu bị chặn duyệt theo BR-BANK-001 do Rubric chưa đạt đúng 100% trọng số.`,
        })
      } else {
        setBanner({
          type: 'success',
          message: `Đã duyệt thành công toàn bộ ${approved} câu hỏi nháp đạt chuẩn BR-BANK-001.`,
        })
      }
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: `Đã duyệt ${approved} câu, sau đó gặp lỗi: ${err.message}`,
      })
    } finally {
      setApprovingAll(false)
    }
  }

  // Khi sinh câu hỏi từ RAG hoàn tất
  const handleQuestionsGenerated = (newQuestions: Question[]) => {
    setQuestions((prev) => [...newQuestions, ...prev])
    setSelectedStatus('DRAFT')
    if (newQuestions[0]?.topicId) {
      setSelectedTopicId(newQuestions[0].topicId)
    }
    setBanner({
      type: 'success',
      message: `Đã sinh thành công ${newQuestions.length} câu hỏi Grounded AI từ Slide RAG! Toàn bộ câu hỏi đã mang trạng thái DRAFT và được thiết lập Model Rubric 100% trọng số.`,
    })
    // Tải lại danh sách rubric để đồng bộ rubric vừa tạo
    contentService.getRubrics().then(setRubrics).catch(() => {})
  }

  // Khi chỉnh sửa Rubric xong
  const handleRubricSaved = (updatedRubric: Rubric) => {
    setRubrics((prev) =>
      prev.map((r) => (r.id === updatedRubric.id ? updatedRubric : r))
    )
    setBanner({
      type: 'success',
      message: `Đã cập nhật tiêu chí và trọng số Rubric "${updatedRubric.name}" đạt chuẩn 100% (BR-BANK-001)!`,
    })
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
    <LecturerLayout breadcrumbs={[{ label: 'Ngân hàng câu hỏi' }]}>
      <div className="space-y-6">
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
              to="/lecturer/materials"
              className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container px-4 py-2 text-label-md font-semibold text-primary hover:bg-surface-container-high transition-colors"
            >
              <Icon name="slideshow" />
              <span>Quản lý Slide RAG</span>
            </Link>

            <button
              type="button"
              onClick={() => setGenerateModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-container px-5 py-2.5 text-label-md font-bold text-on-primary shadow-md hover:shadow-lg transition-all"
            >
              <Icon name="auto_awesome" />
              <span>Sinh câu hỏi AI (RAG)</span>
            </button>

            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/60 bg-surface-container-low px-5 py-2.5 text-label-md font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
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
                {q.hasFigure && <QuestionFigure questionId={q.id} />}

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

                  {(() => {
                    const activeRubricId = q.rubricId || rubricChoices[q.id]
                    const assignedRubric = rubrics.find((r) => r.id === activeRubricId)
                    const totalRubricWeight = assignedRubric
                      ? assignedRubric.criteria.reduce((sum, c) => sum + (Number(c.weightPercent) || 0), 0)
                      : 0
                    const isRubric100 = Math.round(totalRubricWeight) === 100

                    return (
                      <div className="rounded-2xl bg-surface-container p-3.5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-label-xs font-semibold uppercase text-outline">
                              Rubric chấm điểm gắn kèm (BR-BANK-001):
                            </span>
                            {assignedRubric && (
                              <button
                                type="button"
                                onClick={() => setEditingRubric(assignedRubric)}
                                className="inline-flex items-center gap-1 rounded-md bg-surface-container-high px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-surface-container-highest transition-colors"
                              >
                                <Icon name="edit" className="text-xs" />
                                <span>Sửa Rubric</span>
                              </button>
                            )}
                          </div>

                          {assignedRubric ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-xs text-primary line-clamp-1" title={assignedRubric.name}>
                                  {assignedRubric.name}
                                </p>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                                    isRubric100
                                      ? 'bg-secondary-fixed/70 text-secondary'
                                      : 'bg-error-container text-on-error-container'
                                  }`}
                                >
                                  {totalRubricWeight}% {isRubric100 ? '✓' : '(≠ 100%)'}
                                </span>
                              </div>

                              {/* Criteria breakdown with weight badges */}
                              <div className="space-y-1.5 pt-1 border-t border-outline-variant/30">
                                {assignedRubric.criteria.map((crit, cIdx) => (
                                  <div
                                    key={crit.id || cIdx}
                                    className="rounded-lg bg-surface-container-low p-2 text-xs border border-outline-variant/20"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-semibold text-on-surface line-clamp-1">
                                        {crit.name}
                                      </span>
                                      <span className="rounded bg-primary-fixed/50 px-1.5 py-0.2 text-[10px] font-mono font-bold text-primary shrink-0">
                                        {crit.weightPercent}%
                                      </span>
                                    </div>
                                    {crit.description && (
                                      <p className="mt-0.5 text-[11px] text-outline line-clamp-2">
                                        {crit.description}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-tertiary text-xs italic font-semibold">
                                Chưa gán Rubric (Bắt buộc trước khi duyệt)
                              </p>
                              {/* Câu nháp chưa có rubric: chọn rubric ở đây rồi bấm "Duyệt câu" */}
                              {isDraft && rubrics.length > 0 && (
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
                          )}
                        </div>

                        {q.expectedKeywords && q.expectedKeywords.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-outline-variant/20">
                            {q.expectedKeywords.map((kw, i) => (
                              <span key={i} className="rounded-md bg-surface-container-highest px-2 py-0.5 text-label-xs text-on-surface-variant font-mono">
                                #{kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal sinh câu hỏi Grounded AI từ Slide RAG */}
      {generateModalOpen && (
        <GenerateQuestionsModal
          topics={topics}
          defaultTopicId={selectedTopicId !== 'ALL' ? selectedTopicId : undefined}
          onClose={() => setGenerateModalOpen(false)}
          onGenerated={handleQuestionsGenerated}
        />
      )}

      {/* Modal gửi file câu hỏi thông thường */}
      {importModalOpen && (
        <ImportContentModal
          kind="questions"
          rubrics={rubrics}
          onClose={() => setImportModalOpen(false)}
          onImported={handleImported}
        />
      )}

      {/* Modal chỉnh sửa tiêu chí & trọng số Rubric (BR-BANK-001) */}
      {editingRubric && (
        <RubricEditorModal
          rubric={editingRubric}
          onClose={() => setEditingRubric(null)}
          onSaved={handleRubricSaved}
        />
      )}
    </LecturerLayout>
  )
}
