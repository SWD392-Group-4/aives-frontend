import { useCallback, useEffect, useMemo, useState } from 'react'
import ConfirmModal from '../../components/ConfirmModal.jsx'
import Icon from '../../components/Icon.jsx'
import Modal from '../../components/Modal.jsx'
import { materialService } from '../materials/materialService'
import { Chapter, Course } from '../materials/types'
import { questionService } from '../questions/questionService'
import { Question, QuestionDifficulty } from '../questions/types'
import { DIFFICULTY_LABEL, errorText, Notify, STATUS_LABEL } from './shared'

interface Props {
  course: Course
  chapters: Chapter[]
  rubricApproved: boolean
  notify: Notify
  goToRubric: () => void
  /** Gọi sau khi số câu hỏi thay đổi (để cập nhật số liệu ở thanh bước) */
  onChanged?: () => void
}

type Quota = { checked: boolean; count: number }
type QuestionForm = {
  chapterId: string
  content: string
  difficulty: QuestionDifficulty
  modelAnswer: string
  keywords: string
}

const EMPTY_FORM: QuestionForm = { chapterId: '', content: '', difficulty: 'MEDIUM', modelAnswer: '', keywords: '' }

const DIFF_CLS: Record<string, string> = {
  EASY: 'bg-secondary-container text-on-secondary-container',
  MEDIUM: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  HARD: 'bg-error-container text-on-error-container',
}
const STATUS_CLS: Record<string, string> = {
  DRAFT: 'bg-surface-container-high text-on-surface-variant',
  APPROVED: 'bg-secondary-container text-on-secondary-container',
  REJECTED: 'bg-error-container text-on-error-container',
  ARCHIVED: 'bg-surface-container-high text-outline',
}

