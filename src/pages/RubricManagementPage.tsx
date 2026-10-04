import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import Navbar from '../components/Navbar'
import { contentService } from '../services/contentService'
import { Rubric } from '../types'
import { formatDateTime } from '../utils/dateTime'

interface CriterionInput {
  name: string
  description: string
  weightPercent: number
}

export default function RubricManagementPage() {
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Form tạo Rubric mới
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [maxScore, setMaxScore] = useState(10)
  const [criteria, setCriteria] = useState<CriterionInput[]>([
    { name: 'Độ chuẩn xác khái niệm', description: 'Giải thích đúng bản chất kỹ thuật, thuật ngữ.', weightPercent: 40 },
    { name: 'Khả năng phân tích đánh đổi', description: 'Nêu rõ ưu nhược điểm và tình huống áp dụng.', weightPercent: 30 },
    { name: 'Phản xạ khi bị hỏi xoáy', description: 'Giữ vững luận điểm, phản hồi logic và không bị lúng túng.', weightPercent: 30 },
  ])

  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weightPercent) || 0), 0)
  const isWeightValid = Math.round(totalWeight) === 100

  const loadRubrics = async () => {
    try {
      const data = await contentService.getRubrics()
      setRubrics(data)
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Lỗi tải danh sách Rubric' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRubrics()
  }, [])

  const addCriterion = () => {
    setCriteria([...criteria, { name: '', description: '', weightPercent: 10 }])
  }

  const removeCriterion = (idx: number) => {
    if (criteria.length <= 1) {
      alert('Rubric phải có ít nhất 1 tiêu chí!')
      return
    }
    setCriteria(criteria.filter((_, i) => i !== idx))
  }

  const updateCriterion = (idx: number, field: keyof CriterionInput, val: any) => {
    const next = [...criteria]
    next[idx] = { ...next[idx], [field]: val }
    setCriteria(next)
  }

  const handleCreateRubric = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isWeightValid) {
      alert(`BR-BANK-001: Tổng trọng số các tiêu chí phải bằng đúng 100% (Hiện tại là ${totalWeight}%).`)
      return
    }

    try {
      const newRubric = await contentService.createRubric({
        name,
        description,
        maxScore,
        criteria,
      })
      setRubrics([newRubric, ...rubrics])
      setModalOpen(false)
      setName('')
      setDescription('')
      setBanner({ type: 'success', message: 'Tạo Rubric chấm điểm mới thành công!' })
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message })
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/40 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Link to="/lecturer/questions" className="text-body-sm text-primary hover:underline flex items-center gap-1">
                <Icon name="arrow_back" className="text-base" /> Ngân hàng câu hỏi
              </Link>
            </div>
            <h1 className="mt-2 text-headline-md font-bold text-on-surface">Quản lý Rubric Chấm điểm (AIVES)</h1>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Thiết lập tiêu chí đánh giá chuẩn hóa cho Giám khảo AI và Giảng viên đối chiếu (BR-BANK-001/003).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary-container px-6 py-2.5 text-label-md font-semibold text-on-primary shadow-md hover:bg-primary transition-colors"
          >
            <Icon name="add" />
            <span>Tạo Rubric mới</span>
          </button>
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

        {/* Danh sách Rubrics */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {rubrics.map((r) => (
            <div
              key={r.id}
              className="flex flex-col justify-between rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-label-xs font-bold text-primary">{r.id}</span>
                  <span className="rounded-full bg-primary-fixed px-3 py-1 text-label-xs font-bold text-primary">
                    Thang điểm: {r.maxScore}đ
                  </span>
                </div>

                <h3 className="mt-3 text-headline-sm font-bold text-on-surface">{r.name}</h3>
                {r.description && <p className="mt-2 text-body-sm text-on-surface-variant">{r.description}</p>}

                {/* Tiêu chí chi tiết */}
                <div className="mt-6 space-y-3">
                  <h4 className="text-label-xs font-bold uppercase tracking-wider text-outline">
                    Các tiêu chí đánh giá ({r.criteria.length}):
                  </h4>

                  {r.criteria.map((c) => (
                    <div key={c.id} className="rounded-2xl bg-surface-container p-4 border border-outline-variant/30">
                      <div className="flex items-center justify-between">
                        <span className="text-label-md font-semibold text-on-surface">{c.name}</span>
                        <span className="rounded-full bg-secondary-container px-2.5 py-0.5 text-label-xs font-bold text-secondary">
                          {c.weightPercent}%
                        </span>
                      </div>
                      <p className="mt-1.5 text-body-xs text-on-surface-variant leading-relaxed">{c.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-outline-variant/30 pt-4 text-body-xs text-outline">
                <span>Tạo bởi: {r.createdBy}</span>
                <span>{formatDateTime(r.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal tạo Rubric mới */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl bg-surface-container-lowest p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
              <h3 className="text-headline-xs font-bold text-on-surface flex items-center gap-2">
                <Icon name="rule" className="text-primary" /> Thiết lập Rubric chấm điểm
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1.5 text-outline hover:bg-surface-container"
              >
                <Icon name="close" />
              </button>
            </div>

            <form onSubmit={handleCreateRubric} className="mt-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-label-sm font-semibold text-on-surface mb-1">Tên Rubric:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Rubric Vấn đáp Kiến trúc Clean Architecture"
                    className="w-full rounded-2xl border border-outline-variant bg-surface-container-low p-3 text-body-sm text-on-surface"
                  />
                </div>

                <div>
                  <label className="block text-label-sm font-semibold text-on-surface mb-1">Thang điểm tối đa:</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    className="w-full rounded-2xl border border-outline-variant bg-surface-container-low p-3 text-body-sm text-on-surface"
                  />
                </div>
              </div>

              <div>
                <label className="block text-label-sm font-semibold text-on-surface mb-1">Mô tả tổng quát:</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mục tiêu đánh giá và bối cảnh áp dụng..."
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low p-3 text-body-sm text-on-surface"
                />
              </div>

              {/* Danh sách tiêu chí động */}
              <div className="border-t border-outline-variant/30 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h4 className="text-label-md font-bold text-on-surface">Danh sách tiêu chí & Trọng số:</h4>
                    <span
                      className={`rounded-full px-3 py-0.5 text-label-xs font-bold ${
                        isWeightValid
                          ? 'bg-secondary-container text-secondary'
                          : 'bg-error-container text-error'
                      }`}
                    >
                      Tổng trọng số: {totalWeight}% / 100%
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={addCriterion}
                    className="inline-flex items-center gap-1 text-label-sm font-bold text-primary hover:underline"
                  >
                    <Icon name="add" className="text-base" /> Thêm tiêu chí
                  </button>
                </div>

                <div className="space-y-3">
                  {criteria.map((c, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl bg-surface-container p-4 border border-outline-variant/30 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary text-label-xs font-bold">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          required
                          value={c.name}
                          onChange={(e) => updateCriterion(idx, 'name', e.target.value)}
                          placeholder="Tên tiêu chí (ví dụ: Tính chính xác)"
                          className="flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-2 text-body-sm text-on-surface"
                        />
                        <div className="flex items-center gap-1 w-28 shrink-0">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            required
                            value={c.weightPercent}
                            onChange={(e) => updateCriterion(idx, 'weightPercent', Number(e.target.value))}
                            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-2 text-body-sm text-on-surface text-right"
                          />
                          <span className="text-label-sm font-bold text-outline">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCriterion(idx)}
                          className="p-1.5 text-outline hover:text-error"
                        >
                          <Icon name="delete" />
                        </button>
                      </div>

                      <textarea
                        rows={2}
                        required
                        value={c.description}
                        onChange={(e) => updateCriterion(idx, 'description', e.target.value)}
                        placeholder="Mô tả tiêu chuẩn đạt điểm (Bắt buộc theo BR-BANK-003 để AI làm căn cứ đối chiếu)..."
                        className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-2.5 text-body-xs text-on-surface"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full px-5 py-2 text-label-md text-on-surface-variant hover:bg-surface-container"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!isWeightValid}
                  className="rounded-full bg-primary-container px-6 py-2.5 text-label-md font-semibold text-on-primary hover:bg-primary shadow-md disabled:opacity-50"
                >
                  Lưu Rubric
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
