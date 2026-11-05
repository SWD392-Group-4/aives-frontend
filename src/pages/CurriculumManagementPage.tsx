import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal.jsx'
import Icon from '../components/Icon.jsx'
import Modal from '../components/Modal.jsx'
import LecturerLayout from '../components/LecturerLayout'
import TextField from '../components/TextField'
import { ROLES } from '../constants/roles.js'
import CourseChaptersStep from '../features/course/CourseChaptersStep'
import CourseQuestionBankStep from '../features/course/CourseQuestionBankStep'
import CourseRubricStep from '../features/course/CourseRubricStep'
import { errorText } from '../features/course/shared'
import { materialService } from '../features/materials/materialService'
import { Chapter, Course } from '../features/materials/types'
import { rubricService } from '../features/rubric/rubricService'
import { CourseRubric } from '../features/rubric/types'
import { useAuth } from '../hooks/useAuth.js'

type Banner = { type: 'success' | 'error'; message: string } | null
type Step = '1' | '2' | '3'

const EMPTY_COURSE = { courseCode: '', name: '', description: '' }

/**
 * Môn học & Ngân hàng câu hỏi – 1 trang, 3 bước cho mỗi môn:
 *   Bước 1: Chương & tài liệu  ->  Bước 2: Rubric (lưu + duyệt)  ->  Bước 3: Ngân hàng câu hỏi (mở khi rubric đã duyệt)
 * Admin tạo / sửa / xoá môn học; giảng viên và admin làm 3 bước.
 */
