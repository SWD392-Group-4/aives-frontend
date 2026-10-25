import { useMemo, useState } from 'react'
import { MaterialResponse } from '@/features/materials/types'
import { questionBankService } from '../services/questionBankService'
import { QuestionResponse } from '../types'

interface GenerateQuestionModalProps {
  chapterId: string
  readyMaterials: MaterialResponse[]
  onClose: () => void
  onGenerated: (questions: QuestionResponse[]) => void
}

export default function GenerateQuestionModal({
  chapterId,
  readyMaterials,
  onClose,
  onGenerated,
}: GenerateQuestionModalProps) {
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>(
    readyMaterials.map((m) => m.id)
  )
  const [totalQuestions, setTotalQuestions] = useState<number>(10)

  // 3 ty le do kho: De (EASY), Trung binh (MEDIUM), Kho (HARD)
  const [easyPercent, setEasyPercent] = useState<number>(40)
  const [mediumPercent, setMediumPercent] = useState<number>(40)
  const [hardPercent, setHardPercent] = useState<number>(20)

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalPercent = useMemo(() => {
    return (Number(easyPercent) || 0) + (Number(mediumPercent) || 0) + (Number(hardPercent) || 0)
  }, [easyPercent, mediumPercent, hardPercent])

  const isValidPercent = totalPercent === 100

  const handleToggleMaterial = (id: string) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSelectAllMaterials = () => {
    if (selectedMaterialIds.length === readyMaterials.length) {
      setSelectedMaterialIds([])
    } else {
      setSelectedMaterialIds(readyMaterials.map((m) => m.id))
    }
  }

  const handleGenerate = async () => {
    if (selectedMaterialIds.length === 0) {
      setError('Vui long chon it nhat 1 tai lieu READY lam ngu canh sinh cau hoi.')
      return
    }
    if (totalQuestions < 1 || totalQuestions > 50) {
      setError('Tong so luong cau hoi can sinh phai tu 1 den 50 cau.')
      return
    }
    if (!isValidPercent) {
      setError(`Tong ty le do kho hien tai la ${totalPercent}%. Bat buoc phai bang dung 100% (BR-BANK-004).`)
      return
    }

    try {
      setGenerating(true)
      setError(null)
      const result = await questionBankService.generateChapterQuestions(chapterId, {
        materialIds: selectedMaterialIds,
        totalQuestions,
        difficultyRatio: {
          easyPercent,
          mediumPercent,
          hardPercent,
        },
      })
      onGenerated(result)
    } catch (err: any) {
      setError(err?.message || 'Loi khi yeu cau Vertex AI sinh cau hoi.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Sinh cau hoi thi bang Vertex AI RAG</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Cau hoi duoc trich xuat grounded tu tai lieu READY va mang trang thai DRAFT (BR-BANK-002)
            </p>
          </div>
          <button
            type="button"
            disabled={generating}
            onClick={onClose}
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            Dong
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs text-red-800">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Chon tai lieu READY lam ngu canh */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                1. Chon tai lieu ngu canh (chi tai lieu READY)
              </label>
              <button
                type="button"
                onClick={handleSelectAllMaterials}
                className="text-xs font-semibold text-primary underline"
              >
                {selectedMaterialIds.length === readyMaterials.length
                  ? 'Bo chon tat ca'
                  : 'Chon tat ca'}
              </button>
            </div>

            {readyMaterials.length === 0 ? (
              <p className="mt-2 text-xs text-red-600">
                Chuong chua co tai lieu nao o trang thai READY. Vui long nap tai lieu truoc.
              </p>
            ) : (
              <div className="mt-2 space-y-2 rounded-xl border border-border bg-surface-container-lowest p-3">
                {readyMaterials.map((mat) => (
                  <label
                    key={mat.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-surface-container-high transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMaterialIds.includes(mat.id)}
                      onChange={() => handleToggleMaterial(mat.id)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div className="flex-1 truncate text-xs font-semibold text-on-surface">
                      {mat.title}
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      READY
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* So luong cau hoi can sinh */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              2. Tong so luong cau hoi can sinh (1 - 50 cau)
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(Math.max(1, Math.min(50, Number(e.target.value))))}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-container-lowest px-3.5 py-2 text-sm font-semibold text-on-surface outline-none focus:border-primary"
            />
          </div>

          {/* Cau hinh ty le phan bo 3 muc do kho */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                3. Ty le phan bo do kho (Tong bat buoc = 100%)
              </label>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  isValidPercent
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                Tong: {totalPercent}% {isValidPercent ? '(Dat)' : '(Chua dat 100%)'}
              </span>
            </div>

            <div className="mt-3 space-y-4 rounded-xl border border-border bg-surface-container-lowest p-4">
              {/* De (EASY) */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-700">De (EASY)</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={easyPercent}
                      onChange={(e) =>
                        setEasyPercent(Math.max(0, Math.min(100, Number(e.target.value))))
                      }
                      className="w-14 rounded-lg border border-border bg-surface px-1.5 py-0.5 text-center text-xs font-bold text-on-surface"
                    />
                    <span>%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={easyPercent}
                  onChange={(e) => setEasyPercent(Number(e.target.value))}
                  className="mt-1.5 w-full accent-emerald-600"
                />
              </div>

              {/* Trung binh (MEDIUM) */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-700">Trung binh (MEDIUM)</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={mediumPercent}
                      onChange={(e) =>
                        setMediumPercent(Math.max(0, Math.min(100, Number(e.target.value))))
                      }
                      className="w-14 rounded-lg border border-border bg-surface px-1.5 py-0.5 text-center text-xs font-bold text-on-surface"
                    />
                    <span>%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={mediumPercent}
                  onChange={(e) => setMediumPercent(Number(e.target.value))}
                  className="mt-1.5 w-full accent-amber-600"
                />
              </div>

              {/* Kho (HARD) */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-red-700">Kho (HARD)</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={hardPercent}
                      onChange={(e) =>
                        setHardPercent(Math.max(0, Math.min(100, Number(e.target.value))))
                      }
                      className="w-14 rounded-lg border border-border bg-surface px-1.5 py-0.5 text-center text-xs font-bold text-on-surface"
                    />
                    <span>%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={hardPercent}
                  onChange={(e) => setHardPercent(Number(e.target.value))}
                  className="mt-1.5 w-full accent-red-600"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-surface-container-high p-3 text-[11px] text-on-surface-variant">
            Luu y nghiep vu (BR-BANK-002): RAG engine chi sinh noi dung cau hoi, do kho, dap an mau va tu khoa. Tuyet doi khong sinh Rubric. Cau hoi mac dinh mang trang thai DRAFT cho giang vien tham dinh.
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            disabled={generating}
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
          >
            Huy bo
          </button>
          <button
            type="button"
            disabled={generating || !isValidPercent || selectedMaterialIds.length === 0}
            onClick={handleGenerate}
            className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {generating ? 'Vertex AI dang sinh cau hoi...' : 'Sinh cau hoi bang AI'}
          </button>
        </div>
      </div>
    </div>
  )
}