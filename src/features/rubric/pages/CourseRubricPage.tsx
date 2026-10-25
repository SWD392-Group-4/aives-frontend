import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import LecturerLayout from '@/components/LecturerLayout'
import { rubricService } from '../services/rubricService'
import { CourseRubricResponse, RubricCriteriaDto } from '../types'

export default function CourseRubricPage() {
  const { courseId = '' } = useParams<{ courseId: string }>()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  const [rubricName, setRubricName] = useState('')
  const [rubricDescription, setRubricDescription] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [criteria, setCriteria] = useState<RubricCriteriaDto[]>([])

  const loadRubric = async () => {
    if (!courseId) return
    try {
      setLoading(true)
      setError(null)
      const data = await rubricService.getRubricByCourseId(courseId)
      setRubricName(data.name || `Rubric chuan mon hoc ${courseId}`)
      setRubricDescription(data.description || '')
      setIsLocked(Boolean(data.isLocked))
      setCriteria(data.criteria || [])
    } catch (err: any) {
      if (err?.status === 404) {
        setRubricName(`Rubric chuan mon hoc ${courseId}`)
        setRubricDescription('Tieu chuan danh gia danh cho ca thi van dap.')
        setIsLocked(false)
        setCriteria([
          {
            name: 'Kien thuc nen tang & Khai niem',
            description: 'Trinh bay chinh xac dinh nghia va thuat ngu chuyen mon.',
            weightPercent: 40,
            orderNo: 1,
          },
          {
            name: 'Kha nang phan tich & Ap dung',
            description: 'Giai thich ro co che hoat dong, so sanh cac giai phap ky thuat.',
            weightPercent: 30,
            orderNo: 2,
          },
          {
            name: 'Phan xa & Bao ve quan diem',
            description: 'Tra loi mach lac, phan hoi chinh xac cau hoi van dap mo rong.',
            weightPercent: 30,
            orderNo: 3,
          },
        ])
      } else {
        setError(err?.message || 'Khong the tai thong tin Rubric cua mon hoc.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRubric()
  }, [courseId])

  const totalWeight = useMemo(() => {
    return criteria.reduce((sum, item) => sum + (Number(item.weightPercent) || 0), 0)
  }, [criteria])

  const isValidWeight = Math.round(totalWeight) === 100

  const handleCriterionChange = (
    index: number,
    field: keyof RubricCriteriaDto,
    value: string | number
  ) => {
    if (isLocked) return
    setCriteria((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    )
  }

  const handleAddCriterion = () => {
    if (isLocked) return
    const remaining = Math.max(0, 100 - totalWeight)
    const newOrderNo = criteria.length > 0 ? Math.max(...criteria.map((c) => c.orderNo)) + 1 : 1
    setCriteria((prev) => [
      ...prev,
      {
        name: `Tieu chi danh gia ${prev.length + 1}`,
        description: 'Mo ta yeu cau chi tiet can dat de dat diem so toi da.',
        weightPercent: remaining > 0 ? remaining : 10,
        orderNo: newOrderNo,
      },
    ])
  }

  const handleDeleteCriterion = (index: number) => {
    if (isLocked) return
    if (criteria.length <= 1) {
      setError('Rubric mon hoc bat buoc phai co it nhat 1 tieu chi danh gia.')
      return
    }
    setCriteria((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleAutoDistribute = () => {
    if (isLocked || criteria.length === 0) return
    const count = criteria.length
    const baseWeight = Math.floor(100 / count)
    const remainder = 100 - baseWeight * count
    setCriteria((prev) =>
      prev.map((item, idx) => ({
        ...item,
        weightPercent: idx === 0 ? baseWeight + remainder : baseWeight,
      }))
    )
  }

  const handleSaveRubric = async () => {
    if (isLocked) {
      setError('Rubric da bi khoa do co ca thi dang dien ra hoac da hoan thanh (BR-BANK-006).')
      return
    }
    if (!rubricName.trim()) {
      setError('Ten bo Rubric khong duoc de trong.')
      return
    }
    if (!isValidWeight) {
      setError(
        `Tong trong so hien tai la ${totalWeight}%. Tong trong so bat buoc phai bang dung 100% (BR-BANK-001).`
      )
      return
    }
    for (let i = 0; i < criteria.length; i++) {
      if (!criteria[i].name.trim() || !criteria[i].description.trim()) {
        setError(`Tieu chi thu ${i + 1} chua co ten hoac mo ta tieu chuan danh gia.`)
        return
      }
      if (criteria[i].weightPercent <= 0) {
        setError(`Tieu chi "${criteria[i].name}" phai co trong so lon hon 0%.`)
        return
      }
    }

    try {
      setSaving(true)
      setError(null)
      setSuccessBanner(null)
      await rubricService.updateCourseRubric(courseId, {
        name: rubricName.trim(),
        description: rubricDescription.trim() || null,
        criteria: criteria.map((c, idx) => ({
          ...c,
          orderNo: idx + 1,
          weightPercent: Number(c.weightPercent),
        })),
      })
      setSuccessBanner('Luu cau truc Rubric mon hoc thanh cong. Tong trong so dat 100%.')
    } catch (err: any) {
      setError(err?.message || 'Loi luu Rubric mon hoc. Vui long kiem tra lai du lieu.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <LecturerLayout
      title={`Quan ly Rubric Mon hoc: ${courseId}`}
      subtitle="Thiet lap bo tieu chi danh gia duy nhat va tong trong so 100% cho mon hoc"
      breadcrumbs={[
        { label: 'Tong quan', to: '/lecturer/dashboard' },
        { label: `Mon hoc ${courseId}` },
        { label: 'Rubric mon hoc' },
      ]}
    >
      <div className="space-y-6">
        {/* Banner canh bao trang thai khoa (BR-BANK-006) */}
        {isLocked && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
            <div className="flex items-center justify-between">
              <div>
                <span className="inline-block rounded-md bg-amber-200 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-900">
                  DA KHOA (CA THI DANG DIEN RA)
                </span>
                <p className="mt-1 text-sm">
                  Mon hoc nay da co it nhat mot ca thi dang mo hoac da ket thuc. Toan bo tieu chi va trong so bi khoa bat bien (BR-BANK-006) de bao dam tinh cong bang hoc thuat.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Thong bao loi & thanh cong */}
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

        {/* Thong tin chung Rubric */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Ten bo Rubric mon hoc
              </label>
              <input
                type="text"
                disabled={isLocked || loading}
                value={rubricName}
                onChange={(e) => setRubricName(e.target.value)}
                placeholder="Vi du: Rubric chuan mon Kien truc phan mem"
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-container-lowest px-3.5 py-2 text-sm text-on-surface outline-none focus:border-primary disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Thang diem toi da
              </label>
              <input
                type="text"
                disabled
                value="10.0 Diem"
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-container-high px-3.5 py-2 text-sm font-semibold text-on-surface opacity-80"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Mo ta huong dan danh gia
              </label>
              <textarea
                rows={2}
                disabled={isLocked || loading}
                value={rubricDescription}
                onChange={(e) => setRubricDescription(e.target.value)}
                placeholder="Ghi chu them ve nguyen tac cham thi, yeu cau danh cho hoi dong giang vien va AI..."
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-container-lowest px-3.5 py-2 text-sm text-on-surface outline-none focus:border-primary disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* Bo dem tong trong so thoi gian thuc */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-on-surface">Tong trong so tieu chi:</span>
              {isValidWeight ? (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  100% - DAT CHUAN BR-BANK-001
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                  {totalWeight}% - CAN THIET PHAI DUNG 100%
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-on-surface-variant">
              {isValidWeight
                ? 'Toan bo tieu chi da duoc phan bo du 100%. He thong cho phep phe duyet cau hoi ngan hang.'
                : totalWeight < 100
                  ? `Con thieu ${100 - totalWeight}% de dat chuan 100%. Ngan hang cau hoi se bi chan phe duyet.`
                  : `Vuot qua ${totalWeight - 100}%. Vui long giam trong so cac tieu chi xuong dung 100%.`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isLocked && (
              <>
                <button
                  type="button"
                  onClick={handleAutoDistribute}
                  disabled={loading || criteria.length === 0}
                  className="rounded-xl border border-border bg-surface-container-lowest px-3.5 py-2 text-xs font-medium text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  Chia deu %
                </button>
                <button
                  type="button"
                  onClick={handleAddCriterion}
                  disabled={loading}
                  className="rounded-xl border border-primary bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  Them tieu chi
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleSaveRubric}
              disabled={isLocked || saving || loading || !isValidWeight}
              className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Dang luu...' : 'Luu Rubric'}
            </button>
          </div>
        </div>

        {/* Danh sach tieu chi (Loading, Error, Empty, Populated) */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 animate-pulse rounded-2xl bg-surface-container-high" />
            ))}
          </div>
        ) : criteria.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
            <h3 className="text-base font-semibold text-on-surface">Chua co tieu chi danh gia nao</h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              Mon hoc bat buoc phai co Rubric voi tong trong so 100% de AI va giang vien cham diem.
            </p>
            {!isLocked && (
              <button
                type="button"
                onClick={handleAddCriterion}
                className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary"
              >
                Tao tieu chi dau tien
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {criteria.map((item, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border bg-surface p-5 transition-shadow hover:shadow-xs"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <span className="w-8 text-xs font-bold text-on-surface-variant">
                        #{index + 1}
                      </span>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={item.name}
                        onChange={(e) => handleCriterionChange(index, 'name', e.target.value)}
                        placeholder="Ten tieu chi danh gia..."
                        className="flex-1 rounded-xl border border-border bg-surface-container-lowest px-3 py-1.5 text-sm font-semibold text-on-surface outline-none focus:border-primary disabled:opacity-70"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-on-surface-variant font-medium">Trong so:</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          disabled={isLocked}
                          value={item.weightPercent}
                          onChange={(e) =>
                            handleCriterionChange(
                              index,
                              'weightPercent',
                              Math.max(0, Math.min(100, Number(e.target.value)))
                            )
                          }
                          className="w-20 rounded-xl border border-border bg-surface-container-lowest px-2.5 py-1.5 text-center text-sm font-bold text-primary outline-none focus:border-primary disabled:opacity-70"
                        />
                        <span className="text-sm font-bold text-on-surface">%</span>
                      </div>
                    </div>

                    <div>
                      <textarea
                        rows={2}
                        disabled={isLocked}
                        value={item.description}
                        onChange={(e) =>
                          handleCriterionChange(index, 'description', e.target.value)
                        }
                        placeholder="Dac ta chi tiet tieu chuan dat diem o cac muc (xuat sac, dat, yeu)..."
                        className="w-full rounded-xl border border-border bg-surface-container-lowest px-3.5 py-2 text-xs text-on-surface outline-none focus:border-primary disabled:opacity-70"
                      />
                    </div>
                  </div>

                  {!isLocked && (
                    <div className="sm:ml-4 sm:pt-1">
                      <button
                        type="button"
                        onClick={() => handleDeleteCriterion(index)}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Xoa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </LecturerLayout>
  )
}