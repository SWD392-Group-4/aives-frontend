import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import LecturerLayout from '@/components/LecturerLayout'
import GenerateQuestionModal from '@/features/questions/components/GenerateQuestionModal'
import { chapterMaterialService } from '../services/chapterMaterialService'
import { MaterialResponse } from '../types'

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function ChapterMaterialsPage() {
  const { chapterId = '' } = useParams<{ chapterId: string }>()

  const [loading, setLoading] = useState(true)
  const [materials, setMaterials] = useState<MaterialResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  const [uploading, setUploading] = useState(false)
  const [reindexingId, setReindexingId] = useState<string | null>(null)
  const [generateModalOpen, setGenerateModalOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadMaterials = async () => {
    if (!chapterId) return
    try {
      setLoading(true)
      setError(null)
      const data = await chapterMaterialService.getMaterialsByChapter(chapterId)
      setMaterials(data || [])
    } catch (err: any) {
      setError(err?.message || 'Khong the tai danh sach hoc lieu cua chuong.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMaterials()
  }, [chapterId])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedExtensions = ['.pdf', '.pptx']
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedExtensions.includes(fileExt)) {
      setError('Dinh dang file khong hop le. Chi chap nhan tai lieu PDF hoac Slide PPTX.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      setError('Dung luong file vuot qua gioi han 50MB cho phep.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    try {
      setUploading(true)
      setError(null)
      setSuccessBanner(null)
      const uploaded = await chapterMaterialService.uploadMaterial(chapterId, file)
      setMaterials((prev) => [uploaded, ...prev])
      setSuccessBanner(`Tai len thanh cong "${file.name}". Vertex AI RAG Corpus dang lap chi muc vector.`)
    } catch (err: any) {
      setError(err?.message || 'Loi khi tai len hoc lieu len GCS.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleReindex = async (materialId: string) => {
    try {
      setReindexingId(materialId)
      setError(null)
      const updated = await chapterMaterialService.reindexMaterial(materialId)
      setMaterials((prev) => prev.map((m) => (m.id === materialId ? updated : m)))
      setSuccessBanner('Da gui yeu cau lap chi muc lai RAG Corpus thanh cong.')
    } catch (err: any) {
      setError(err?.message || 'Loi khi kich hoat lai tien trinh lap chi muc.')
    } finally {
      setReindexingId(null)
    }
  }

  const readyMaterials = materials.filter((m) => m.ragStatus === 'READY')

  return (
    <LecturerLayout
      title={`Quan ly Hoc lieu & Slide RAG - Chuong: ${chapterId}`}
      subtitle="Nap tai lieu PDF / PPTX len Google Cloud Storage va lap chi muc Vertex AI RAG"
      breadcrumbs={[
        { label: 'Tong quan', to: '/lecturer/dashboard' },
        { label: 'Chuong trinh hoc', to: '/lecturer/curriculum' },
        { label: `Chuong ${chapterId}` },
        { label: 'Hoc lieu RAG' },
      ]}
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 border-b border-border pb-3">
          <span className="border-b-2 border-primary pb-3 text-sm font-bold text-primary">
            Hoc lieu RAG ({materials.length})
          </span>
          <Link
            to={`/lecturer/chapters/${chapterId}/questions`}
            className="pb-3 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Ngan hang cau hoi chuong
          </Link>
        </div>

        {/* Notifications */}
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

        {/* Action Header & Upload */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-on-surface">Nap hoc lieu vao bo nho Vertex AI</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Dinh dang ho tro: PDF, PPTX (toi da 50MB). He thong tu dong boc tach vector phuc vu sinh de thi.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.pptx"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {uploading ? 'Dang tai len & vector hoa...' : 'Tai len tai lieu'}
            </button>

            <button
              type="button"
              disabled={readyMaterials.length === 0}
              onClick={() => setGenerateModalOpen(true)}
              className="rounded-xl border border-primary bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-40 transition-colors"
            >
              Sinh cau hoi AI ({readyMaterials.length} file READY)
            </button>
          </div>
        </div>

        {/* Danh sach tai lieu (Loading, Empty, Populated) */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 animate-pulse rounded-2xl bg-surface-container-high" />
            ))}
          </div>
        ) : materials.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
            <h3 className="text-base font-semibold text-on-surface">Chua co hoc lieu nao duoc nap</h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              Hay tai len slide bai giang hoac giao trinh de Vertex AI RAG tao co so tri thuc cho chuong nay.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary"
            >
              Chon file PDF hoac PPTX
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-container-low text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="px-5 py-3.5">Ten tai lieu</th>
                  <th className="px-4 py-3.5">Dinh dang</th>
                  <th className="px-4 py-3.5">Dung luong</th>
                  <th className="px-4 py-3.5">Trang thai RAG</th>
                  <th className="px-5 py-3.5 text-right">Thao tac</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {materials.map((mat) => (
                  <tr key={mat.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-on-surface">{mat.title}</div>
                      <div className="text-xs text-on-surface-variant truncate max-w-md mt-0.5">
                        {mat.fileUrl}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs font-semibold uppercase text-on-surface-variant">
                      {mat.fileType}
                    </td>
                    <td className="px-4 py-4 text-xs text-on-surface-variant">
                      {formatBytes(mat.fileSize)}
                    </td>
                    <td className="px-4 py-4">
                      {mat.ragStatus === 'READY' && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                          READY (San sang)
                        </span>
                      )}
                      {mat.ragStatus === 'INDEXING' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                          <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                          INDEXING (Dang boc tach)
                        </span>
                      )}
                      {mat.ragStatus === 'FAILED' && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                          FAILED (Loi lap chi muc)
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {mat.ragStatus === 'FAILED' && (
                        <button
                          type="button"
                          disabled={reindexingId === mat.id}
                          onClick={() => handleReindex(mat.id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          {reindexingId === mat.id ? 'Dang thu lai...' : 'Re-index'}
                        </button>
                      )}
                      {mat.ragStatus === 'READY' && (
                        <span className="text-xs text-emerald-600 font-medium">Kha dung cho RAG</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Sinh cau hoi AI */}
        {generateModalOpen && (
          <GenerateQuestionModal
            chapterId={chapterId}
            readyMaterials={readyMaterials}
            onClose={() => setGenerateModalOpen(false)}
            onGenerated={() => {
              setGenerateModalOpen(false)
              setSuccessBanner('Da sinh cau hoi AI thanh cong. Chuyen sang tab Ngan hang cau hoi de tham dinh.')
            }}
          />
        )}
      </div>
    </LecturerLayout>
  )
}