/** Bước 3: sinh câu hỏi từ tài liệu của các chương được chọn, rồi duyệt / sửa / xoá. */
export default function CourseQuestionBankStep({ course, chapters, rubricApproved, notify, goToRubric, onChanged }: Props) {
  const [readyByChapter, setReadyByChapter] = useState<Record<string, number>>({})
  const [quota, setQuota] = useState<Record<string, Quota>>({})
  const [ratio, setRatio] = useState({ easyPercent: 40, mediumPercent: 40, hardPercent: 20 })
  const [generating, setGenerating] = useState(false)

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState({ chapterId: 'ALL', status: 'ALL', difficulty: 'ALL' })
  const [busyId, setBusyId] = useState<string | null>(null)
  const [approvingAll, setApprovingAll] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Question | null>(null)
  const [form, setForm] = useState<QuestionForm>(EMPTY_FORM)
  const [savingForm, setSavingForm] = useState(false)
  const [deleting, setDeleting] = useState<Question | null>(null)

  const chapterName = useMemo(() => Object.fromEntries(chapters.map((c) => [c.id, c.name])), [chapters])

  // Số tài liệu READY của từng chương (chương không có tài liệu thì không sinh được)
  useEffect(() => {
    let cancelled = false
    Promise.all(
      chapters.map(async (c) => {
        const list = await materialService.getChapterMaterials(c.id).catch(() => [])
        return [c.id, list.filter((m) => m.ragStatus === 'READY').length] as const
      })
    ).then((entries) => {
      if (cancelled) return
      const ready = Object.fromEntries(entries)
      setReadyByChapter(ready)
      setQuota((prev) => {
        const next: Record<string, Quota> = {}
        chapters.forEach((c) => {
          next[c.id] = prev[c.id] ?? { checked: (ready[c.id] ?? 0) > 0, count: 5 }
        })
        return next
      })
    })
    return () => {
      cancelled = true
    }
  }, [chapters])

  const loadQuestions = useCallback(async () => {
    setLoading(true)
    try {
      setQuestions(await questionService.getCourseQuestions(course.id))
    } catch (err: any) {
      notify('error', errorText(err, 'Không tải được ngân hàng câu hỏi.'))
    } finally {
      setLoading(false)
    }
  }, [course.id, notify])

  useEffect(() => {
    if (rubricApproved) loadQuestions()
  }, [rubricApproved, loadQuestions])

  const filtered = questions.filter(
    (q) =>
      (filter.chapterId === 'ALL' || q.chapterId === filter.chapterId) &&
      (filter.status === 'ALL' || q.status === filter.status) &&
      (filter.difficulty === 'ALL' || q.difficulty === filter.difficulty)
  )
  const drafts = filtered.filter((q) => q.status === 'DRAFT')
  const counts = {
    total: questions.length,
    approved: questions.filter((q) => q.status === 'APPROVED').length,
    draft: questions.filter((q) => q.status === 'DRAFT').length,
  }

  const selected = chapters.filter((c) => quota[c.id]?.checked)
  const totalSelected = selected.reduce((s, c) => s + (quota[c.id]?.count || 0), 0)
  const ratioSum = ratio.easyPercent + ratio.mediumPercent + ratio.hardPercent

  if (!rubricApproved) {
    return (
      <div className="rounded-2xl border border-dashed border-outline-variant/70 bg-surface-container-lowest p-10 text-center">
        <Icon name="lock" className="mx-auto mb-2 text-4xl text-outline" />
        <h3 className="text-sm font-bold text-on-surface">Ngân hàng câu hỏi đang khoá</h3>
        <p className="mx-auto mt-1 max-w-md text-xs text-on-surface-variant">
          Rubric của môn {course.courseCode} phải được lưu đủ 100% và <b>duyệt</b> trước khi tạo ngân hàng câu hỏi.
        </p>
        <button
          type="button"
          onClick={goToRubric}
          className="mt-4 rounded-full bg-primary px-5 py-2 text-xs font-bold text-on-primary hover:bg-primary/90"
        >
          Đến Bước 2 – Rubric
        </button>
      </div>
    )
  }

  /* ---------- Sinh câu hỏi ---------- */
  const generate = async () => {
    if (selected.length === 0) return notify('error', 'Hãy chọn ít nhất 1 chương.')
    if (ratioSum !== 100) return notify('error', `Tổng tỉ lệ độ khó phải bằng 100% (hiện tại ${ratioSum}%).`)
    const noMaterial = selected.filter((c) => !readyByChapter[c.id])
    if (noMaterial.length > 0) {
      return notify('error', `Chương chưa có tài liệu sẵn sàng: ${noMaterial.map((c) => c.name).join(', ')}. Tải tài liệu ở Bước 1.`)
    }
    setGenerating(true)
    try {
      const created = await questionService.generateCourseQuestions(course.id, {
        chapters: selected.map((c) => ({ chapterId: c.id, count: quota[c.id].count })),
        difficultyRatio: ratio,
      })
      notify('success', `AI đã sinh ${created.length} câu hỏi nháp từ ${selected.length} chương. Hãy xem lại và duyệt.`)
      setFilter({ chapterId: 'ALL', status: 'DRAFT', difficulty: 'ALL' })
      await loadQuestions()
      onChanged?.()
    } catch (err: any) {
      notify('error', errorText(err, 'AI không sinh được câu hỏi.'))
    } finally {
      setGenerating(false)
    }
  }

  /* ---------- Duyệt / từ chối / xoá ---------- */
  const replace = (q: Question) => setQuestions((list) => list.map((x) => (x.id === q.id ? { ...x, ...q } : x)))

  const approve = async (q: Question) => {
    setBusyId(q.id)
    try {
      replace(await questionService.approveQuestion(q.id))
    } catch (err: any) {
      notify('error', errorText(err, 'Không duyệt được câu hỏi.'))
    } finally {
      setBusyId(null)
    }
  }

  const reject = async (q: Question) => {
    setBusyId(q.id)
    try {
      replace(await questionService.rejectQuestion(q.id))
    } catch (err: any) {
      notify('error', errorText(err, 'Không từ chối được câu hỏi.'))
    } finally {
      setBusyId(null)
    }
  }

  const approveAll = async () => {
    setApprovingAll(true)
    let ok = 0
    for (const q of drafts) {
      try {
        replace(await questionService.approveQuestion(q.id))
        ok++
      } catch (err: any) {
        notify('error', errorText(err, 'Dừng duyệt vì có lỗi.'))
        break
      }
    }
    setApprovingAll(false)
    if (ok > 0) notify('success', `Đã duyệt ${ok} câu hỏi.`)
  }

  const removeQuestion = async () => {
    if (!deleting) return
    try {
      await questionService.deleteQuestion(deleting.id)
    } catch (err: any) {
      throw { message: errorText(err, 'Không xoá được câu hỏi.') }
    }
    setQuestions((list) => list.filter((q) => q.id !== deleting.id))
    setDeleting(null)
    onChanged?.()
  }

  /* ---------- Thêm / sửa thủ công ---------- */
  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, chapterId: filter.chapterId !== 'ALL' ? filter.chapterId : chapters[0]?.id || '' })
    setFormOpen(true)
  }

  const openEdit = (q: Question) => {
    setEditing(q)
    setForm({
      chapterId: q.chapterId,
      content: q.content,
      difficulty: q.difficulty,
      modelAnswer: q.modelAnswer || '',
      keywords: (q.expectedKeywords || []).join(', '),
    })
    setFormOpen(true)
  }

  const saveForm = async () => {
    if (!form.content.trim()) return notify('error', 'Nội dung câu hỏi không được để trống.')
    if (!form.chapterId) return notify('error', 'Hãy chọn chương.')
    const keywords = form.keywords.split(',').map((k) => k.trim()).filter(Boolean)
    setSavingForm(true)
    try {
      if (editing) {
        replace(
          await questionService.updateQuestion(editing.id, {
            content: form.content.trim(),
            difficulty: form.difficulty,
            modelAnswer: form.modelAnswer.trim(),
            expectedKeywords: keywords,
          })
        )
        notify('success', 'Đã cập nhật câu hỏi.')
      } else {
        await questionService.createQuestion(form.chapterId, {
          content: form.content.trim(),
          difficulty: form.difficulty,
          modelAnswer: form.modelAnswer.trim() || undefined,
          expectedKeywords: keywords,
        })
        notify('success', 'Đã thêm câu hỏi (trạng thái Nháp).')
        await loadQuestions()
        onChanged?.()
      }
      setFormOpen(false)
    } catch (err: any) {
      notify('error', errorText(err, 'Không lưu được câu hỏi.'))
    } finally {
      setSavingForm(false)
    }
  }

  const selectCls =
    'rounded-xl border border-outline-variant/60 bg-surface px-3 py-1.5 text-xs font-semibold text-on-surface outline-none focus:border-primary'

  return (
    <div className="space-y-5">
      {/* ---------- Sinh câu hỏi bằng AI ---------- */}
      <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-4">
        <div className="flex items-center gap-2">
          <Icon name="auto_awesome" className="text-lg text-primary" />
          <h3 className="text-sm font-bold text-on-surface">Sinh câu hỏi bằng AI từ tài liệu các chương</h3>
        </div>
        <p className="mt-1 text-xs text-on-surface-variant">
          Chọn chương và số câu cho mỗi chương. AI chỉ hỏi kiến thức có trong tài liệu của chương đó.
        </p>

        {chapters.length === 0 ? (
          <p className="mt-3 text-xs text-error">Môn chưa có chương. Thêm chương và tài liệu ở Bước 1.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-xl border border-outline-variant/40">
            <table className="w-full text-xs">
              <thead className="bg-surface-container-low text-left text-on-surface-variant">
                <tr>
                  <th className="w-10 px-3 py-2" />
                  <th className="px-3 py-2">Chương</th>
                  <th className="px-3 py-2">Tài liệu sẵn sàng</th>
                  <th className="w-28 px-3 py-2">Số câu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {chapters.map((c) => {
                  const ready = readyByChapter[c.id] ?? 0
                  const q = quota[c.id] ?? { checked: false, count: 5 }
                  return (
                    <tr key={c.id} className={ready === 0 ? 'opacity-60' : ''}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={q.checked}
                          disabled={ready === 0}
                          onChange={(e) => setQuota((p) => ({ ...p, [c.id]: { ...q, checked: e.target.checked } }))}
                        />
                      </td>
                      <td className="px-3 py-2 font-semibold text-on-surface">{c.name}</td>
                      <td className="px-3 py-2 text-on-surface-variant">{ready > 0 ? `${ready} file` : 'Chưa có – tải ở Bước 1'}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={q.count}
                          disabled={!q.checked}
                          onChange={(e) =>
                            setQuota((p) => ({
                              ...p,
                              [c.id]: { ...q, count: Math.min(20, Math.max(1, Number(e.target.value) || 1)) },
                            }))
                          }
                          className="w-20 rounded-lg border border-outline-variant/60 bg-surface px-2 py-1 text-right font-bold outline-none focus:border-primary disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3 text-xs">
            {(
              [
                ['easyPercent', 'Dễ'],
                ['mediumPercent', 'Trung bình'],
                ['hardPercent', 'Khó'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="space-y-1">
                <span className="block font-semibold text-on-surface-variant">{label} (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={ratio[key]}
                  onChange={(e) => setRatio((r) => ({ ...r, [key]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                  className="w-20 rounded-lg border border-outline-variant/60 bg-surface px-2 py-1 text-right font-bold outline-none focus:border-primary"
                />
              </label>
            ))}
            <span className={`pb-1 font-bold ${ratioSum === 100 ? 'text-secondary' : 'text-error'}`}>Tổng {ratioSum}%</span>
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={generating || selected.length === 0}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-on-primary hover:bg-primary/90 disabled:opacity-40"
          >
            <Icon name={generating ? 'hourglass_top' : 'auto_awesome'} className={`text-base ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'AI đang sinh câu hỏi...' : `Sinh ${totalSelected} câu từ ${selected.length} chương`}
          </button>
        </div>
      </div>

      {/* ---------- Danh sách câu hỏi ---------- */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-on-surface">Ngân hàng câu hỏi môn {course.courseCode}</h3>
            <span className="text-xs text-on-surface-variant">
              {counts.total} câu · {counts.approved} đã duyệt · {counts.draft} nháp
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={filter.chapterId} onChange={(e) => setFilter((f) => ({ ...f, chapterId: e.target.value }))} className={selectCls}>
              <option value="ALL">Tất cả chương</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))} className={selectCls}>
              <option value="ALL">Mọi trạng thái</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select value={filter.difficulty} onChange={(e) => setFilter((f) => ({ ...f, difficulty: e.target.value }))} className={selectCls}>
              <option value="ALL">Mọi độ khó</option>
              {Object.entries(DIFFICULTY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={openCreate}
              disabled={chapters.length === 0}
              className="rounded-xl border border-primary bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-on-primary disabled:opacity-40"
            >
              + Tự thêm câu hỏi
            </button>
            <button
              type="button"
              onClick={approveAll}
              disabled={approvingAll || drafts.length === 0}
              className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-on-secondary hover:bg-secondary/90 disabled:opacity-40"
            >
              {approvingAll ? 'Đang duyệt...' : `Duyệt tất cả nháp (${drafts.length})`}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="p-6 text-center text-xs text-on-surface-variant">Đang tải câu hỏi...</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant/70 p-8 text-center text-xs text-on-surface-variant">
            {questions.length === 0 ? 'Chưa có câu hỏi. Sinh bằng AI ở khung phía trên hoặc tự thêm.' : 'Không có câu hỏi khớp bộ lọc.'}
          </div>
        ) : (
          filtered.map((q, idx) => (
            <div key={q.id} className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-4">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                <span className="text-outline">#{idx + 1}</span>
                <span className="rounded-md bg-primary-fixed px-2 py-0.5 text-primary">{chapterName[q.chapterId] || 'Chương'}</span>
                <span className={`rounded-md px-2 py-0.5 ${DIFF_CLS[q.difficulty] || ''}`}>{DIFFICULTY_LABEL[q.difficulty] || q.difficulty}</span>
                <span className={`rounded-md px-2 py-0.5 ${STATUS_CLS[q.status] || ''}`}>{STATUS_LABEL[q.status] || q.status}</span>
                <span className="text-outline">{q.source === 'AI_GENERATED' ? 'AI sinh' : 'Thủ công'}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-on-surface">{q.content}</p>
              {q.modelAnswer && (
                <p className="mt-1.5 rounded-lg bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
                  <b className="text-on-surface">Đáp án mẫu:</b> {q.modelAnswer}
                </p>
              )}
              {q.expectedKeywords && q.expectedKeywords.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {q.expectedKeywords.map((k) => (
                    <span key={k} className="rounded-md bg-surface-container px-1.5 py-0.5 text-[11px] text-on-surface-variant">
                      {k}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-wrap justify-end gap-1.5">
                {q.status !== 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => approve(q)}
                    disabled={busyId === q.id}
                    className="rounded-lg bg-secondary px-3 py-1 text-xs font-semibold text-on-secondary hover:bg-secondary/90 disabled:opacity-50"
                  >
                    Duyệt
                  </button>
                )}
                {q.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => reject(q)}
                    disabled={busyId === q.id}
                    className="rounded-lg border border-error/40 px-3 py-1 text-xs font-semibold text-error hover:bg-error-container disabled:opacity-50"
                  >
                    Từ chối
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEdit(q)}
                  className="rounded-lg border border-outline-variant px-3 py-1 text-xs font-semibold text-on-surface hover:bg-surface-container"
                >
                  Sửa
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(q)}
                  className="rounded-lg px-3 py-1 text-xs font-semibold text-outline hover:bg-error-container hover:text-error"
                >
                  Xoá
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {formOpen && (
        <Modal title={editing ? 'Sửa câu hỏi' : 'Thêm câu hỏi'} onClose={() => !savingForm && setFormOpen(false)}>
          <div className="space-y-3 text-sm">
            {!editing && (
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-on-surface">Chương</span>
                <select
                  value={form.chapterId}
                  onChange={(e) => setForm((f) => ({ ...f, chapterId: e.target.value }))}
                  className={`${selectCls} w-full`}
                >
                  {chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-on-surface">Câu hỏi</span>
              <textarea
                rows={3}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                className="w-full rounded-xl border border-outline-variant/60 bg-surface px-3 py-2 outline-none focus:border-primary"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-on-surface">Độ khó</span>
              <select
                value={form.difficulty}
                onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as QuestionDifficulty }))}
                className={`${selectCls} w-full`}
              >
                {Object.entries(DIFFICULTY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-on-surface">Đáp án mẫu</span>
              <textarea
                rows={3}
                value={form.modelAnswer}
                onChange={(e) => setForm((f) => ({ ...f, modelAnswer: e.target.value }))}
                className="w-full rounded-xl border border-outline-variant/60 bg-surface px-3 py-2 outline-none focus:border-primary"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-on-surface">Từ khoá kỳ vọng (cách nhau bằng dấu phẩy)</span>
              <input
                value={form.keywords}
                onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                className="w-full rounded-xl border border-outline-variant/60 bg-surface px-3 py-2 outline-none focus:border-primary"
              />
            </label>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                disabled={savingForm}
                onClick={() => setFormOpen(false)}
                className="rounded-full px-5 py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={savingForm}
                onClick={saveForm}
                className="rounded-full bg-primary px-6 py-2 text-xs font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50"
              >
                {savingForm ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmModal
          title="Xoá câu hỏi"
          message="Xoá câu hỏi này khỏi ngân hàng?"
          confirmLabel="Xoá"
          cancelLabel="Huỷ"
          pendingLabel="Đang xoá..."
          icon="delete"
          danger
          onClose={() => setDeleting(null)}
          onConfirm={removeQuestion}
        />
      )}
    </div>
  )
}
