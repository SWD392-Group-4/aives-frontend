import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import LecturerLayout from '../../components/LecturerLayout'
import { materialService } from '../materials/materialService'
import { Chapter, Material } from '../materials/types'
import { rubricService } from '../rubric/rubricService'
import GenerateQuestionModal from './GenerateQuestionModal'
import { questionService } from './questionService'
import {
  CreateChapterQuestionRequest,
  Question,
  QuestionDifficulty,
  UpdateQuestionRequest,
} from './types'

export default function ChapterQuestionBankPage() {
  const { chapterId: paramChapterId } = useParams<{ chapterId?: string }>()
  const chapterId = paramChapterId || 'CHAP_01'

  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null)
  const [courseId, setCourseId] = useState('SWD392')

  // Trạng thái Rubric môn học (BR-BANK-001)
  const [isRubricReady, setIsRubricReady] = useState(false)
  const [rubricWeight, setRubricWeight] = useState<number>(0)
  const [checkingRubric, setCheckingRubric] = useState(true)

  // Bộ lọc
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL')

  // Modals
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [rejectingQuestion, setRejectingQuestion] = useState<Question | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // Form thêm thủ công
  const [manualContent, setManualContent] = useState('')
  const [manualDifficulty, setManualDifficulty] = useState<QuestionDifficulty>('MEDIUM')
  const [manualModelAnswer, setManualModelAnswer] = useState('')
  const [manualKeywords, setManualKeywords] = useState('')

  // Banner
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)

  const loadAll = async () => {
    setLoading(true)
    setCheckingRubric(true)
    setBanner(null)

    try {
      // 1. Tải danh sách chương & học liệu
      const [matList, chapList] = await Promise.all([
        materialService.getChapterMaterials(chapterId).catch(() => []),
        materialService.getChapters(courseId).catch(() => []),
      ])
      setMaterials(matList)

      const foundChapter = chapList.find((c) => c.id === chapterId)
      const effectiveCourseId = foundChapter?.courseId || courseId
      if (foundChapter) {
        setCurrentChapter(foundChapter)
        setCourseId(effectiveCourseId)
      } else {
        setCurrentChapter({
          id: chapterId,
          courseId: effectiveCourseId,
          name: `Chương ${chapterId}`,
          orderNo: 1,
        })
      }

      // 2. Kiểm tra Rubric của môn học (BR-BANK-001)
      try {
        const rubricData = await rubricService.getCourseRubric(effectiveCourseId)
        const sum = (rubricData.criteria || []).reduce(
          (acc, c) => acc + (Number(c.weightPercent) || 0),
          0
        )
        setRubricWeight(sum)
        const ready = Math.abs(sum - 100) < 0.05 && (rubricData.criteria || []).length > 0
        setIsRubricReady(ready)
        if (!ready) {
          setBanner({
            type: 'warning',
            message: `Quy tắc BR-BANK-001: Môn học "${effectiveCourseId}" chưa có Rubric hoàn chỉnh (tổng trọng số hiện tại = ${sum.toFixed(1)}% ≠ 100%). Nút Phê duyệt câu hỏi sẽ bị vô hiệu hóa cho tới khi hoàn tất Rubric môn học.`,
          })
        }
      } catch {
        setIsRubricReady(false)
        setRubricWeight(0)
      } finally {
        setCheckingRubric(false)
      }

      // 3. Tải danh sách câu hỏi của chương
      const qData = await questionService.getChapterQuestions(
        chapterId,
        statusFilter,
        difficultyFilter
      )
      setQuestions(qData.content)
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err?.message || 'Lỗi khi tải dữ liệu ngân hàng câu hỏi.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [chapterId, statusFilter, difficultyFilter])

  // Lọc câu hỏi trên giao diện
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (statusFilter !== 'ALL' && q.status !== statusFilter) return false
      if (difficultyFilter !== 'ALL' && q.difficulty !== difficultyFilter) return false
      return true
    })
  }, [questions, statusFilter, difficultyFilter])

  // Xử lý phê duyệt (APPROVE)
  const handleApprove = async (q: Question) => {
    if (!isRubricReady) {
      setBanner({
        type: 'error',
        message: `Không thể phê duyệt (BR-BANK-001): Môn học "${courseId}" chưa có Rubric đạt 100% trọng số. Vui lòng bấm "Quản lý Rubric" để cập nhật trước.`,
      })
      return
    }

    try {
      const updated = await questionService.approveQuestion(q.id)
      setQuestions((prev) => prev.map((item) => (item.id === q.id ? updated : item)))
      setBanner({
        type: 'success',
        message: 'Đã phê duyệt câu hỏi thành công. Câu hỏi đã sẵn sàng đưa vào các ca thi chính thức!',
      })
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err?.message || 'Lỗi khi phê duyệt câu hỏi.',
      })
    }
  }

  // Xử lý từ chối (REJECT)
  const handleRejectConfirm = async () => {
    if (!rejectingQuestion) return
    try {
      const updated = await questionService.rejectQuestion(
        rejectingQuestion.id,
        rejectionReason.trim()
      )
      setQuestions((prev) => prev.map((item) => (item.id === rejectingQuestion.id ? updated : item)))
      setBanner({
        type: 'success',
        message: 'Đã từ chối câu hỏi.',
      })
      setRejectingQuestion(null)
      setRejectionReason('')
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err?.message || 'Lỗi khi từ chối câu hỏi.',
      })
    }
  }

  // Xử lý xóa câu hỏi
  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa câu hỏi này khỏi ngân hàng chung?')) return
    try {
      await questionService.deleteQuestion(id)
      setQuestions((prev) => prev.filter((item) => item.id !== id))
      setBanner({
        type: 'success',
        message: 'Đã xóa câu hỏi thành công.',
      })
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err?.message || 'Lỗi khi xóa câu hỏi.',
      })
    }
  }

  // Xử lý tạo câu hỏi thủ công
  const handleCreateManual = async () => {
    if (!manualContent.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi.')
      return
    }

    const keywords = manualKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)

    const payload: CreateChapterQuestionRequest = {
      content: manualContent.trim(),
      difficulty: manualDifficulty,
      modelAnswer: manualModelAnswer.trim() || undefined,
      expectedKeywords: keywords.length > 0 ? keywords : undefined,
    }

    try {
      const created = await questionService.createQuestion(chapterId, payload)
      setQuestions((prev) => [created, ...prev])
      setBanner({
        type: 'success',
        message: 'Đã thêm câu hỏi thủ công thành công vào ngân hàng chương.',
      })
      setIsCreateModalOpen(false)
      setManualContent('')
      setManualModelAnswer('')
      setManualKeywords('')
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi tạo câu hỏi thủ công.')
    }
  }

  // Xử lý cập nhật câu hỏi
  const handleUpdate = async () => {
    if (!editingQuestion) return
    try {
      const payload: UpdateQuestionRequest = {
        content: editingQuestion.content,
        difficulty: editingQuestion.difficulty,
        modelAnswer: editingQuestion.modelAnswer,
        expectedKeywords: editingQuestion.expectedKeywords,
      }
      const updated = await questionService.updateQuestion(editingQuestion.id, payload)
      setQuestions((prev) => prev.map((item) => (item.id === editingQuestion.id ? updated : item)))
      setBanner({
        type: 'success',
        message: 'Đã cập nhật thông tin câu hỏi.',
      })
      setEditingQuestion(null)
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi cập nhật câu hỏi.')
    }
  }

  return (
    <LecturerLayout
      title={`Ngân Hàng Câu Hỏi Dùng Chung: ${currentChapter?.name || chapterId}`}
      subtitle="Thẩm định câu hỏi AI, tự soạn câu hỏi và quản lý ngân hàng đề thi cấp chương (BR-BANK-001, BR-BANK-005)"
      breadcrumbs={[
        { label: 'Giảng viên', to: '/lecturer/dashboard' },
        { label: 'Ngân hàng câu hỏi', to: '/lecturer/questions' },
        { label: currentChapter?.name || chapterId },
      ]}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Banner thông báo */}
        {banner && (
          <div
            className={`rounded-2xl p-4 text-sm font-medium transition-all ${
              banner.type === 'success'
                ? 'border border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                : banner.type === 'warning'
                ? 'border border-amber-500/30 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
                : 'border border-rose-500/30 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{banner.message}</span>
              <button
                type="button"
                onClick={() => setBanner(null)}
                className="ml-3 font-bold hover:underline"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* Khung trạng thái Rubric & Điều hướng */}
        <div className="rounded-3xl border border-surface-container-high bg-surface-container-low p-6 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Môn học: {courseId}
                </span>
                {checkingRubric ? (
                  <span className="text-xs text-on-surface-variant">Đang kiểm tra Rubric...</span>
                ) : isRubricReady ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Rubric Môn Đạt 100% (Sẵn sàng duyệt)
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                    Rubric Chưa Đạt 100% ({rubricWeight.toFixed(1)}%)
                  </span>
                )}
              </div>
              <h2 className="mt-1 text-title-md font-bold text-on-surface">
                {currentChapter?.name || `Chương: ${chapterId}`}
              </h2>
              <p className="mt-1 text-xs text-on-surface-variant">
                Ngân hàng câu hỏi dùng chung giữa toàn bộ giảng viên giảng dạy môn {courseId} (BR-BANK-005).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/lecturer/courses/${encodeURIComponent(courseId)}/rubric`}
                className="rounded-xl border border-outline px-3.5 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
              >
                Quản lý Rubric Môn
              </Link>
              <Link
                to={`/lecturer/chapters/${encodeURIComponent(chapterId)}`}
                className="rounded-xl border border-outline px-3.5 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
              >
                Quản lý Slide & RAG
              </Link>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="rounded-xl border border-primary bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-white"
              >
                + Soạn Câu Hỏi Mới
              </button>
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(true)}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-primary/90"
              >
                Sinh Câu Hỏi AI (RAG)
              </button>
            </div>
          </div>
        </div>

        {/* Thanh lọc trạng thái và độ khó */}
        <div className="flex flex-col gap-3 rounded-2xl border border-surface-container-high bg-surface p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-on-surface-variant">Trạng thái:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-outline px-3 py-1.5 text-xs font-semibold text-on-surface outline-none focus:border-primary"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="DRAFT">Bản nháp (DRAFT)</option>
                <option value="APPROVED">Đã phê duyệt (APPROVED)</option>
                <option value="REJECTED">Đã từ chối (REJECTED)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-on-surface-variant">Độ khó:</span>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="rounded-xl border border-outline px-3 py-1.5 text-xs font-semibold text-on-surface outline-none focus:border-primary"
              >
                <option value="ALL">Tất cả mức độ</option>
                <option value="EASY">Dễ (EASY)</option>
                <option value="MEDIUM">Trung bình (MEDIUM)</option>
                <option value="HARD">Khó (HARD)</option>
              </select>
            </div>
          </div>

          <div className="text-xs font-medium text-on-surface-variant">
            Hiển thị <span className="font-bold text-on-surface">{filteredQuestions.length}</span> câu hỏi
          </div>
        </div>

        {/* Danh sách câu hỏi */}
        <div className="rounded-3xl border border-surface-container-high bg-surface p-6 shadow-xs">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 w-full animate-pulse rounded-2xl bg-surface-container-high"
                />
              ))}
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline p-12 text-center text-xs text-on-surface-variant">
              Không tìm thấy câu hỏi nào phù hợp với bộ lọc. Bấm &quot;Sinh Câu Hỏi AI&quot; hoặc &quot;Soạn Câu Hỏi Mới&quot; để bổ sung vào ngân hàng.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 transition-all hover:border-outline"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 space-y-3">
                      {/* Huy hiệu phân loại */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Độ khó */}
                        {q.difficulty === 'EASY' && (
                          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            Độ khó: Dễ
                          </span>
                        )}
                        {q.difficulty === 'MEDIUM' && (
                          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            Độ khó: Trung bình
                          </span>
                        )}
                        {q.difficulty === 'HARD' && (
                          <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            Độ khó: Khó
                          </span>
                        )}

                        {/* Nguồn gốc */}
                        <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">
                          {q.source === 'AI_GENERATED' ? 'AI Grounded RAG' : 'Thủ công'}
                        </span>

                        {/* Trạng thái */}
                        {q.status === 'APPROVED' && (
                          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            Đã Phê Duyệt
                          </span>
                        )}
                        {q.status === 'DRAFT' && (
                          <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-bold text-sky-600 dark:text-sky-400">
                            Bản Nháp
                          </span>
                        )}
                        {q.status === 'REJECTED' && (
                          <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            Đã Từ Chối
                          </span>
                        )}

                        {q.creatorName && (
                          <span className="text-[11px] text-on-surface-variant">
                            Tạo bởi: {q.creatorName}
                          </span>
                        )}
                      </div>

                      {/* Nội dung câu hỏi */}
                      <p className="text-sm font-bold text-on-surface leading-relaxed">
                        {q.content}
                      </p>

                      {/* Đáp án mẫu */}
                      {q.modelAnswer && (
                        <div className="rounded-xl bg-surface-container-low p-3 text-xs text-on-surface-variant">
                          <span className="font-semibold text-on-surface">Đáp án mẫu:</span>{' '}
                          {q.modelAnswer}
                        </div>
                      )}

                      {/* Từ khóa kỳ vọng */}
                      {Array.isArray(q.expectedKeywords) && q.expectedKeywords.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] font-semibold text-on-surface-variant">
                            Từ khóa kỳ vọng:
                          </span>
                          {q.expectedKeywords.map((kw, kIdx) => (
                            <span
                              key={kIdx}
                              className="rounded-md border border-outline bg-surface px-2 py-0.5 text-[11px] font-medium text-on-surface"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Các nút thao tác */}
                    <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                      {q.status !== 'APPROVED' && (
                        <div className="relative group">
                          <button
                            type="button"
                            disabled={!isRubricReady}
                            onClick={() => handleApprove(q)}
                            className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Phê Duyệt
                          </button>
                          {!isRubricReady && (
                            <div className="pointer-events-none absolute right-0 top-full z-20 mt-1 hidden w-56 rounded-xl border border-outline bg-surface p-2 text-[11px] text-on-surface shadow-md group-hover:block">
                              Không thể duyệt: Môn học chưa có Rubric hoàn chỉnh 100% (BR-BANK-001). Vui lòng cập nhật Rubric trước.
                            </div>
                          )}
                        </div>
                      )}

                      {q.status !== 'REJECTED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingQuestion(q)
                            setRejectionReason('')
                          }}
                          className="rounded-xl border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          Từ Chối
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setEditingQuestion(q)}
                        className="rounded-xl border border-outline px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
                      >
                        Chỉnh Sửa
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(q.id)}
                        className="rounded-xl px-2.5 py-1 text-xs text-rose-500 hover:underline"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal sinh câu hỏi AI */}
      <GenerateQuestionModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        chapterId={chapterId}
        materials={materials}
        onSuccess={(newQs) => {
          setQuestions((prev) => [...newQs, ...prev])
          setBanner({
            type: 'success',
            message: `Đã sinh thành công ${newQs.length} câu hỏi AI từ tài liệu. Bạn có thể kiểm tra và phê duyệt ngay bên dưới.`,
          })
        }}
      />

      {/* Modal soạn câu hỏi thủ công */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs"
            onClick={() => setIsCreateModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-xl rounded-3xl border border-surface-container-high bg-surface p-6 shadow-xl">
            <h3 className="text-title-sm font-bold text-on-surface">
              Soạn Câu Hỏi Mới Vào Ngân Hàng Chương
            </h3>
            <p className="mt-1 text-xs text-on-surface-variant">
              Câu hỏi được tạo thủ công sẽ đưa vào ngân hàng dùng chung của chương này.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface">
                  Nội Dung Câu Hỏi *
                </label>
                <textarea
                  rows={3}
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  placeholder="Nhập câu hỏi vấn đáp..."
                  className="mt-1 w-full rounded-xl border border-outline px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface">
                  Mức Độ Khó
                </label>
                <select
                  value={manualDifficulty}
                  onChange={(e) => setManualDifficulty(e.target.value as QuestionDifficulty)}
                  className="mt-1 w-full rounded-xl border border-outline px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
                >
                  <option value="EASY">Dễ (EASY)</option>
                  <option value="MEDIUM">Trung bình (MEDIUM)</option>
                  <option value="HARD">Khó (HARD)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface">
                  Đáp Án Mẫu (Gợi ý cho AI đối soát khi thi)
                </label>
                <textarea
                  rows={2}
                  value={manualModelAnswer}
                  onChange={(e) => setManualModelAnswer(e.target.value)}
                  placeholder="Nội dung câu trả lời chuẩn..."
                  className="mt-1 w-full rounded-xl border border-outline px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface">
                  Từ Khóa Kỳ Vọng (Phân cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={manualKeywords}
                  onChange={(e) => setManualKeywords(e.target.value)}
                  placeholder="VD: clean architecture, dependency inversion, loose coupling"
                  className="mt-1 w-full rounded-xl border border-outline px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-xl border border-outline px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateManual}
                className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary/90"
              >
                Tạo Câu Hỏi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chỉnh sửa câu hỏi */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs"
            onClick={() => setEditingQuestion(null)}
          />
          <div className="relative z-10 w-full max-w-xl rounded-3xl border border-surface-container-high bg-surface p-6 shadow-xl">
            <h3 className="text-title-sm font-bold text-on-surface">
              Chỉnh Sửa Câu Hỏi
            </h3>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface">
                  Nội Dung Câu Hỏi *
                </label>
                <textarea
                  rows={3}
                  value={editingQuestion.content}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, content: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-outline px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface">
                  Mức Độ Khó
                </label>
                <select
                  value={editingQuestion.difficulty}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      difficulty: e.target.value as QuestionDifficulty,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-outline px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
                >
                  <option value="EASY">Dễ (EASY)</option>
                  <option value="MEDIUM">Trung bình (MEDIUM)</option>
                  <option value="HARD">Khó (HARD)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface">
                  Đáp Án Mẫu
                </label>
                <textarea
                  rows={2}
                  value={editingQuestion.modelAnswer || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, modelAnswer: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-outline px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="rounded-xl border border-outline px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary/90"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal từ chối câu hỏi */}
      {rejectingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs"
            onClick={() => setRejectingQuestion(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl border border-surface-container-high bg-surface p-6 shadow-xl">
            <h3 className="text-title-sm font-bold text-on-surface">
              Từ Chối Câu Hỏi
            </h3>
            <p className="mt-1 text-xs text-on-surface-variant">
              Câu hỏi bị từ chối sẽ chuyển sang trạng thái REJECTED và không được dùng trong đề thi.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-on-surface">
                Lý Do Từ Chối (Tùy chọn)
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="VD: Câu hỏi chưa đủ rõ ràng, ngoài phạm vi bài học..."
                className="mt-1 w-full rounded-xl border border-outline px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectingQuestion(null)}
                className="rounded-xl border border-outline px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
              >
                Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}
    </LecturerLayout>
  )
}
