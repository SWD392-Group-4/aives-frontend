import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { Course } from '../materials/types'
import { rubricService } from '../rubric/rubricService'
import { CourseRubric, RubricCriterion } from '../rubric/types'
import { errorText, Notify } from './shared'

interface Props {
  course: Course
  rubric: CourseRubric | null
  reloadRubric: () => Promise<void>
  notify: Notify
  onApproved: () => void
}

type Draft = { name: string; description: string; criteria: RubricCriterion[] }

function toDraft(rubric: CourseRubric | null): Draft {
  return {
    name: rubric?.name || '',
    description: rubric?.description || '',
    criteria: (rubric?.criteria || []).map((c, i) => ({ ...c, orderNo: i + 1 })),
  }
}

function snapshot(d: Draft) {
  return JSON.stringify({
    n: d.name.trim(),
    d: d.description.trim(),
    c: d.criteria.map((c) => [c.name.trim(), c.description.trim(), Number(c.weightPercent)]),
  })
}

/** Bước 2: soạn rubric (tự nhập hoặc AI đọc file) -> Lưu -> Duyệt. Duyệt xong mới mở Bước 3. */
export default function CourseRubricStep({ course, rubric, reloadRubric, notify, onApproved }: Props) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(rubric))
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setDraft(toDraft(rubric))
  }, [rubric])

  const locked = Boolean(rubric?.isLocked)
  const approved = Boolean(rubric?.approved)
  const saved = Boolean(rubric?.id)
  const dirty = snapshot(draft) !== snapshot(toDraft(rubric))
  const total = useMemo(
    () => draft.criteria.reduce((sum, c) => sum + (Number(c.weightPercent) || 0), 0),
    [draft.criteria]
  )
  const totalOk = Math.abs(total - 100) < 0.05 && draft.criteria.length > 0

  const update = (index: number, field: keyof RubricCriterion, value: any) => {
    setDraft((d) => {
      const criteria = [...d.criteria]
      criteria[index] = { ...criteria[index], [field]: value }
      return { ...d, criteria }
    })
  }

  const addCriterion = () =>
    setDraft((d) => ({
      ...d,
      criteria: [
        ...d.criteria,
        { name: '', description: '', weightPercent: Math.max(0, Math.round((100 - total) * 100) / 100), orderNo: d.criteria.length + 1 },
      ],
    }))

  const removeCriterion = (index: number) =>
    setDraft((d) => ({ ...d, criteria: d.criteria.filter((_, i) => i !== index).map((c, i) => ({ ...c, orderNo: i + 1 })) }))

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    if (draft.criteria.length > 0 && !window.confirm('Rubric đang soạn sẽ được thay bằng nội dung AI đọc từ file. Tiếp tục?')) {
      return
    }
    setExtracting(true)
    try {
      const result = await rubricService.extractRubricFromFile(course.id, file)
      setDraft({
        name: result.name || draft.name || `Rubric vấn đáp ${course.courseCode}`,
        description: result.description || '',
        criteria: result.criteria.map((c, i) => ({ ...c, orderNo: i + 1 })),
      })
      notify('success', `AI đã đọc ${result.criteria.length} tiêu chí từ "${file.name}". Kiểm tra lại rồi bấm "Lưu rubric".`)
    } catch (err: any) {
      notify('error', errorText(err, 'AI không đọc được file rubric.'))
    } finally {
      setExtracting(false)
    }
  }

  const validate = (): string | null => {
    if (!draft.name.trim()) return 'Vui lòng nhập tên rubric.'
    if (draft.criteria.length === 0) return 'Rubric phải có ít nhất 1 tiêu chí.'
    for (let i = 0; i < draft.criteria.length; i++) {
      const c = draft.criteria[i]
      if (!c.name.trim()) return `Tiêu chí #${i + 1} chưa có tên.`
      if (!c.description.trim()) return `Tiêu chí #${i + 1} chưa có mô tả.`
      if (!(Number(c.weightPercent) > 0)) return `Trọng số tiêu chí #${i + 1} phải lớn hơn 0.`
    }
    if (!totalOk) return `Tổng trọng số phải đúng 100% (hiện tại ${total.toFixed(2)}%).`
    return null
  }

  const save = async () => {
    const error = validate()
    if (error) return notify('error', error)
    setSaving(true)
    try {
      await rubricService.updateCourseRubric(course.id, {
        name: draft.name,
        description: draft.description,
        criteria: draft.criteria.map((c, i) => ({
          name: c.name,
          description: c.description,
          weightPercent: Number(c.weightPercent),
          orderNo: i + 1,
        })),
      })
      await reloadRubric()
      notify('success', 'Đã lưu rubric. Bấm "Duyệt rubric" để mở Bước 3 – Ngân hàng câu hỏi.')
    } catch (err: any) {
      notify('error', errorText(err, 'Không lưu được rubric.'))
    } finally {
      setSaving(false)
    }
  }

  const approve = async () => {
    setApproving(true)
    try {
      await rubricService.approveCourseRubric(course.id)
      await reloadRubric()
      notify('success', 'Đã duyệt rubric. Giờ bạn có thể tạo ngân hàng câu hỏi ở Bước 3.')
      onApproved()
    } catch (err: any) {
      notify('error', errorText(err, 'Không duyệt được rubric.'))
    } finally {
      setApproving(false)
    }
  }

  const statusBadge = locked
    ? { text: 'Đã khoá (môn đã có ca thi)', cls: 'bg-surface-container-high text-on-surface-variant' }
    : approved && !dirty
      ? { text: 'Đã duyệt', cls: 'bg-secondary-container text-on-secondary-container' }
      : saved && !dirty
        ? { text: 'Đã lưu – chờ duyệt', cls: 'bg-tertiary-fixed text-on-tertiary-fixed-variant' }
        : { text: 'Đang soạn – chưa lưu', cls: 'bg-error-container text-on-error-container' }

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept=".pdf,.docx,.pptx,.txt" className="hidden" onChange={handleFile} />

      <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-on-surface">Rubric môn {course.courseCode}</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusBadge.cls}`}>{statusBadge.text}</span>
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">
            Mỗi môn có 1 rubric, mọi câu hỏi của môn được chấm theo rubric này. Quy trình: soạn (hoặc AI đọc file) → Lưu → Duyệt.
          </p>
        </div>
        <div
          className={`shrink-0 rounded-xl px-4 py-2 text-center ${totalOk ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}
        >
          <p className="text-[10px] font-bold uppercase">Tổng trọng số</p>
          <p className="text-lg font-extrabold">{total.toFixed(total % 1 === 0 ? 0 : 2)}%</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-on-surface">Tên rubric</label>
          <input
            value={draft.name}
            disabled={locked}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder={`VD: Rubric vấn đáp ${course.name}`}
            className="w-full rounded-xl border border-outline-variant/60 bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary disabled:opacity-70"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-on-surface">Mô tả</label>
          <input
            value={draft.description}
            disabled={locked}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Áp dụng cho các câu hỏi vấn đáp của môn"
            className="w-full rounded-xl border border-outline-variant/60 bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary disabled:opacity-70"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-on-surface">Tiêu chí ({draft.criteria.length})</h4>
        {!locked && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={extracting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-outline px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high disabled:opacity-50"
            >
              <Icon name={extracting ? 'hourglass_top' : 'auto_awesome'} className={`text-base ${extracting ? 'animate-spin' : ''}`} />
              {extracting ? 'AI đang đọc file...' : 'AI đọc rubric từ file'}
            </button>
            <button
              type="button"
              onClick={addCriterion}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-on-primary"
            >
              <Icon name="add" className="text-base" />
              Thêm tiêu chí
            </button>
          </div>
        )}
      </div>

      {draft.criteria.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant/70 p-8 text-center text-xs text-on-surface-variant">
          Chưa có tiêu chí. Bấm &quot;AI đọc rubric từ file&quot; (PDF / Word) hoặc &quot;Thêm tiêu chí&quot; để tự nhập.
        </div>
      ) : (
        <div className="space-y-3">
          {draft.criteria.map((c, i) => (
            <div key={i} className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <span className="mt-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-[11px] font-bold">
                  {i + 1}
                </span>
                <div className="flex-1 space-y-2">
                  <input
                    value={c.name}
                    disabled={locked}
                    onChange={(e) => update(i, 'name', e.target.value)}
                    placeholder="Tên tiêu chí"
                    className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-1.5 text-sm font-semibold text-on-surface outline-none focus:border-primary disabled:opacity-70"
                  />
                  <textarea
                    value={c.description}
                    disabled={locked}
                    rows={2}
                    onChange={(e) => update(i, 'description', e.target.value)}
                    placeholder="Mô tả yêu cầu để đạt điểm"
                    className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary disabled:opacity-70"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-1 sm:mt-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={c.weightPercent}
                    disabled={locked}
                    onChange={(e) => update(i, 'weightPercent', e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-20 rounded-lg border border-outline-variant/60 bg-surface px-2 py-1.5 text-right text-sm font-bold text-on-surface outline-none focus:border-primary disabled:opacity-70"
                  />
                  <span className="text-sm font-bold text-on-surface-variant">%</span>
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => removeCriterion(i)}
                      title="Xoá tiêu chí"
                      className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-outline hover:bg-error-container hover:text-error"
                    >
                      <Icon name="delete" className="text-sm" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!locked && (
        <div className="flex flex-col-reverse gap-2 border-t border-outline-variant/30 pt-4 sm:flex-row sm:items-center sm:justify-end">
          {dirty && saved && (
            <button
              type="button"
              onClick={() => setDraft(toDraft(rubric))}
              className="rounded-full px-4 py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
            >
              Huỷ thay đổi
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving || (!dirty && saved)}
            className="rounded-full border border-primary px-5 py-2 text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-40"
          >
            {saving ? 'Đang lưu...' : 'Lưu rubric'}
          </button>
          <button
            type="button"
            onClick={approve}
            disabled={approving || !saved || dirty || approved || !totalOk}
            title={dirty ? 'Lưu rubric trước khi duyệt' : approved ? 'Rubric đã được duyệt' : ''}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-on-primary hover:bg-primary/90 disabled:opacity-40"
          >
            <Icon name="verified" className="text-base" />
            {approving ? 'Đang duyệt...' : approved && !dirty ? 'Đã duyệt' : 'Duyệt rubric'}
          </button>
        </div>
      )}
      {approved && !dirty && !locked && (
        <p className="text-right text-[11px] text-on-surface-variant">
          Sửa và lưu lại rubric sẽ đưa rubric về trạng thái chờ duyệt.
        </p>
      )}
    </div>
  )
}
