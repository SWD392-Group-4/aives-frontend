import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import Navbar from '../components/Navbar'
import { gradingService } from '../services/gradingService'
import { QuestionGrade, VivaAttempt } from '../types'

export default function LecturerReviewPage() {
  const { attemptId } = useParams<{ attemptId?: string }>()

  const [attempts, setAttempts] = useState<VivaAttempt[]>([])
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(attemptId || null)
  const [currentAttempt, setCurrentAttempt] = useState<VivaAttempt | null>(null)
  const [questionGrades, setQuestionGrades] = useState<QuestionGrade[]>([])
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Điểm số và ghi chú giảng viên nhập
  const [editableScores, setEditableScores] = useState<Record<string, { finalScore: number; lecturerNote: string }>>({})
  const [publishing, setPublishing] = useState(false)
  const [loading, setLoading] = useState(true)

  // Tải danh sách lượt thi
  const loadAttempts = async () => {
    try {
      const data = await gradingService.getExamAttempts()
      setAttempts(data)
      if (!selectedAttemptId && data.length > 0) {
        setSelectedAttemptId(data[0].attemptId)
      }
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Lỗi tải danh sách lượt thi' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAttempts()
  }, [])

  // Tải chi tiết lượt thi
  useEffect(() => {
    if (!selectedAttemptId) return
    gradingService
      .getAttemptReviewDetail(selectedAttemptId)
      .then((res) => {
        setCurrentAttempt(res.attempt)
        setQuestionGrades(res.questionGrades)

        // Khởi tạo state edit
        const initialMap: Record<string, { finalScore: number; lecturerNote: string }> = {}
        res.questionGrades.forEach((qg) => {
          initialMap[qg.id] = {
            finalScore: qg.finalScore ?? qg.aiScore ?? 0,
            lecturerNote: qg.lecturerNote || '',
          }
        })
        setEditableScores(initialMap)
      })
      .catch((err) => {
        setBanner({ type: 'error', message: err.message })
      })
  }, [selectedAttemptId])

  // Lưu và duyệt điểm 1 câu (HITL - BR-GRADE-002)
  const handleSaveQuestion = async (qg: QuestionGrade) => {
    const edit = editableScores[qg.id]
    if (!edit) return

    const diff = Math.abs(edit.finalScore - (qg.aiScore || 0))
    if (diff > 2.0 && (!edit.lecturerNote || edit.lecturerNote.trim().length < 5)) {
      setBanner({
        type: 'error',
        message: 'BR-GRADE-002: Điểm sửa chênh lệch > 2.0 điểm so với gợi ý của AI. Bắt buộc nhập ghi chú giải trình!',
      })
      return
    }

    try {
      const updated = await gradingService.saveQuestionGrade(qg.id, {
        finalScore: edit.finalScore,
        lecturerNote: edit.lecturerNote,
      })
      setQuestionGrades((prev) => prev.map((item) => (item.id === qg.id ? updated : item)))
      setBanner({ type: 'success', message: 'Đã lưu và phê duyệt điểm câu hỏi thành công!' })
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message })
    }
  }

  // Công bố kết quả chính thức (BR-GRADE-003)
  const handlePublish = async () => {
    if (!selectedAttemptId) return
    setPublishing(true)
    try {
      const published = await gradingService.publishAttemptResults(selectedAttemptId)
      setCurrentAttempt(published)
      setAttempts((prev) => prev.map((a) => (a.attemptId === published.attemptId ? published : a)))
      setBanner({
        type: 'success',
        message: `Đã công bố điểm chính thức cho thí sinh! Điểm tổng kết: ${published.totalFinalScore}/10`,
      })
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/40 pb-6">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Bảng Thẩm định Điểm Giảng viên (HITL Board)</h1>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Rà soát đối chứng transcript âm thanh, kiểm tra gợi ý của AI và chốt điểm chính thức (Workflow 3).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/lecturer/appeals"
              className="inline-flex items-center gap-1.5 rounded-full border border-tertiary/40 bg-tertiary-fixed/30 px-4 py-2 text-label-md font-semibold text-tertiary hover:bg-tertiary-fixed transition-colors"
            >
              <Icon name="campaign" />
              <span>Đơn phúc khảo</span>
            </Link>

            {currentAttempt && (
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing || currentAttempt.resultStatus === 'PUBLISHED'}
                className="inline-flex items-center gap-2 rounded-full bg-secondary-container px-6 py-2.5 text-label-md font-semibold text-on-secondary-container shadow-md hover:bg-secondary-fixed transition-colors disabled:opacity-50"
              >
                <Icon name={currentAttempt.resultStatus === 'PUBLISHED' ? 'verified' : 'publish'} />
                <span>
                  {currentAttempt.resultStatus === 'PUBLISHED' ? 'Đã công bố điểm' : 'Phê duyệt & Công bố điểm'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Banner thông báo */}
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
            <button type="button" onClick={() => setBanner(null)} className="text-label-sm font-bold hover:underline">
              Đóng
            </button>
          </div>
        )}

        {/* 2 Cột: Danh sách thí sinh & Không gian thẩm định */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Cột trái: Danh sách các bài nộp (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <h2 className="text-label-lg font-bold text-on-surface mb-1 flex items-center gap-2">
              <Icon name="assignment_ind" /> Bài nộp chờ thẩm định ({attempts.length})
            </h2>

            {loading ? (
              <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 text-center text-body-sm text-on-surface-variant">
                Đang tải danh sách bài nộp...
              </div>
            ) : attempts.length === 0 ? (
              <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 text-center text-body-sm text-on-surface-variant">
                Chưa có bài thi nào nộp để thẩm định.
              </div>
            ) : (
              attempts.map((att) => {
                const isSelected = att.attemptId === selectedAttemptId
                const isPublished = att.resultStatus === 'PUBLISHED'

                return (
                  <button
                    key={att.attemptId}
                    type="button"
                    onClick={() => setSelectedAttemptId(att.attemptId)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all ${
                      isSelected
                        ? 'border-primary bg-surface-container shadow-md'
                        : 'border-outline-variant/40 bg-surface-container-lowest hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-label-xs font-mono font-bold text-primary">{att.studentId}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-label-xs font-semibold ${
                          isPublished ? 'bg-secondary-container text-secondary' : 'bg-tertiary-fixed text-tertiary'
                        }`}
                      >
                        {isPublished ? 'ĐÃ CÔNG BỐ' : 'CHỜ THẨM ĐỊNH'}
                      </span>
                    </div>

                    <h3 className="mt-2 text-label-md font-bold text-on-surface">{att.studentName}</h3>
                    <p className="text-body-xs text-on-surface-variant line-clamp-1">{att.title}</p>

                    <div className="mt-3 flex items-center justify-between border-t border-outline-variant/30 pt-2 text-label-xs">
                      <span className="text-outline">Điểm AI gợi ý:</span>
                      <span className="font-bold text-primary">{att.totalAiScore} / 10</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Cột phải: Chi tiết thẩm định từng câu hỏi (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {currentAttempt && (
              <div className="rounded-3xl bg-surface-container-lowest p-6 border border-outline-variant/40 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-label-xs font-semibold text-outline uppercase">Thí sinh đang thẩm định:</span>
                  <h3 className="text-headline-sm font-bold text-on-surface">{currentAttempt.studentName}</h3>
                  <p className="text-body-xs text-on-surface-variant">
                    Email: {currentAttempt.studentEmail} • Lượt thi: {currentAttempt.attemptId}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="block text-label-xs text-outline">Điểm AI đề xuất</span>
                    <span className="text-headline-xs font-bold text-primary">{currentAttempt.totalAiScore} / 10</span>
                  </div>
                  {currentAttempt.totalFinalScore !== undefined && (
                    <div className="text-right border-l border-outline-variant/40 pl-4">
                      <span className="block text-label-xs text-secondary font-semibold">Điểm chốt chính thức</span>
                      <span className="text-headline-sm font-black text-secondary">
                        {currentAttempt.totalFinalScore} / 10
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Danh sách từng câu hỏi để giảng viên chấm */}
            {questionGrades.map((qg, idx) => {
              const edit = editableScores[qg.id] || { finalScore: qg.aiScore || 0, lecturerNote: '' }
              const diff = Math.abs(edit.finalScore - (qg.aiScore || 0))
              const isDiffBig = diff > 2.0
              const isApproved = qg.status === 'APPROVED'

              return (
                <div
                  key={qg.id}
                  className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 sm:p-8 shadow-sm space-y-6"
                >
                  {/* Tiêu đề câu hỏi */}
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-outline-variant/30 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-fixed text-primary font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="text-label-xs font-semibold uppercase tracking-wider text-primary">
                          Mức Bloom: {qg.bloomLevel} (Hệ số {qg.weight})
                        </span>
                        <h4 className="text-headline-xs font-bold text-on-surface">{qg.questionText}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-label-xs font-bold ${
                          isApproved ? 'bg-secondary-container text-secondary' : 'bg-tertiary-fixed text-tertiary'
                        }`}
                      >
                        {isApproved ? 'ĐÃ DUYỆT' : 'AI DRAFT'}
                      </span>
                    </div>
                  </div>

                  {/* Transcript đối thoại với giám khảo AI */}
                  {qg.exchanges && qg.exchanges.length > 0 && (
                    <div>
                      <h5 className="text-label-xs font-bold text-outline uppercase tracking-wider mb-2">
                        Băng ghi âm & Transcript đối thoại:
                      </h5>
                      <div className="space-y-3">
                        {qg.exchanges.map((ex) => (
                          <div key={ex.id} className="rounded-2xl bg-surface-container-low p-4 border border-outline-variant/20">
                            <div className="flex items-center justify-between text-label-xs">
                              <span className="font-bold text-primary">
                                {ex.depth === 0 ? 'Câu hỏi chính' : `Hỏi xoáy thích ứng #${ex.depth}`}
                              </span>
                              {ex.followUpReason && (
                                <span className="rounded-md bg-tertiary-fixed/40 px-2 py-0.5 text-tertiary font-semibold">
                                  Lý do hỏi xoáy: {ex.followUpReason}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-body-sm font-semibold text-on-surface">{ex.questionText}</p>
                            <div className="mt-2 rounded-xl bg-surface-container-lowest p-3 text-body-sm italic text-on-surface-variant border-l-4 border-primary">
                              "{ex.transcript}"
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Phân tích của AI đối chiếu Rubric (BR-GRADE-001) */}
                  <div className="rounded-2xl bg-surface-container p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-label-sm font-bold text-primary uppercase flex items-center gap-1.5">
                        <Icon name="smart_toy" /> AI Scoring & Bằng chứng (BR-GRADE-001):
                      </span>
                      <span className="text-label-md font-bold text-primary">Điểm AI gợi ý: {qg.aiScore} / 10</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-sm">
                      <div className="rounded-xl bg-secondary-container/40 p-3">
                        <span className="text-label-xs font-bold text-secondary block mb-1">Điểm mạnh:</span>
                        <p>{qg.aiStrengths}</p>
                      </div>
                      <div className="rounded-xl bg-tertiary-fixed/30 p-3">
                        <span className="text-label-xs font-bold text-tertiary block mb-1">Điểm yếu / thiếu ý:</span>
                        <p>{qg.aiWeaknesses}</p>
                      </div>
                    </div>

                    {/* Tiêu chí rubric chi tiết */}
                    <div className="mt-3 space-y-2">
                      {qg.criteriaGrades.map((cg) => (
                        <div key={cg.id} className="rounded-xl bg-surface-container-lowest p-3 border border-outline-variant/30 text-body-xs">
                          <div className="flex justify-between font-semibold text-on-surface">
                            <span>{cg.criterionName} ({cg.weightPercent}%)</span>
                            <span className="text-primary">{cg.aiScore} / 10</span>
                          </div>
                          {cg.evidenceQuote && (
                            <p className="mt-1 text-outline italic">Trích dẫn: {cg.evidenceQuote}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Form thẩm định & Ghi đè điểm của Giảng viên (HITL - BR-GRADE-002) */}
                  <div className="rounded-2xl border-2 border-primary/30 bg-surface-container-lowest p-5 space-y-4">
                    <h5 className="text-label-md font-bold text-on-surface flex items-center gap-2">
                      <Icon name="edit" className="text-primary" /> Quyết định của Giảng viên (Human-in-the-Loop):
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                      <div className="sm:col-span-1">
                        <label className="block text-label-xs font-semibold text-outline uppercase mb-1">
                          Điểm chốt (Thang 10):
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          value={edit.finalScore}
                          onChange={(e) =>
                            setEditableScores({
                              ...editableScores,
                              [qg.id]: { ...edit, finalScore: Number(e.target.value) },
                            })
                          }
                          className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-2.5 text-headline-xs font-bold text-primary focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-label-xs font-semibold text-outline uppercase mb-1">
                          {isDiffBig ? (
                            <span className="text-error font-bold flex items-center gap-1">
                              <Icon name="warning" className="text-xs" /> Bắt buộc ghi chú lý do (Lệch &gt; 2.0 điểm theo BR-GRADE-002):
                            </span>
                          ) : (
                            'Ghi chú của Giảng viên (Tùy chọn):'
                          )}
                        </label>
                        <input
                          type="text"
                          required={isDiffBig}
                          value={edit.lecturerNote}
                          onChange={(e) =>
                            setEditableScores({
                              ...editableScores,
                              [qg.id]: { ...edit, lecturerNote: e.target.value },
                            })
                          }
                          placeholder={
                            isDiffBig
                              ? 'Nhập giải trình lý do điều chỉnh lệch lớn so với AI...'
                              : 'Nhập nhận xét bổ sung cho thí sinh...'
                          }
                          className={`w-full rounded-xl border p-2.5 text-body-sm text-on-surface ${
                            isDiffBig ? 'border-error bg-error-container/20' : 'border-outline-variant bg-surface-container-low'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => handleSaveQuestion(qg)}
                        className="inline-flex items-center gap-2 rounded-full bg-primary-container px-6 py-2.5 text-label-md font-semibold text-on-primary shadow-md hover:bg-primary"
                      >
                        <Icon name="check" />
                        <span>Lưu & Phê duyệt câu này</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
