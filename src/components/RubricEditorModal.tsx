import { useMemo, useState } from 'react'
import Icon from './Icon'
import { contentService } from '../services/contentService'
import { Rubric, RubricCriterion } from '../types'

interface RubricEditorModalProps {
  rubric: Rubric
  onClose: () => void
  onSaved: (updatedRubric: Rubric) => void
}

interface EditableCriterion {
  id?: string
  name: string
  description: string
  weightPercent: number
}

export default function RubricEditorModal({
  rubric,
  onClose,
  onSaved,
}: RubricEditorModalProps) {
  const [name, setName] = useState(rubric.name || 'Rubric Chấm Điểm')
  const [description, setDescription] = useState(rubric.description || '')
  const [criteria, setCriteria] = useState<EditableCriterion[]>(
    rubric.criteria && rubric.criteria.length > 0
      ? rubric.criteria.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          weightPercent: c.weightPercent,
        }))
      : [
          {
            name: 'Độ chính xác khái niệm & Thuật ngữ',
            description: 'Định nghĩa chuẩn xác, sử dụng đúng thuật ngữ chuyên môn trong tài liệu.',
            weightPercent: 40,
          },
          {
            name: 'Khả năng phân tích & Lập luận',
            description: 'Giải thích rõ nguyên lý, so sánh ưu nhược điểm và mô tả luồng xử lý.',
            weightPercent: 30,
          },
          {
            name: 'Kỹ năng phản xạ & Bảo vệ luận điểm',
            description: 'Trả lời tự tin, giải trình mạch lạc câu hỏi mở rộng của giám khảo.',
            weightPercent: 30,
          },
        ]
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Total weight calculation
  const totalWeight = useMemo(() => {
    return criteria.reduce((sum, c) => sum + (Number(c.weightPercent) || 0), 0)
  }, [criteria])

  const isValid100 = Math.round(totalWeight) === 100

  // Update criterion
  const handleUpdateCriterion = (
    index: number,
    field: keyof EditableCriterion,
    value: string | number
  ) => {
    setCriteria((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    )
  }

  // Add new criterion
  const handleAddCriterion = () => {
    const remaining = Math.max(0, 100 - totalWeight)
    setCriteria((prev) => [
      ...prev,
      {
        name: `Tiêu chí ${prev.length + 1}`,
        description: 'Mô tả chi tiết yêu cầu đạt điểm chuẩn...',
        weightPercent: remaining > 0 ? remaining : 10,
      },
    ])
  }

  // Delete criterion
  const handleDeleteCriterion = (index: number) => {
    if (criteria.length <= 1) {
      setError('Rubric bắt buộc phải có ít nhất 1 tiêu chí đánh giá.')
      return
    }
    setCriteria((prev) => prev.filter((_, i) => i !== index))
  }

  // Auto-normalize weights to 100%
  const handleAutoNormalize = () => {
    if (criteria.length === 0) return
    const equalWeight = Math.floor(100 / criteria.length)
    const remainder = 100 - equalWeight * criteria.length

    setCriteria((prev) =>
      prev.map((c, i) => ({
        ...c,
        weightPercent: i === 0 ? equalWeight + remainder : equalWeight,
      }))
    )
    setError(null)
  }

  // Save changes
  const handleSave = async () => {
    if (!name.trim()) {
      setError('Tên Rubric không được để trống.')
      return
    }

    if (!isValid100) {
      setError(
        `Ràng buộc BR-BANK-001: Tổng trọng số các tiêu chí phải đạt chính xác 100% (hiện tại: ${totalWeight}%).`
      )
      return
    }

    // Check empty criterion names or descriptions
    for (let i = 0; i < criteria.length; i++) {
      if (!criteria[i].name.trim()) {
        setError(`Tiêu chí số ${i + 1} chưa có tên.`)
        return
      }
      if (!criteria[i].description.trim()) {
        setError(`Tiêu chí "${criteria[i].name}" cần có mô tả yêu cầu đạt điểm (BR-BANK-003).`)
        return
      }
    }

    try {
      setSaving(true)
      setError(null)

      const payload = {
        name: name.trim(),
        description: description.trim(),
        maxScore: rubric.maxScore || 10,
        criteria: criteria.map((c, idx) => ({
          name: c.name.trim(),
          description: c.description.trim(),
          weightPercent: Number(c.weightPercent),
          orderNo: idx + 1,
        })),
      }

      const updated = await contentService.updateRubric(rubric.id, payload)
      onSaved(updated)
      onClose()
    } catch (err: any) {
      console.error('Save rubric error:', err)
      setError(err?.message || 'Không thể lưu Rubric. Vui lòng kiểm tra lại.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-inverse-surface/60 p-3 sm:p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rubric-editor-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-surface-container-lowest p-6 sm:p-8 shadow-2xl border border-outline-variant/30 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary-container text-secondary">
              <Icon name="fact_check" className="text-2xl" />
            </div>
            <div>
              <h2 id="rubric-editor-title" className="text-xl font-bold text-on-surface">
                Chỉnh sửa Rubric Chấm điểm
              </h2>
              <p className="text-xs text-on-surface-variant">
                Quy tắc bất biến <strong className="text-primary font-bold">BR-BANK-001</strong>: Tổng trọng số các tiêu chí con phải đạt chính xác 100%.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-error-container p-3 text-xs text-on-error-container">
            <div className="flex items-center gap-2 font-medium">
              <Icon name="error" className="text-base text-error shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-outline">
              <Icon name="close" className="text-sm" />
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="mt-5 space-y-4">
          {/* Tên Rubric */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-outline mb-1">
              Tên Rubric:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-outline-variant/60 bg-surface-container-low px-3.5 py-2 text-sm font-semibold text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Nhập tên Rubric..."
            />
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-outline mb-1">
              Mô tả tổng quan:
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-outline-variant/60 bg-surface-container-low px-3.5 py-2 text-xs text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Mô tả bối cảnh và mục tiêu đánh giá..."
            />
          </div>

          {/* Trọng số indicator */}
          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
                Tiêu chuẩn kiểm soát trọng số (BR-BANK-001)
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                    isValid100
                      ? 'bg-secondary-fixed/70 text-secondary'
                      : 'bg-error-container text-on-error-container'
                  }`}
                >
                  Tổng: {totalWeight}% {isValid100 ? '(Chuẩn 100%)' : '(Không đạt)'}
                </span>

                {!isValid100 && (
                  <button
                    type="button"
                    onClick={handleAutoNormalize}
                    className="rounded-lg bg-surface-container-high px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-surface-container-highest transition-colors"
                  >
                    Tự động cân bằng 100%
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
              <div
                className={`h-full transition-all duration-300 ${
                  isValid100
                    ? 'bg-secondary'
                    : totalWeight > 100
                      ? 'bg-error'
                      : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, totalWeight)}%` }}
              ></div>
            </div>
          </div>

          {/* Danh sách tiêu chí */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-outline">
                Danh sách Tiêu chí Đánh giá ({criteria.length})
              </span>
              <button
                type="button"
                onClick={handleAddCriterion}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                <Icon name="add" className="text-sm" />
                Thêm tiêu chí
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {criteria.map((crit, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-3.5 shadow-sm space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-container text-xs font-bold text-on-surface">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={crit.name}
                        onChange={(e) => handleUpdateCriterion(idx, 'name', e.target.value)}
                        placeholder="Tên tiêu chí (ví dụ: Độ chính xác khái niệm)"
                        className="flex-1 rounded-lg border border-outline-variant/60 bg-surface-container-low px-2.5 py-1 text-xs font-bold text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <label className="text-[11px] font-semibold text-outline">Trọng số:</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={crit.weightPercent}
                        onChange={(e) =>
                          handleUpdateCriterion(
                            idx,
                            'weightPercent',
                            Math.max(1, Math.min(100, parseInt(e.target.value) || 0))
                          )
                        }
                        className="w-14 rounded-lg border border-outline-variant/60 bg-surface-container-low px-2 py-1 text-center text-xs font-mono font-bold text-primary focus:border-primary"
                      />
                      <span className="text-xs font-bold text-outline">%</span>

                      <button
                        type="button"
                        onClick={() => handleDeleteCriterion(idx)}
                        disabled={criteria.length <= 1}
                        title="Xóa tiêu chí này"
                        className="ml-1 p-1 text-on-surface-variant hover:text-error hover:bg-error-container/30 rounded-lg transition-colors disabled:opacity-30"
                      >
                        <Icon name="delete" className="text-base" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      value={crit.description}
                      onChange={(e) => handleUpdateCriterion(idx, 'description', e.target.value)}
                      placeholder="Mô tả chuẩn đạt điểm: Nêu rõ điều kiện để AI chấm điểm minh bạch (BR-BANK-003)..."
                      className="w-full rounded-lg border border-outline-variant/60 bg-surface-container-low p-2 text-xs text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-outline-variant/30 pt-4">
          <div className="text-xs text-outline">
            {isValid100 ? (
              <span className="text-secondary font-medium">✓ Đạt chuẩn duyệt BR-BANK-001</span>
            ) : (
              <span className="text-error font-medium">⚠ Cần đúng 100% để có thể duyệt</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-full border border-outline-variant/60 bg-surface-container px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!isValid100 || saving}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-5 py-2 text-xs font-bold text-on-primary shadow-sm hover:bg-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon name="save" className="text-sm" />
              <span>{saving ? 'Đang lưu...' : 'Lưu Rubric (100%)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
