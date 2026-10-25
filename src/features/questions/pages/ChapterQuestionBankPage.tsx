import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import LecturerLayout from '@/components/LecturerLayout'
import { rubricService } from '@/features/rubric/services/rubricService'
import GenerateQuestionModal from '../components/GenerateQuestionModal'
import { questionBankService } from '../services/questionBankService'
import { QuestionDifficulty, QuestionResponse, QuestionStatus } from '../types'

export default function ChapterQuestionBankPage() {
  const { chapterId = '' } = useParams<{ chapterId: string }>()

  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<QuestionResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  // Filters
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuestionDifficulty | 'ALL'>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<QuestionStatus | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Ranh gioi phe duyet (BR-BANK-001)
  const [isRubricReady, setIsRubricReady] = useState<boolean>(false)
  const [courseId, setCourseId] = useState<string>('SWD392')

  // Modals & Action States
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectModalQuestion, setRejectModalQuestion] = useState<QuestionResponse | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [generateModalOpen, setGenerateModalOpen] = useState(false)

  const loadData = async () => {
    if (!chapterId) return
    try {
      setLoading(true)
      setError(null)
      const data = await questionBankService.getChapterQuestions(chapterId, {
        status: selectedStatus,
        difficulty: selectedDifficulty,
      })
      setQuestions(data || [])

      const inferredCourseId = data?.[0]?.courseId || courseId || 'SWD392'
      setCourseId(inferredCourseId)

      const ready = await rubricService.checkRubricReady(inferredCourseId)
      setIsRubricReady(ready)
    } catch (err: any) {
      setError(err?.message || 'Khong the tai danh sach cau hoi cua chuong.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [chapterId, selectedStatus, selectedDifficulty])

  const handleApprove = async (questionId: string) => {
    if (!isRubricReady) {
      setError(
        'Mon hoc chua co Rubric hoan chinh dat 100%. Vui long hoan tat Rubric mon hoc truoc khi phe duyet (BR-BANK-001).'
      )
      return
    }

    try {
      setApprovingId(questionId)
      setError(null)
      const updated = await questionBankService.approveQuestion(questionId)
      setQuestions((prev) => prev.map((q) => (q.id === questionId ? updated : q)))
      setSuccessBanner('Phe duyet cau hoi thanh cong. Cau hoi da duoc dua vao ngan hang chinh thuc.')
    } catch (err: any) {
      setError(err?.message || 'Loi khi phe duyet cau hoi.')
    } finally {
      setApprovingId(null)
    }
  }

  const handleConfirmReject = async () => {
    if (!rejectModalQuestion) return
    if (!rejectReason.trim()) {
      setError('Vui long nhap ly do tu choi cau hoi.')
      return
    }

    try {
      setRejecting(true)
      setError(null)
      const updated = await questionBankService.rejectQuestion(rejectModalQuestion.id, {
        reason: rejectReason.trim(),
      })
      setQuestions((prev) => prev.map((q) => (q.id === rejectModalQuestion.id ? updated : q)))
      setSuccessBanner('Tu choi cau hoi thanh cong.')
      setRejectModalQuestion(null)
      setRejectReason('')
    } catch (err: any) {
      setError(err?.message || 'Loi khi tu choi cau hoi.')
    } finally {
      setRejecting(false)
    }
  }

  const filteredQuestions = questions.filter((q) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      q.content.toLowerCase().includes(query) ||
      (q.modelAnswer && q.modelAnswer.toLowerCase().includes(query)) ||
      q.expectedKeywords.some((k) => k.toLowerCase().includes(query))
    )
  })

  return (
    <LecturerLayout
      title={`Ngan hang cau hoi dung chung - Chuong: ${chapterId}`}
      subtitle="Tham dinh & phe duyet cau hoi giua cac giang vien cung giang day mon hoc"
      breadcrumbs={[
        { label: 'Tong quan', to: '/lecturer/dashboard' },
        { label: 'Hoc lieu chuong', to: `/lecturer/chapters/${chapterId}` },
        { label: 'Ngan hang cau hoi' },
      ]}
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 border-b border-border pb-3">
          <Link
            to={`/lecturer/chapters/${chapterId}`}
            className="pb-3 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Hoc lieu RAG
          </Link>
          <span className="border-b-2 border-primary pb-3 text-sm font-bold text-primary">
            Ngan hang cau hoi dung chung ({questions.length})
          </span>
        </div>

        {/* Canh bao bat bien Rubric 100% (BR-BANK-001) */}
        {!isRubricReady && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900 shadow-xs">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="inline-block rounded-md bg-red-200 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-red-900">
                  CHAN PHE DUYET CAU HOI (BR-BANK-001)
                </span>
                <p className="mt-1 text-sm font-medium">
                  Mon hoc chua co Rubric hoan chinh dat 100%. Tat ca thao tac phe duyet cau hoi vao ngan hang chinh thuc bi tam khoa.
                </p>
              </div>
              <Link
                to={`/lecturer/courses/${courseId}/rubric`}
                className="inline-block rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 text-center"
              >
                Thiet lap Rubric 100% ngay
              </Link>
            </div>
          </div>
        )}

        {/* Thong bao */}
        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-xs font-semibold underline"
              >
                Dong
              </button>
            </div>
          </div>
        )}

        {successBanner && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
            <div className="flex items-center justify-between">
              <span>{successBanner}</span>
              <button
                type="button"
                onClick={() => setSuccessBanner(null)}
                className="text-xs font-semibold underline"
              >
                Dong
              </button>
            </div>
          </div>
        )}

        {/* Thanh cong cu bo loc */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Tim kiem noi dung cau hoi, tu khoa, dap an mau..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-72 rounded-xl border border-border bg-surface-container-lowest px-3.5 py-1.5 text-xs text-on-surface outline-none focus:border-primary"
            />

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value as any)}
              className="rounded-xl border border-border bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-on-surface outline-none focus:border-primary"
            >
              <option value="ALL">Tat ca do kho</option>
              <option value="EASY">De (EASY)</option>
              <option value="MEDIUM">Trung binh (MEDIUM)</option>
              <option value="HARD">Kho (HARD)</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="rounded-xl border border-border bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-on-surface outline-none focus:border-primary"
            >
              <option value="ALL">Tat ca trang thai</option>
              <option value="DRAFT">DRAFT (Cho duyet)</option>
              <option value="APPROVED">APPROVED (Da duyet)</option>
              <option value="REJECTED">REJECTED (Tu choi)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setGenerateModalOpen(true)}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary/90 transition-colors"
          >
            Sinh cau hoi AI
          </button>
        </div>

        {/* Bang danh sach cau hoi (Loading, Empty, Populated) */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 animate-pulse rounded-2xl bg-surface-container-high" />
            ))}
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
            <h3 className="text-base font-semibold text-on-surface">Chua co cau hoi nao</h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              Khong tim thay cau hoi phu hop voi bo loc hien tai.
            </p>
            <button
              type="button"
              onClick={() => setGenerateModalOpen(true)}
              className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary"
            >
              Yeu cau AI sinh cau hoi moi
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((q) => (
              <div
                key={q.id}
                className="rounded-2xl border border-border bg-surface p-5 transition-shadow hover:shadow-xs"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Badge do kho */}
                      {q.difficulty === 'EASY' && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                          DE (EASY)
                        </span>
                      )}
                      {q.difficulty === 'MEDIUM' && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                          TRUNG BINH (MEDIUM)
                        </span>
                      )}
                      {q.difficulty === 'HARD' && (
                        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-800">
                          KHO (HARD)
                        </span>
                      )}

                      {/* Badge trang thai */}
                      {q.status === 'DRAFT' && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                          DRAFT
                        </span>
                      )}
                      {q.status === 'APPROVED' && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                          APPROVED
                        </span>
                      )}
                      {q.status === 'REJECTED' && (
                        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                          REJECTED
                        </span>
                      )}

                      {/* Nguon goc & Nguoi tao */}
                      <span className="text-[11px] text-on-surface-variant">
                        Nguon: {q.source === 'AI_GENERATED' ? 'Vertex AI RAG' : 'Thu cong'} | Nguoi tao: {q.creatorName}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-on-surface leading-relaxed">
                      {q.content}
                    </div>

                    {q.modelAnswer && (
                      <div className="rounded-xl bg-surface-container-low p-3 text-xs text-on-surface-variant">
                        <span className="font-bold text-on-surface">Dap an mau goi y: </span>
                        {q.modelAnswer}
                      </div>
                    )}

                    {q.expectedKeywords && q.expectedKeywords.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-on-surface-variant">Tu khoa:</span>
                        {q.expectedKeywords.map((kw, idx) => (
                          <span
                            key={idx}
                            className="rounded-md bg-surface-container-high px-2 py-0.5 text-[10px] font-medium text-on-surface"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Nut tham dinh HITL */}
                  <div className="flex items-center gap-2 sm:ml-4 sm:flex-col sm:items-end">
                    {q.status === 'DRAFT' && (
                      <>
                        <button
                          type="button"
                          disabled={!isRubricReady || approvingId === q.id}
                          onClick={() => handleApprove(q.id)}
                          title={
                            !isRubricReady
                              ? 'Khong the phe duyet: Mon hoc chua co Rubric 100% (BR-BANK-001)'
                              : 'Phe duyet dua vao ngan hang chinh thuc'
                          }
                          className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {approvingId === q.id ? 'Dang duyet...' : 'Phe duyet'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRejectModalQuestion(q)
                            setRejectReason('')
                          }}
                          className="rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                        >
                          Tu choi
                        </button>
                      </>
                    )}

                    {q.status === 'APPROVED' && (
                      <span className="text-xs font-semibold text-emerald-700">Da dua vao de thi</span>
                    )}

                    {q.status === 'REJECTED' && (
                      <span className="text-xs font-semibold text-rose-600">Da tu choi</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Tu choi kem ly do */}
        {rejectModalQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
              <h3 className="text-base font-bold text-on-surface">Tu choi cau hoi</h3>
              <p className="mt-1 text-xs text-on-surface-variant">
                Vui long nhap ly do tu choi de luu vao nhat ky kiem toan audit log (BR-BANK-007).
              </p>

              <div className="mt-4">
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Vi du: Cau hoi qua chung chung, khong bam sat noi dung slide..."
                  className="w-full rounded-xl border border-border bg-surface-container-lowest p-3 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={rejecting}
                  onClick={() => setRejectModalQuestion(null)}
                  className="rounded-xl border border-border px-3.5 py-1.5 text-xs font-semibold text-on-surface"
                >
                  Huy
                </button>
                <button
                  type="button"
                  disabled={rejecting || !rejectReason.trim()}
                  onClick={handleConfirmReject}
                  className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {rejecting ? 'Dang xu ly...' : 'Xac nhan tu choi'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Sinh cau hoi AI */}
        {generateModalOpen && (
          <GenerateQuestionModal
            chapterId={chapterId}
            readyMaterials={[]}
            onClose={() => setGenerateModalOpen(false)}
            onGenerated={() => {
              setGenerateModalOpen(false)
              loadData()
              setSuccessBanner('Da sinh cau hoi moi bang Vertex AI.')
            }}
          />
        )}
      </div>
    </LecturerLayout>
  )
}