import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import LecturerLayout from '../../components/LecturerLayout'
import GenerateQuestionModal from '../questions/GenerateQuestionModal'
import { Question } from '../questions/types'
import { materialService } from './materialService'
import { Chapter, Material } from './types'

export default function ChapterMaterialsPage() {
  const { chapterId: paramChapterId } = useParams<{ chapterId?: string }>()
  const chapterId = paramChapterId || 'CHAP_01'

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([])
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null)
  const [courseId, setCourseId] = useState('SWD392')

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const loadData = async (cId: string) => {
    setLoading(true)
    setBanner(null)
    try {
      const [matList, chapList] = await Promise.all([
        materialService.getChapterMaterials(cId),
        materialService.getChapters(courseId).catch(() => []),
      ])
      setMaterials(matList)

      const foundChapter = chapList.find((ch) => ch.id === cId)
      if (foundChapter) {
        setCurrentChapter(foundChapter)
        if (foundChapter.courseId) setCourseId(foundChapter.courseId)
      } else {
        setCurrentChapter({
          id: cId,
          courseId,
          name: `Chương ${cId}`,
          orderNo: 1,
          description: 'Học liệu slide bài giảng và giáo trình môn học',
        })
      }
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err?.message || 'Không thể tải danh sách tài liệu của chương.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(chapterId)
  }, [chapterId, courseId])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setBanner(null)
    try {
      const uploaded = await materialService.uploadChapterMaterial(chapterId, file)
      setMaterials((prev) => [uploaded, ...prev])
      setBanner({
        type: 'success',
        message: `Đã nạp tệp "${file.name}" lên Cloud Storage thành công. Vertex AI RAG đang lập chỉ mục vector!`,
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err?.message || 'Lỗi khi tải lên học liệu.',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleReindex = async (matId: string, fileName: string) => {
    setBanner(null)
    try {
      const updated = await materialService.reindexMaterial(matId)
      setMaterials((prev) => prev.map((m) => (m.id === matId ? updated : m)))
      setBanner({
        type: 'success',
        message: `Đã kích hoạt lại tiến trình lập chỉ mục cho tệp "${fileName}".`,
      })
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err?.message || 'Không thể kích hoạt lại tiến trình lập chỉ mục.',
      })
    }
  }

  const handleQuestionsGenerated = (newQuestions: Question[]) => {
    setBanner({
      type: 'success',
      message: `Đã sinh thành công ${newQuestions.length} câu hỏi AI ở trạng thái DRAFT. Bạn có thể xem và duyệt ngay trong Ngân hàng câu hỏi!`,
    })
  }

  return (
    <LecturerLayout
      title={`Học Liệu & Lập Chỉ Mục RAG: ${currentChapter?.name || chapterId}`}
      subtitle="Quản lý slide bài giảng, theo dõi trạng thái Vertex AI RAG Corpus và sinh câu hỏi AI"
      breadcrumbs={[
        { label: 'Giảng viên', to: '/lecturer/dashboard' },
        { label: 'Học liệu & Slide', to: '/lecturer/materials' },
        { label: currentChapter?.name || chapterId },
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

        {/* Khung thông tin chương và chuyển chương nhanh */}
        <div className="rounded-3xl border border-surface-container-high bg-surface-container-low p-6 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                Môn học: {courseId}
              </div>
              <h2 className="mt-1 text-title-md font-bold text-on-surface">
                {currentChapter?.name || `Chương: ${chapterId}`}
              </h2>
              <p className="mt-1 text-xs text-on-surface-variant">
                {currentChapter?.description || 'Học liệu phục vụ trích xuất tri thức và thẩm định câu hỏi viva.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/lecturer/courses/${encodeURIComponent(courseId)}/rubric`}
                className="rounded-xl border border-outline px-3.5 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
              >
                Cấu hình Rubric Môn
              </Link>
              <Link
                to={`/lecturer/chapters/${encodeURIComponent(chapterId)}/questions`}
                className="rounded-xl border border-primary bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-white"
              >
                Vào Ngân Hàng Câu Hỏi
              </Link>
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(true)}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-primary/90"
              >
                Sinh Câu Hỏi AI
              </button>
            </div>
          </div>
        </div>

        {/* Khu vực nạp tài liệu mới */}
        <div className="rounded-3xl border border-surface-container-high bg-surface p-6 shadow-xs">
          <h3 className="text-title-sm font-bold text-on-surface">
            Nạp Tài Liệu Mới Lên Google Cloud Storage & RAG
          </h3>
          <p className="mt-1 text-xs text-on-surface-variant">
            Hỗ trợ định dạng PDF, PPTX (tối đa 50MB). Hệ thống sẽ tự động phân mảnh và nạp vào Vertex AI RAG Corpus.
          </p>

          <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-outline p-6 text-center transition-all hover:border-primary/50">
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.pptx,.ppt"
              disabled={uploading}
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload-input"
            />
            <label
              htmlFor="file-upload-input"
              className={`cursor-pointer rounded-xl bg-primary/15 px-5 py-2.5 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-white ${
                uploading ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              {uploading ? 'Đang tải lên và lập chỉ mục...' : 'Chọn Tệp Slide / Giáo Trình Từ Máy Tính'}
            </label>
            <span className="mt-2 text-[11px] text-on-surface-variant">
              Giới hạn kích thước tệp: tối đa 50MB/tệp
            </span>
          </div>
        </div>

        {/* Danh sách học liệu */}
        <div className="rounded-3xl border border-surface-container-high bg-surface p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-title-sm font-bold text-on-surface">
              Danh Sách Tài Liệu Trong Chương ({materials.length})
            </h3>
            <span className="text-xs text-on-surface-variant">
              Tài liệu READY mới đủ điều kiện để kích hoạt RAG sinh câu hỏi
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 w-full animate-pulse rounded-2xl bg-surface-container-high"
                />
              ))}
            </div>
          ) : materials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline p-8 text-center text-xs text-on-surface-variant">
              Chưa có tài liệu nào được nạp vào chương này. Hãy tải lên slide PDF hoặc PPTX ở trên.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-container-high text-on-surface-variant">
                    <th className="py-3 px-3 font-semibold">Tên Tài Liệu</th>
                    <th className="py-3 px-3 font-semibold">Định Dạng</th>
                    <th className="py-3 px-3 font-semibold">Dung Lượng</th>
                    <th className="py-3 px-3 font-semibold">Trạng Thái RAG</th>
                    <th className="py-3 px-3 font-semibold">Đoạn Tri Thức</th>
                    <th className="py-3 px-3 text-right font-semibold">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {materials.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-container-lowest">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-on-surface">{item.title}</div>
                        <div className="text-[11px] text-on-surface-variant">{item.fileName}</div>
                      </td>
                      <td className="py-3.5 px-3 font-medium uppercase text-on-surface-variant">
                        {item.fileType || item.fileName.split('.').pop()}
                      </td>
                      <td className="py-3.5 px-3 text-on-surface-variant">
                        {(item.fileSize / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="py-3.5 px-3">
                        {item.ragStatus === 'READY' && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            Sẵn sàng (READY)
                          </span>
                        )}
                        {item.ragStatus === 'INDEXING' && (
                          <span className="inline-flex items-center rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] font-bold text-sky-600 dark:text-sky-400">
                            Đang lập chỉ mục...
                          </span>
                        )}
                        {item.ragStatus === 'FAILED' && (
                          <span className="inline-flex items-center rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            Lỗi lập chỉ mục
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-on-surface font-semibold">
                        {item.chunkCount ?? 0} chunks
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {item.ragStatus === 'FAILED' ? (
                          <button
                            type="button"
                            onClick={() => handleReindex(item.id, item.fileName)}
                            className="rounded-lg border border-rose-500/30 px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            Thử Lại
                          </button>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal sinh câu hỏi AI bằng RAG */}
      <GenerateQuestionModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        chapterId={chapterId}
        materials={materials}
        onSuccess={handleQuestionsGenerated}
      />
    </LecturerLayout>
  )
}
