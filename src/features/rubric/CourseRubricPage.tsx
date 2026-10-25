import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LecturerLayout from '../../components/LecturerLayout'
import { materialService } from '../materials/materialService'
import { Course } from '../materials/types'
import { rubricService } from './rubricService'
import { CourseRubric, RubricCriterion } from './types'

export default function CourseRubricPage() {
  const navigate = useNavigate()
  const { courseId: paramCourseId } = useParams<{ courseId?: string }>()
  const [courses, setCourses] = useState<Course[]>([])
  const [courseId, setCourseId] = useState(paramCourseId || 'SWD392')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rubric, setRubric] = useState<CourseRubric | null>(null)
  const [criteria, setCriteria] = useState<RubricCriterion[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    const initCourses = async () => {
      try {
        const list = await materialService.getCourses()
        if (list.length > 0) {
          setCourses(list)
          if (!paramCourseId) setCourseId(list[0].id)
        }
      } catch (err: any) {
        console.error('Lỗi tải danh mục môn học:', err)
      }
    }
    initCourses()
  }, [])

  const loadRubric = async (cId: string) => {
    setLoading(true)
    setBanner(null)
    try {
      const data = await rubricService.getCourseRubric(cId)
      setRubric(data)
      setName(data.name || `Rubric chuẩn môn ${cId}`)
      setDescription(data.description || '')
      setCriteria(data.criteria || [])
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err?.message || 'Không thể tải Rubric của môn học.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRubric(courseId)
  }, [courseId])

  const totalWeight = useMemo(() => {
    return criteria.reduce((sum, item) => sum + (Number(item.weightPercent) || 0), 0)
  }, [criteria])

  const isExact100 = Math.abs(totalWeight - 100) < 0.05
  const isLocked = Boolean(rubric?.isLocked)

  const handleCriterionChange = (index: number, field: keyof RubricCriterion, value: any) => {
    if (isLocked) return
    setCriteria((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleAddCriterion = () => {
    if (isLocked) return
    const newOrder = criteria.length + 1
    const defaultWeight = Math.max(0, 100 - totalWeight)
    setCriteria((prev) => [
      ...prev,
      {
        name: `Tiêu chí ${newOrder}`,
        description: 'Mô tả tiêu chuẩn đánh giá của tiêu chí này.',
        weightPercent: defaultWeight,
        orderNo: newOrder,
      },
    ])
  }

  const handleRemoveCriterion = (index: number) => {
    if (isLocked) return
    setCriteria((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (isLocked) {
      setBanner({
        type: 'error',
        message: 'Rubric của môn học đã bị khóa do có ca thi đang diễn ra hoặc đã kết thúc (BR-BANK-006).',
      })
      return
    }

    if (!name.trim()) {
      setBanner({ type: 'error', message: 'Vui lòng nhập tên bộ Rubric.' })
      return
    }

    if (criteria.length === 0) {
      setBanner({ type: 'error', message: 'Rubric phải có ít nhất 1 tiêu chí đánh giá.' })
      return
    }

    for (let i = 0; i < criteria.length; i++) {
      if (!criteria[i].name.trim()) {
        setBanner({ type: 'error', message: `Tiêu chí #${i + 1} chưa có tên.` })
        return
      }
      if (!criteria[i].description.trim()) {
        setBanner({ type: 'error', message: `Tiêu chí #${i + 1} chưa có mô tả chi tiết.` })
        return
      }
      if (criteria[i].weightPercent <= 0) {
        setBanner({ type: 'error', message: `Trọng số tiêu chí #${i + 1} phải lớn hơn 0%.` })
        return
      }
    }

    if (!isExact100) {
      setBanner({
        type: 'error',
        message: `Tổng trọng số các tiêu chí hiện tại là ${totalWeight.toFixed(1)}%. Bắt buộc phải bằng đúng 100% để lưu trữ (BR-BANK-001).`,
      })
      return
    }

    setSaving(true)
    setBanner(null)
    try {
      const updated = await rubricService.updateCourseRubric(courseId, {
        name: name.trim(),
        description: description.trim(),
        criteria: criteria.map((c, idx) => ({
          id: c.id,
          name: c.name.trim(),
          description: c.description.trim(),
          weightPercent: Number(c.weightPercent),
          orderNo: idx + 1,
        })),
      })
      setRubric(updated)
      setCriteria(updated.criteria)
      setBanner({
        type: 'success',
        message: 'Đã lưu và cập nhật Rubric chuẩn của môn học thành công. Ngân hàng câu hỏi đã sẵn sàng để phê duyệt!',
      })
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err?.message || 'Lỗi khi lưu Rubric môn học.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <LecturerLayout
      title={`Quản Lý Rubric Môn Học: ${courseId}`}
      subtitle="Thiết lập thang điểm chuẩn duy nhất cấp môn học cho phòng thi vấn đáp (BR-BANK-001, BR-BANK-006)"
      breadcrumbs={[
        { label: 'Giảng viên', to: '/lecturer/dashboard' },
        { label: 'Chương trình học', to: '/lecturer/curriculum' },
        { label: `Rubric Môn ${courseId}` },
      ]}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Banner thông báo */}
        {banner && (
          <div
            className={`rounded-2xl p-4 text-sm font-medium transition-all ${
              banner.type === 'success'
                ? 'border border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
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

        {/* Thanh chọn môn học & liên kết nhanh */}
        <div className="rounded-3xl border border-surface-container-high bg-surface-container-lowest p-5 shadow-xs flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Chọn Môn Học:
            </span>
            <select
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value)
                navigate(`/lecturer/courses/${encodeURIComponent(e.target.value)}/rubric`)
              }}
              className="rounded-xl border border-outline bg-surface px-3 py-1.5 text-xs font-bold text-on-surface outline-none focus:border-primary"
            >
              {courses.length > 0 ? (
                courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.courseCode} - {c.name}
                  </option>
                ))
              ) : (
                <option value={courseId}>{courseId} - Môn học đang chọn</option>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/lecturer/questions"
              className="rounded-xl border border-outline px-3.5 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
            >
              Ngân Hàng Câu Hỏi
            </Link>
            <Link
              to="/lecturer/materials"
              className="rounded-xl border border-outline px-3.5 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
            >
              Học Liệu Slide
            </Link>
          </div>
        </div>

        {/* Khung trạng thái khóa và tổng trọng số */}
        <div className="rounded-3xl border border-surface-container-high bg-surface-container-low p-6 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-title-md font-bold text-on-surface">
                  Rubric Chuẩn Môn Học ({courseId})
                </h2>
                {isLocked ? (
                  <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                    Đã khóa (Ca thi đang diễn ra)
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                    Khả dụng chỉnh sửa
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-on-surface-variant">
                Theo quy tắc BR-BANK-001, câu hỏi chỉ được chuyển sang trạng thái APPROVED khi môn học đã có Rubric đạt 100%.
              </p>
            </div>

            {/* Trọng số thời gian thực */}
            <div className="flex items-center gap-3">
              <div
                className={`rounded-2xl border px-5 py-3 text-center transition-all ${
                  isExact100
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}
              >
                <div className="text-xs font-semibold uppercase tracking-wider">Tổng Trọng Số</div>
                <div className="text-2xl font-black">
                  {totalWeight.toFixed(1)}%
                </div>
                <div className="text-xs font-medium">
                  {isExact100 ? 'Hợp lệ (100%)' : 'Chưa đạt 100%'}
                </div>
              </div>
            </div>
          </div>

          {isLocked && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              Quy tắc BR-BANK-006: Thang điểm Rubric này đã gắn với ca thi đang mở hoặc đã diễn ra. Mọi thao tác thêm, sửa hoặc xóa tiêu chí đều bị vô hiệu hóa để bảo đảm tính khách quan học thuật.
            </div>
          )}
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="space-y-4 rounded-3xl border border-surface-container-high bg-surface p-6">
            <div className="h-6 w-1/3 animate-pulse rounded-lg bg-surface-container-high" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-surface-container-high" />
            <div className="h-24 w-full animate-pulse rounded-xl bg-surface-container-high" />
            <div className="h-40 w-full animate-pulse rounded-xl bg-surface-container-high" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Thông tin chung của Rubric */}
            <div className="rounded-3xl border border-surface-container-high bg-surface p-6 shadow-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-label-sm font-semibold text-on-surface">
                    Tên Bộ Rubric
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Rubric chuẩn môn Kiến trúc phần mềm"
                    className="w-full rounded-xl border border-outline px-3.5 py-2.5 text-sm text-on-surface outline-none transition-all focus:border-primary disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-label-sm font-semibold text-on-surface">
                    Mã Môn Học
                  </label>
                  <input
                    type="text"
                    disabled
                    value={courseId}
                    className="w-full rounded-xl border border-outline bg-surface-container-high px-3.5 py-2.5 text-sm font-medium text-on-surface opacity-80"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-label-sm font-semibold text-on-surface">
                    Mô Tả & Hướng Dẫn Đánh Giá
                  </label>
                  <textarea
                    rows={2}
                    disabled={isLocked}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="VD: Áp dụng cho các ca thi vấn đáp đồ án và lý thuyết môn SWD392..."
                    className="w-full rounded-xl border border-outline px-3.5 py-2.5 text-sm text-on-surface outline-none transition-all focus:border-primary disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            {/* Danh sách Tiêu chí Rubric */}
            <div className="rounded-3xl border border-surface-container-high bg-surface p-6 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-title-sm font-bold text-on-surface">
                    Danh Sách Tiêu Chí Đánh Giá ({criteria.length})
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Mỗi tiêu chí phản ánh một khía cạnh năng lực và có trọng số phần trăm tương ứng.
                  </p>
                </div>
                {!isLocked && (
                  <button
                    type="button"
                    onClick={handleAddCriterion}
                    className="rounded-xl border border-primary bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-white"
                  >
                    + Thêm Tiêu Chí
                  </button>
                )}
              </div>

              {criteria.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-outline p-8 text-center text-sm text-on-surface-variant">
                  Chưa có tiêu chí nào. Bấm &quot;Thêm Tiêu Chí&quot; để thiết lập thang điểm cho môn học.
                </div>
              ) : (
                <div className="space-y-4">
                  {criteria.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-4 transition-all"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                              {index + 1}
                            </span>
                            <input
                              type="text"
                              disabled={isLocked}
                              value={item.name}
                              onChange={(e) => handleCriterionChange(index, 'name', e.target.value)}
                              placeholder="Tên tiêu chí (VD: Kiến thức cốt lõi)"
                              className="flex-1 rounded-xl border border-outline px-3 py-1.5 text-sm font-semibold text-on-surface outline-none focus:border-primary disabled:opacity-60"
                            />
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-on-surface-variant">Trọng số:</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                disabled={isLocked}
                                value={item.weightPercent}
                                onChange={(e) =>
                                  handleCriterionChange(index, 'weightPercent', parseFloat(e.target.value) || 0)
                                }
                                className="w-20 rounded-xl border border-outline px-2.5 py-1.5 text-center text-sm font-bold text-primary outline-none focus:border-primary disabled:opacity-60"
                              />
                              <span className="text-xs font-bold text-on-surface">%</span>
                            </div>
                          </div>

                          <div>
                            <textarea
                              rows={2}
                              disabled={isLocked}
                              value={item.description}
                              onChange={(e) => handleCriterionChange(index, 'description', e.target.value)}
                              placeholder="Tiêu chuẩn chi tiết để đạt điểm tối đa ở tiêu chí này..."
                              className="w-full rounded-xl border border-outline px-3 py-2 text-xs text-on-surface outline-none focus:border-primary disabled:opacity-60"
                            />
                          </div>
                        </div>

                        {!isLocked && (
                          <div className="flex items-center sm:pt-1">
                            <button
                              type="button"
                              onClick={() => handleRemoveCriterion(index)}
                              className="rounded-lg px-2.5 py-1 text-xs font-medium text-rose-600 transition-all hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                              Xóa
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Thanh hành động cuối trang */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-surface-container-high bg-surface-container-low p-4 sm:flex-row">
              <div className="flex items-center gap-2">
                <Link
                  to="/lecturer/curriculum"
                  className="rounded-xl border border-outline px-4 py-2.5 text-sm font-medium text-on-surface transition-all hover:bg-surface-container-high"
                >
                  Quay lại Chương trình học
                </Link>
                <Link
                  to="/lecturer/questions"
                  className="rounded-xl border border-outline px-4 py-2.5 text-sm font-medium text-on-surface transition-all hover:bg-surface-container-high"
                >
                  Xem Ngân hàng câu hỏi
                </Link>
              </div>

              {!isLocked && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={saving || !isExact100}
                    onClick={handleSave}
                    className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-xs transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? 'Đang lưu Rubric...' : 'Lưu Thay Đổi Rubric'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </LecturerLayout>
  )
}
