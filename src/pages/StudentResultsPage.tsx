import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import Navbar from '../components/Navbar'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'
import { gradingService } from '../services/gradingService'
import { QuestionGrade, VivaAttempt } from '../types'
import { formatDateTime } from '../utils/dateTime'

export default function StudentResultsPage() {
  const { attemptId } = useParams<{ attemptId?: string }>()
  const { user } = useAuth()
  const { locale } = useLanguage()

  const [attempts, setAttempts] = useState<VivaAttempt[]>([])
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(attemptId || null)
  const [attemptDetail, setAttemptDetail] = useState<VivaAttempt | null>(null)
  const [questionGrades, setQuestionGrades] = useState<QuestionGrade[]>([])
  const [_loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal nộp đơn phúc khảo
  const [appealModalOpen, setAppealModalOpen] = useState(false)
  const [appealTargetQuestion, setAppealTargetQuestion] = useState<QuestionGrade | null>(null)
  const [appealReason, setAppealReason] = useState('')
  const [appealSubmitting, setAppealSubmitting] = useState(false)
  const [appealSuccessMsg, setAppealSuccessMsg] = useState<string | null>(null)

  // Tải danh sách bài thi đã hoàn thành của sinh viên
  useEffect(() => {
    gradingService
      .getStudentCompletedAttempts(user?.id)
      .then((data) => {
        setAttempts(data)
        if (!selectedAttemptId && data.length > 0) {
          setSelectedAttemptId(data[0].attemptId)
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user?.id, selectedAttemptId])

  // Khi chọn một lượt thi, tải chi tiết kết quả
  useEffect(() => {
    if (!selectedAttemptId) return
    setError(null)
    gradingService
      .getStudentAttemptResult(selectedAttemptId, user?.id || '')
      .then((res) => {
        setAttemptDetail(res.attempt)
        setQuestionGrades(res.questionGrades)
      })
      .catch((err) => {
        // Nếu bài thi chưa công bố
        setError(err.message)
        const found = attempts.find((a) => a.attemptId === selectedAttemptId)
        if (found) {
          setAttemptDetail(found)
        }
      })
      .finally(() => setLoading(false))
  }, [selectedAttemptId, attempts, user?.id])

  // Xử lý nộp đơn phúc khảo
  const handleOpenAppeal = (qg: QuestionGrade) => {
    setAppealTargetQuestion(qg)
    setAppealReason('')
    setAppealSuccessMsg(null)
    setAppealModalOpen(true)
  }

  const handleSubmitAppeal = async () => {
    if (!appealTargetQuestion || !selectedAttemptId) return
    if (appealReason.trim().length < 15) {
      alert('Vui lòng nêu rõ lý do phúc khảo (tối thiểu 15 ký tự).')
      return
    }

    setAppealSubmitting(true)
    try {
      await gradingService.submitAppeal({
        questionGradeId: appealTargetQuestion.id,
        attemptId: selectedAttemptId,
        reason: appealReason,
        scoreBefore: appealTargetQuestion.finalScore ?? appealTargetQuestion.aiScore ?? 0,
      })
      setAppealModalOpen(false)
      setAppealSuccessMsg(`Đã gửi đơn phúc khảo cho câu hỏi thành công! Giảng viên sẽ xem xét phản hồi.`)
    } catch (err: any) {
      alert(err.message || 'Lỗi gửi đơn phúc khảo')
    } finally {
      setAppealSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* Tiêu đề trang */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/40 pb-6">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Kết quả & Báo cáo Vấn đáp (AIVES)</h1>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Xem bảng điểm chi tiết, nhận xét từ Giám khảo AI và quyết định công bố của Giảng viên (HITL).
            </p>
          </div>

          <Link
            to="/exam/join"
            className="inline-flex items-center gap-2 rounded-full bg-primary-container px-5 py-2.5 text-label-md font-semibold text-on-primary shadow-md hover:bg-primary transition-colors"
          >
            <Icon name="tag" />
            <span>Vào thi ca mới</span>
          </Link>
        </div>

        {appealSuccessMsg && (
          <div className="mt-6 flex items-center justify-between rounded-2xl bg-secondary-container p-4 text-on-secondary-container">
            <div className="flex items-center gap-2">
              <Icon name="check_circle" className="text-secondary text-xl" />
              <span>{appealSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setAppealSuccessMsg(null)}
              className="text-label-sm font-bold text-secondary hover:underline"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Layout 2 cột: Danh sách bài thi & Chi tiết kết quả */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Cột trái: Danh sách các bài thi (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <h2 className="text-label-lg font-bold text-on-surface mb-1 flex items-center gap-2">
              <Icon name="history" /> Lịch sử ca thi ({attempts.length})
            </h2>

            {attempts.map((att) => {
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
                    <span className="text-label-xs font-mono font-semibold text-primary">{att.attemptId}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-xs font-semibold ${
                        isPublished
                          ? 'bg-secondary-container text-secondary'
                          : 'bg-tertiary-fixed text-tertiary'
                      }`}
                    >
                      <Icon name={isPublished ? 'check_circle' : 'hourglass_empty'} className="text-xs" />
                      {isPublished ? 'Đã công bố' : 'Chờ duyệt'}
                    </span>
                  </div>

                  <h3 className="mt-2 text-label-md font-bold text-on-surface line-clamp-1">{att.title}</h3>
                  <p className="mt-1 text-body-xs text-on-surface-variant">
                    Nộp: {formatDateTime(att.completedAt || att.startedAt, locale)}
                  </p>

                  {isPublished && att.totalFinalScore !== undefined && (
                    <div className="mt-3 flex items-center justify-between border-t border-outline-variant/30 pt-2">
                      <span className="text-label-sm text-on-surface-variant">Điểm tổng kết:</span>
                      <span className="text-headline-xs font-bold text-primary">{att.totalFinalScore} / 10</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Cột phải: Chi tiết bài thi đang chọn (8 cols) */}
          <div className="lg:col-span-8">
            {error && (
              <div className="rounded-3xl border border-tertiary-fixed bg-surface-container-lowest p-8 text-center shadow-lg">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-tertiary-fixed text-tertiary">
                  <Icon name="pending_actions" className="text-4xl" />
                </div>
                <h3 className="mt-4 text-headline-sm font-bold text-on-surface">Kết quả đang được thẩm định</h3>
                <p className="mt-2 text-body-md text-on-surface-variant max-w-lg mx-auto">
                  {error} Theo nguyên tắc bảo mật <strong>BR-GRADE-002</strong>, điểm số và nhận xét chi tiết chỉ được
                  hiển thị sau khi Giảng viên phụ trách hoàn tất rà soát và bấm công bố.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-surface-container px-4 py-2 text-label-sm text-on-surface-variant">
                  <Icon name="info" /> Vui lòng quay lại sau ít phút hoặc liên hệ Giảng viên môn học.
                </div>
              </div>
            )}

            {!error && attemptDetail && (
              <div className="flex flex-col gap-6">
                {/* Banner tổng điểm */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-primary-container p-6 sm:p-8 text-on-primary shadow-xl">
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-on-primary/20 px-3 py-1 text-label-xs font-semibold uppercase tracking-wider backdrop-blur-md">
                        <Icon name="verified" /> Kết quả chính thức
                      </span>
                      <h2 className="mt-3 text-headline-md font-bold text-on-primary">{attemptDetail.title}</h2>
                      <p className="mt-1 text-body-sm text-on-primary/80">
                        Phiên: {attemptDetail.examId} • Nộp lúc: {formatDateTime(attemptDetail.completedAt, locale)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl bg-on-primary/10 p-4 backdrop-blur-md">
                      <div className="text-right">
                        <span className="block text-label-xs text-on-primary/70">ĐIỂM TỔNG KẾT</span>
                        <span className="text-headline-lg font-black tracking-tight text-on-primary">
                          {attemptDetail.totalFinalScore ?? attemptDetail.totalAiScore}
                        </span>
                      </div>
                      <span className="text-headline-md font-bold text-on-primary/60">/ 10</span>
                    </div>
                  </div>
                </div>

                {/* Danh sách từng câu hỏi */}
                <div className="flex flex-col gap-6">
                  {questionGrades.map((qg, idx) => {
                    const finalScore = qg.finalScore ?? qg.aiScore

                    return (
                      <div
                        key={qg.id}
                        className="rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm sm:p-8"
                      >
                        {/* Header câu hỏi */}
                        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-outline-variant/30 pb-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-fixed text-primary font-bold text-label-md">
                              {idx + 1}
                            </span>
                            <div>
                              <span className="text-label-xs font-semibold uppercase tracking-wider text-primary">
                                Mức Bloom: {qg.bloomLevel} (Hệ số: {qg.weight})
                              </span>
                              <h4 className="text-headline-xs font-bold text-on-surface leading-snug">
                                {qg.questionText}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="block text-label-xs text-on-surface-variant">Điểm câu</span>
                              <span className="text-headline-sm font-bold text-primary">{finalScore} / 10</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenAppeal(qg)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-tertiary/40 bg-tertiary-fixed/30 px-3 py-1.5 text-label-xs font-semibold text-tertiary hover:bg-tertiary-fixed transition-colors"
                            >
                              <Icon name="campaign" />
                              <span>Phúc khảo</span>
                            </button>
                          </div>
                        </div>

                        {/* Nhận xét AI đối chiếu Rubric (BR-GRADE-001) */}
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="rounded-2xl bg-secondary-container/40 p-4">
                            <h5 className="flex items-center gap-2 text-label-sm font-bold text-secondary">
                              <Icon name="thumb_up" /> Điểm mạnh đã thể hiện:
                            </h5>
                            <p className="mt-2 text-body-sm text-on-surface leading-relaxed">
                              {qg.aiStrengths || 'Thí sinh trình bày đúng trọng tâm câu hỏi.'}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-tertiary-fixed/30 p-4">
                            <h5 className="flex items-center gap-2 text-label-sm font-bold text-tertiary">
                              <Icon name="lightbulb" /> Điểm cần cải thiện:
                            </h5>
                            <p className="mt-2 text-body-sm text-on-surface leading-relaxed">
                              {qg.aiWeaknesses || 'Cần bổ sung thêm ví dụ thực tế minh họa.'}
                            </p>
                          </div>
                        </div>

                        {/* Điểm chi tiết từng tiêu chí Rubric */}
                        <div className="mt-6">
                          <h5 className="text-label-sm font-bold text-on-surface uppercase tracking-wider mb-3">
                            Chi tiết đánh giá theo Rubric:
                          </h5>
                          <div className="space-y-3">
                            {qg.criteriaGrades.map((cg) => (
                              <div
                                key={cg.id}
                                className="rounded-2xl bg-surface-container p-4 border border-outline-variant/30"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-label-md font-semibold text-on-surface">
                                    {cg.criterionName}{' '}
                                    <span className="text-outline text-label-xs">({cg.weightPercent}%)</span>
                                  </span>
                                  <span className="text-label-md font-bold text-primary">
                                    {cg.finalScore ?? cg.aiScore} / 10
                                  </span>
                                </div>

                                {cg.evidenceQuote && (
                                  <div className="mt-2 rounded-xl bg-surface-container-lowest p-3 text-body-xs italic text-on-surface-variant border-l-4 border-primary">
                                    <span className="font-semibold not-italic text-outline block mb-1">
                                      Bằng chứng trích dẫn từ transcript:
                                    </span>
                                    {cg.evidenceQuote}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Ghi chú của Giảng viên (nếu có) */}
                        {qg.lecturerNote && (
                          <div className="mt-4 rounded-2xl bg-surface-container-high p-4 border border-outline-variant/40">
                            <span className="text-label-xs font-bold text-primary uppercase block mb-1">
                              Ghi chú từ Giảng viên ({qg.gradedByName || 'Giám khảo'}):
                            </span>
                            <p className="text-body-sm text-on-surface">{qg.lecturerNote}</p>
                          </div>
                        )}

                        {/* Transcript đối thoại */}
                        {qg.exchanges && qg.exchanges.length > 0 && (
                          <div className="mt-6 border-t border-outline-variant/30 pt-4">
                            <h5 className="text-label-sm font-bold text-outline uppercase tracking-wider mb-3">
                              Dòng thời gian đối thoại (Transcript):
                            </h5>
                            <div className="space-y-3">
                              {qg.exchanges.map((ex) => (
                                <div key={ex.id} className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-4">
                                  <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1.5 text-label-xs font-semibold text-primary">
                                      <Icon name={ex.depth === 0 ? 'help' : 'psychology_alt'} />
                                      {ex.depth === 0 ? 'Câu hỏi chính' : `Hỏi xoáy thích ứng #${ex.depth}`}
                                    </span>
                                    {ex.latencyMs && (
                                      <span className="text-label-xs text-outline">Độ trễ: {ex.latencyMs}ms</span>
                                    )}
                                  </div>
                                  <p className="text-body-sm font-semibold text-on-surface">{ex.questionText}</p>
                                  <div className="mt-1 rounded-lg bg-surface-container-lowest p-3 text-body-sm text-on-surface-variant italic">
                                    "{ex.transcript}"
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal nộp đơn phúc khảo */}
      {appealModalOpen && appealTargetQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-surface-container-lowest p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
              <h3 className="text-headline-xs font-bold text-on-surface flex items-center gap-2">
                <Icon name="campaign" className="text-tertiary" /> Gửi đơn phúc khảo điểm
              </h3>
              <button
                type="button"
                onClick={() => setAppealModalOpen(false)}
                className="rounded-full p-1.5 text-outline hover:bg-surface-container"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <span className="text-label-xs font-semibold text-outline">Câu hỏi:</span>
                <p className="text-body-sm font-medium text-on-surface line-clamp-2">
                  {appealTargetQuestion.questionText}
                </p>
              </div>

              <div>
                <span className="text-label-xs font-semibold text-outline">Điểm hiện tại:</span>
                <p className="text-label-lg font-bold text-primary">
                  {appealTargetQuestion.finalScore ?? appealTargetQuestion.aiScore} / 10
                </p>
              </div>

              <div>
                <label className="block text-label-sm font-semibold text-on-surface mb-1">
                  Lý do phúc khảo (Trích dẫn bằng chứng transcript hoặc giải thích):
                </label>
                <textarea
                  rows={4}
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="Ví dụ: Ở câu hỏi xoáy, em đã giải thích rõ cơ chế Dead Letter Queue nhưng điểm tiêu chí phản xạ chưa được ghi nhận thỏa đáng..."
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low p-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAppealModalOpen(false)}
                className="rounded-full px-5 py-2 text-label-md text-on-surface-variant hover:bg-surface-container"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitAppeal}
                disabled={appealSubmitting}
                className="inline-flex items-center gap-2 rounded-full bg-primary-container px-6 py-2.5 text-label-md font-semibold text-on-primary hover:bg-primary shadow-md"
              >
                {appealSubmitting && <Icon name="progress_activity" className="animate-spin" />}
                <span>Gửi đơn phúc khảo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