export default function CurriculumManagementPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === ROLES.ADMIN
  const [params, setParams] = useSearchParams()
  const courseId = params.get('courseId') || ''
  const step = (['1', '2', '3'].includes(params.get('step') || '') ? params.get('step') : '1') as Step

  const [banner, setBanner] = useState<Banner>(null)
  const notify = useCallback((type: 'success' | 'error', message: string) => {
    setBanner({ type, message })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [search, setSearch] = useState('')
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [rubric, setRubric] = useState<CourseRubric | null>(null)
  const [loadingCourseData, setLoadingCourseData] = useState(false)

  const [courseModal, setCourseModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE)
  const [courseError, setCourseError] = useState('')
  const [savingCourse, setSavingCourse] = useState(false)
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null)

  const go = useCallback(
    (next: { courseId?: string; step?: Step }) => {
      const p = new URLSearchParams(params)
      if (next.courseId !== undefined) {
        if (next.courseId) p.set('courseId', next.courseId)
        else p.delete('courseId')
      }
      if (next.step) p.set('step', next.step)
      setParams(p, { replace: true })
    },
    [params, setParams]
  )

  const loadCourses = useCallback(async () => {
    setLoadingCourses(true)
    try {
      const list = await materialService.getCourses()
      setCourses(list)
      return list
    } catch (err: any) {
      notify('error', errorText(err, 'Không tải được danh sách môn học.'))
      return []
    } finally {
      setLoadingCourses(false)
    }
  }, [notify])

  const reloadChapters = useCallback(async () => {
    if (!courseId) {
      setChapters([])
      return
    }
    const list = await materialService.getChapters(courseId).catch(() => [])
    setChapters([...list].sort((a, b) => a.orderNo - b.orderNo))
  }, [courseId])

  const reloadRubric = useCallback(async () => {
    if (!courseId) {
      setRubric(null)
      return
    }
    try {
      setRubric(await rubricService.getCourseRubric(courseId))
    } catch (err: any) {
      setRubric(null)
      notify('error', errorText(err, 'Không tải được rubric.'))
    }
  }, [courseId, notify])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  // Chưa chọn môn hoặc môn đã bị xoá -> chọn môn đầu tiên
  useEffect(() => {
    if (loadingCourses) return
    if (!courses.some((c) => c.id === courseId)) go({ courseId: courses[0]?.id || '' })
  }, [courses, courseId, loadingCourses, go])

  useEffect(() => {
    setLoadingCourseData(true)
    Promise.all([reloadChapters(), reloadRubric()]).finally(() => setLoadingCourseData(false))
  }, [reloadChapters, reloadRubric])

  const course = courses.find((c) => c.id === courseId) || null
  const filteredCourses = useMemo(() => {
    const k = search.trim().toLowerCase()
    return k ? courses.filter((c) => c.courseCode.toLowerCase().includes(k) || c.name.toLowerCase().includes(k)) : courses
  }, [courses, search])

  const rubricApproved = Boolean(rubric?.approved)
  const totalMaterials = chapters.reduce((s, c) => s + (c.materialCount || 0), 0)
  const totalQuestions = chapters.reduce((s, c) => s + (c.questionCount || 0), 0)

  /* ---------- CRUD môn học (Admin) ---------- */
  const openCreateCourse = () => {
    setEditingCourse(null)
    setCourseForm(EMPTY_COURSE)
    setCourseError('')
    setCourseModal(true)
  }

  const openEditCourse = (c: Course) => {
    setEditingCourse(c)
    setCourseForm({ courseCode: c.courseCode, name: c.name, description: c.description || '' })
    setCourseError('')
    setCourseModal(true)
  }

  const saveCourse = async () => {
    const courseCode = courseForm.courseCode.trim()
    const name = courseForm.name.trim()
    if (!courseCode || !name) return setCourseError('Vui lòng nhập mã môn và tên môn.')
    if (!/^[A-Za-z0-9_.-]+$/.test(courseCode)) return setCourseError('Mã môn chỉ gồm chữ, số và các ký tự _ . -')
    const payload = { courseCode, name, description: courseForm.description.trim() || undefined }
    setSavingCourse(true)
    try {
      if (editingCourse) {
        await materialService.updateCourse(editingCourse.id, payload)
        await loadCourses()
        notify('success', `Đã cập nhật môn ${courseCode.toUpperCase()}.`)
      } else {
        const created = await materialService.createCourse(payload)
        await loadCourses()
        go({ courseId: created.id, step: '1' })
        notify('success', `Đã tạo môn ${created.courseCode}. Tiếp theo: thêm chương và tài liệu.`)
      }
      setCourseModal(false)
    } catch (err: any) {
      setCourseError(errorText(err, 'Không lưu được môn học.'))
    } finally {
      setSavingCourse(false)
    }
  }

  const deleteCourse = async () => {
    if (!deletingCourse) return
    try {
      await materialService.deleteCourse(deletingCourse.id)
    } catch (err: any) {
      throw { message: errorText(err, 'Không xoá được môn học.') }
    }
    notify('success', `Đã xoá môn ${deletingCourse.courseCode}.`)
    setDeletingCourse(null)
    await loadCourses()
  }

  /* ---------- Thanh bước ---------- */
  const steps: Array<{ key: Step; title: string; hint: string; done: boolean; locked?: boolean }> = [
    {
      key: '1',
      title: 'Chương & tài liệu',
      hint: `${chapters.length} chương · ${totalMaterials} tài liệu`,
      done: chapters.length > 0 && totalMaterials > 0,
    },
    {
      key: '2',
      title: 'Rubric',
      hint: rubricApproved ? 'Đã duyệt' : rubric?.id ? 'Chờ duyệt' : 'Chưa có',
      done: rubricApproved,
    },
    {
      key: '3',
      title: 'Ngân hàng câu hỏi',
      hint: rubricApproved ? `${totalQuestions} câu hỏi` : 'Khoá – cần duyệt rubric',
      done: totalQuestions > 0,
      locked: !rubricApproved,
    },
  ]

  return (
    <LecturerLayout breadcrumbs={[{ label: 'Môn học & Ngân hàng câu hỏi' }]}>
      <div className="space-y-5">
        {banner && (
          <div
            className={`flex items-start justify-between gap-3 rounded-2xl p-4 shadow-sm ${
              banner.type === 'success' ? 'bg-secondary-fixed/50 text-on-secondary-fixed-variant' : 'bg-error-container text-on-error-container'
            }`}
          >
            <div className="flex items-start gap-2">
              <Icon name={banner.type === 'success' ? 'check_circle' : 'error'} className="text-xl" />
              <span className="text-sm font-semibold">{banner.message}</span>
            </div>
            <button type="button" onClick={() => setBanner(null)} className="rounded-full p-1 hover:bg-black/10" aria-label="Đóng">
              <Icon name="close" className="text-lg" />
            </button>
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">Môn học & Ngân hàng câu hỏi</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Chọn môn → Bước 1 thêm chương và tài liệu → Bước 2 lập và duyệt Rubric → Bước 3 sinh và duyệt câu hỏi.
          </p>
        </div>

        {loadingCourses && courses.length === 0 ? (
          <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-16 text-center text-sm text-on-surface-variant">
            Đang tải danh sách môn học...
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-outline-variant/80 bg-surface-container-lowest p-12 text-center">
            <Icon name="school" className="mx-auto mb-3 text-4xl text-primary" />
            <h3 className="text-base font-bold text-on-surface">Chưa có môn học nào</h3>
            {isAdmin ? (
              <button
                type="button"
                onClick={openCreateCourse}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-on-primary hover:bg-primary/90"
              >
                <Icon name="add" className="text-base" />
                Tạo môn học
              </button>
            ) : (
              <p className="mt-1 text-sm text-on-surface-variant">Môn học do Quản trị viên tạo. Hãy liên hệ Admin.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* ---------- Danh sách môn ---------- */}
            <aside className="space-y-3 lg:col-span-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-on-surface">Môn học ({courses.length})</h2>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={openCreateCourse}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-on-primary hover:bg-primary/90"
                  >
                    <Icon name="add" className="text-sm" />
                    Thêm
                  </button>
                )}
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã / tên môn..."
                className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-xs outline-none focus:border-primary"
              />
              <div className="space-y-2">
                {filteredCourses.map((c) => {
                  const active = c.id === courseId
                  return (
                    <div
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => go({ courseId: c.id, step: '1' })}
                      onKeyDown={(e) => e.key === 'Enter' && go({ courseId: c.id, step: '1' })}
                      className={`group cursor-pointer rounded-xl border p-3 transition-all ${
                        active
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="rounded-md bg-primary-fixed px-1.5 py-0.5 text-[10px] font-bold text-primary">{c.courseCode}</span>
                          <p className="mt-1 truncate text-sm font-semibold text-on-surface">{c.name}</p>
                          <p className="text-[11px] text-on-surface-variant">{c.chapterCount ?? 0} chương</p>
                        </div>
                        {isAdmin && (
                          <div className="flex shrink-0 gap-0.5 opacity-70 group-hover:opacity-100">
                            <button
                              type="button"
                              title="Sửa môn"
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditCourse(c)
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded-md text-outline hover:bg-surface-container"
                            >
                              <Icon name="edit" className="text-sm" />
                            </button>
                            <button
                              type="button"
                              title="Xoá môn"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeletingCourse(c)
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded-md text-outline hover:bg-error-container hover:text-error"
                            >
                              <Icon name="delete" className="text-sm" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </aside>

            {/* ---------- Khu làm việc của môn ---------- */}
            <section className="space-y-4 lg:col-span-9">
              {course && (
                <>
                  <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="rounded-md bg-primary-fixed px-2 py-0.5 text-xs font-bold text-primary">{course.courseCode}</span>
                      <h2 className="text-lg font-bold text-on-surface">{course.name}</h2>
                    </div>
                    {course.description && <p className="mt-1 text-xs text-on-surface-variant">{course.description}</p>}

                    <ol className="mt-4 grid gap-2 sm:grid-cols-3">
                      {steps.map((s) => {
                        const active = s.key === step
                        return (
                          <li key={s.key}>
                            <button
                              type="button"
                              onClick={() => go({ step: s.key })}
                              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                                active
                                  ? 'border-primary bg-primary text-on-primary shadow-sm'
                                  : 'border-outline-variant/40 bg-surface hover:bg-surface-container-low'
                              }`}
                            >
                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                  active
                                    ? 'bg-on-primary text-primary'
                                    : s.done && !s.locked
                                      ? 'bg-secondary text-on-secondary'
                                      : 'bg-surface-container-high text-on-surface-variant'
                                }`}
                              >
                                {s.locked ? <Icon name="lock" className="text-sm" /> : s.done && !active ? <Icon name="check" className="text-sm" /> : s.key}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-xs font-bold">Bước {s.key}: {s.title}</span>
                                <span className={`block truncate text-[11px] ${active ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>{s.hint}</span>
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ol>
                  </div>

                  <div className="rounded-2xl border border-outline-variant/30 bg-surface p-4 sm:p-5">
                    {loadingCourseData ? (
                      <p className="p-8 text-center text-sm text-on-surface-variant">Đang tải dữ liệu môn học...</p>
                    ) : step === '1' ? (
                      <CourseChaptersStep course={course} chapters={chapters} reloadChapters={reloadChapters} notify={notify} />
                    ) : step === '2' ? (
                      <CourseRubricStep
                        course={course}
                        rubric={rubric}
                        reloadRubric={reloadRubric}
                        notify={notify}
                        onApproved={() => go({ step: '3' })}
                      />
                    ) : (
                      <CourseQuestionBankStep
                        course={course}
                        chapters={chapters}
                        rubricApproved={rubricApproved}
                        notify={notify}
                        goToRubric={() => go({ step: '2' })}
                        onChanged={reloadChapters}
                      />
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {courseModal && (
          <Modal title={editingCourse ? 'Sửa môn học' : 'Tạo môn học'} onClose={() => !savingCourse && setCourseModal(false)}>
            <div className="space-y-4">
              <TextField
                id="course-code"
                label="Mã môn"
                required
                icon="tag"
                value={courseForm.courseCode}
                onChange={(e) => {
                  setCourseForm((p) => ({ ...p, courseCode: e.target.value }))
                  setCourseError('')
                }}
                placeholder="VD: MATH6"
                inputProps={{ maxLength: 50 }}
              />
              <TextField
                id="course-name"
                label="Tên môn"
                required
                icon="school"
                value={courseForm.name}
                onChange={(e) => {
                  setCourseForm((p) => ({ ...p, name: e.target.value }))
                  setCourseError('')
                }}
                placeholder="VD: Toán lớp 6"
                inputProps={{ maxLength: 200 }}
                error={courseError}
              />
              <div className="space-y-1.5">
                <label htmlFor="course-desc" className="block text-label-md text-on-surface">
                  Mô tả
                </label>
                <textarea
                  id="course-desc"
                  rows={3}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-2xl bg-surface-container-low p-3.5 text-body-md text-on-surface shadow-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  disabled={savingCourse}
                  onClick={() => setCourseModal(false)}
                  className="rounded-full px-5 py-2.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  disabled={savingCourse}
                  onClick={saveCourse}
                  className="rounded-full bg-primary px-6 py-2.5 text-xs font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50"
                >
                  {savingCourse ? 'Đang lưu...' : editingCourse ? 'Lưu thay đổi' : 'Tạo môn học'}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {deletingCourse && (
          <ConfirmModal
            title="Xoá môn học"
            message={`Xoá môn ${deletingCourse.courseCode} – ${deletingCourse.name}? Chỉ xoá được khi môn chưa có tài liệu, câu hỏi và chưa dùng cho ca thi. Các chương rỗng và rubric sẽ bị xoá theo.`}
            confirmLabel="Xoá"
            cancelLabel="Huỷ"
            pendingLabel="Đang xoá..."
            icon="delete"
            danger
            onClose={() => setDeletingCourse(null)}
            onConfirm={deleteCourse}
          />
        )}
      </div>
    </LecturerLayout>
  )
}
