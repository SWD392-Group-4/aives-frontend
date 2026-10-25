import { useMemo, useState } from 'react'
import { Material } from '../materials/types'
import { questionService } from './questionService'
import { GenerateQuestionsRequest, Question } from './types'

interface GenerateQuestionModalProps {
  isOpen: boolean
  onClose: () => void
  chapterId: string
  materials: Material[]
  onSuccess: (newQuestions: Question[]) => void
}

export default function GenerateQuestionModal({
  isOpen,
  onClose,
  chapterId,
  materials,
  onSuccess,
}: GenerateQuestionModalProps) {
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([])
  const [totalQuestions, setTotalQuestions] = useState<number>(5)
  const [easyPercent, setEasyPercent] = useState<number>(40)
  const [mediumPercent, setMediumPercent] = useState<number>(40)
  const [hardPercent, setHardPercent] = useState<number>(20)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Chỉ cho phép chọn các tài liệu có trạng thái READY
  const readyMaterials = useMemo(() => {
    return materials.filter((m) => m.ragStatus === 'READY')
  }, [materials])

  // Tính tổng tỷ lệ phần trăm
  const totalRatio = easyPercent + mediumPercent + hardPercent
  const isRatioValid = totalRatio === 100

  // Số lượng câu hỏi tương ứng theo tỷ lệ làm tròn
  const easyCount = Math.round((totalQuestions * easyPercent) / 100)
  const mediumCount = Math.round((totalQuestions * mediumPercent) / 100)
  const hardCount = Math.max(0, totalQuestions - easyCount - mediumCount)

  const handleToggleMaterial = (id: string) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    )
  }

  const handleSelectAllReady = () => {
    if (selectedMaterialIds.length === readyMaterials.length) {
      setSelectedMaterialIds([])
    } else {
      setSelectedMaterialIds(readyMaterials.map((m) => m.id))
    }
  }

  const handleGenerate = async () => {
    setErrorMessage(null)

    if (selectedMaterialIds.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất 1 tài liệu ở trạng thái Sẵn sàng (READY) để làm ngữ cảnh sinh câu hỏi.')
      return
    }

    if (!isRatioValid) {
      setErrorMessage(`Tổng tỷ lệ phần trăm bắt buộc phải bằng 100%. Hiện tại là ${totalRatio}%. Vui lòng điều chỉnh lại thanh trượt.`)
      return
    }

    if (totalQuestions < 1 || totalQuestions > 50) {
      setErrorMessage('Số lượng câu hỏi sinh mỗi lần phải nằm trong khoảng từ 1 đến 50.')
      return
    }

    const payload: GenerateQuestionsRequest = {
      materialIds: selectedMaterialIds,
      totalQuestions,
      difficultyRatio: {
        easyPercent,
        mediumPercent,
        hardPercent,
      },
    }

    setLoading(true)
    try {
      const generated = await questionService.generateQuestions(chapterId, payload)
      onSuccess(generated)
      onClose()
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Không thể sinh câu hỏi bằng Vertex AI RAG Engine. Vui lòng kiểm tra lại trạng thái lập chỉ mục của tài liệu.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!loading) onClose()
        }}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-surface-container-high bg-surface p-6 shadow-xl sm:p-8">
        <div className="flex items-start justify-between border-b border-surface-container-high pb-4">
          <div>
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              Vertex AI Grounded RAG
            </span>
            <h2 className="mt-2 text-title-md font-bold text-on-surface">
              Sinh Câu Hỏi AI Từ Tài Liệu Chương
            </h2>
            <p className="mt-1 text-xs text-on-surface-variant">
              Hệ thống sẽ đối soát nội dung slide bài giảng để sinh câu hỏi nháp (DRAFT) bám sát tri thức thực tế (BR-BANK-002, BR-BANK-004).
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high"
            aria-label="Đóng"
          >
            Đóng
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
            {errorMessage}
          </div>
        )}

        <div className="mt-6 space-y-6">
          {/* Bước 1: Chọn tài liệu READY */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-label-md font-bold text-on-surface">
                1. Chọn Tài Liệu Ngữ Cảnh (RAG Ready)
              </label>
              {readyMaterials.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllReady}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {selectedMaterialIds.length === readyMaterials.length
                    ? 'Bỏ chọn tất cả'
                    : 'Chọn tất cả sẵn sàng'}
                </button>
              )}
            </div>

            {readyMaterials.length === 0 ? (
              <div className="mt-2 rounded-2xl border border-dashed border-outline bg-surface-container-lowest p-4 text-center text-xs text-on-surface-variant">
                Chưa có tài liệu nào đạt trạng thái Sẵn sàng (READY). Vui lòng nạp slide và đợi hệ thống lập chỉ mục trước khi sinh câu hỏi.
              </div>
            ) : (
              <div className="mt-3 max-h-44 space-y-2 overflow-y-auto rounded-2xl border border-surface-container-high bg-surface-container-lowest p-3">
                {readyMaterials.map((mat) => {
                  const isChecked = selectedMaterialIds.includes(mat.id)
                  return (
                    <label
                      key={mat.id}
                      className={`flex cursor-pointer items-center justify-between rounded-xl p-2.5 transition-all ${
                        isChecked
                          ? 'border border-primary/30 bg-primary/5'
                          : 'hover:bg-surface-container-high'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleMaterial(mat.id)}
                          className="h-4 w-4 rounded border-outline text-primary focus:ring-primary"
                        />
                        <div>
                          <div className="text-xs font-bold text-on-surface">{mat.title}</div>
                          <div className="text-[11px] text-on-surface-variant">
                            {mat.fileName} • {(mat.fileSize / 1024 / 1024).toFixed(2)} MB • {mat.chunkCount ?? 0} đoạn tri thức
                          </div>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        READY
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* Bước 2: Số lượng câu hỏi */}
          <div>
            <label className="text-label-md font-bold text-on-surface">
              2. Tổng Số Câu Hỏi Cần Sinh
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={50}
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(parseInt(e.target.value) || 1)}
                className="w-28 rounded-xl border border-outline px-3.5 py-2 text-center text-sm font-bold text-on-surface outline-none focus:border-primary"
              />
              <span className="text-xs text-on-surface-variant">
                câu hỏi (Giới hạn từ 1 đến 50 câu cho mỗi lần gọi AI)
              </span>
            </div>
          </div>

          {/* Bước 3: Cấu hình tỷ lệ phân bổ độ khó (BR-BANK-004) */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-label-md font-bold text-on-surface">
                3. Tỷ Lệ Phân Bổ Độ Khó (BR-BANK-004)
              </label>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  isRatioValid
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                }`}
              >
                Tổng tỷ lệ: {totalRatio}% {isRatioValid ? '(Hợp lệ)' : '(Phải = 100%)'}
              </span>
            </div>

            <div className="mt-3 space-y-4 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-4">
              {/* Dễ (EASY) */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Dễ (EASY) - Dự kiến ~{easyCount} câu
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={easyPercent}
                      onChange={(e) => setEasyPercent(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      className="w-16 rounded-lg border border-outline px-2 py-0.5 text-center text-xs font-bold text-on-surface"
                    />
                    <span>%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={easyPercent}
                  onChange={(e) => setEasyPercent(parseInt(e.target.value))}
                  className="mt-1.5 w-full accent-emerald-500"
                />
              </div>

              {/* Trung bình (MEDIUM) */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-amber-600 dark:text-amber-400">
                    Trung bình (MEDIUM) - Dự kiến ~{mediumCount} câu
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={mediumPercent}
                      onChange={(e) => setMediumPercent(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      className="w-16 rounded-lg border border-outline px-2 py-0.5 text-center text-xs font-bold text-on-surface"
                    />
                    <span>%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={mediumPercent}
                  onChange={(e) => setMediumPercent(parseInt(e.target.value))}
                  className="mt-1.5 w-full accent-amber-500"
                />
              </div>

              {/* Khó (HARD) */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-rose-600 dark:text-rose-400">
                    Khó (HARD) - Dự kiến ~{hardCount} câu
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={hardPercent}
                      onChange={(e) => setHardPercent(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      className="w-16 rounded-lg border border-outline px-2 py-0.5 text-center text-xs font-bold text-on-surface"
                    />
                    <span>%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={hardPercent}
                  onChange={(e) => setHardPercent(parseInt(e.target.value))}
                  className="mt-1.5 w-full accent-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Lưu ý nghiệp vụ: KHÔNG CÓ RUBRIC */}
          <div className="rounded-2xl border border-outline bg-surface-container-low p-3.5 text-xs text-on-surface-variant">
            <span className="font-bold text-on-surface">Khẳng định nghiệp vụ (BR-BANK-002):</span>{' '}
            Mọi câu hỏi do AI sinh ra mang trạng thái Bản nháp (DRAFT) và nguồn gốc AI_GENERATED.
            Tuyệt đối không sinh kèm Rubric tại bước này; câu hỏi kế thừa Rubric chung của Môn học khi đưa vào ca thi.
          </div>
        </div>

        {/* Footer buttons */}
        <div className="mt-8 flex items-center justify-end gap-3 border-t border-surface-container-high pt-4">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="rounded-xl border border-outline px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high disabled:opacity-50"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            disabled={loading || selectedMaterialIds.length === 0 || !isRatioValid}
            onClick={handleGenerate}
            className="rounded-xl bg-primary px-6 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Đang gọi AI RAG...' : 'Sinh Câu Hỏi Bằng AI'}
          </button>
        </div>
      </div>
    </div>
  )
}
