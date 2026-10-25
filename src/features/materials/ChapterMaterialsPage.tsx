import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LecturerLayout from '../../components/LecturerLayout'
import GenerateQuestionModal from '../questions/GenerateQuestionModal'
import { Question } from '../questions/types'
import { materialService } from './materialService'
import { Chapter, Course, Material } from './types'

export default function ChapterMaterialsPage() {
  const navigate = useNavigate()
  const { chapterId: paramChapterId } = useParams<{ chapterId?: string }>()

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [courseId, setCourseId] = useState<string>('SWD392')
  const [chapterId, setChapterId] = useState<string>(paramChapterId || 'CHAP_01')

  const [materials, setMaterials] = useState<Material[]>([])
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null)

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [isCreateChapterOpen, setIsCreateChapterOpen] = useState(false)
  const [newChapterName, setNewChapterName] = useState('')
  const [newChapterDesc, setNewChapterDesc] = useState('')
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // 1. Tải danh sách môn học
  useEffect(() => {
    const initCourses = async () => {
      try {
        const courseList = await materialService.getCourses()
        if (courseList.length > 0) {
          setCourses(courseList)
          if (!paramChapterId) {
            setCourseId(courseList[0].id)
          }
        }
      } catch (err: any) {
        console.error('Không thể tải danh sách môn học:', err)
      }
    }
    initCourses()
  }, [])

  // 2. Tải danh sách chương khi courseId thay đổi
  useEffect(() => {
    const loadChapters = async () => {
      if (!courseId) return
      try {
        const chapList = await materialService.getChapters(courseId)
        setChapters(chapList)

        if (chapList.length > 0) {
          const matched = paramChapterId ? chapList.find((c) => c.id === paramChapterId) : null
          const activeChapter = matched || chapList[0]
          setChapterId(activeChapter.id)
          setCurrentChapter(activeChapter)
        } else {
          setChapterId('CHAP_01')
          setCurrentChapter({
            id: 'CHAP_01',
            courseId,
            name: 'Chương 1: Mặc định',
            orderNo: 1,
            description: 'Học liệu slide bài giảng và giáo trình môn học',
          })
        }
      } catch (err: any) {
        console.error('Không thể tải danh sách chương:', err)
      }
    }
    loadChapters()
  }, [courseId])

  // 3. Tải danh sách tài liệu của chương
  const loadMaterials = async () => {
    if (!chapterId) return
    setLoading(true)
    setBanner(null)
    try {
      const matList = await materialService.getChapterMaterials(chapterId)
      setMaterials(matList)
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
    loadMaterials()
  }, [chapterId, courseId])

  const handleCourseChange = (newCourseId: string) => {
    setCourseId(newCourseId)
  }

  const handleChapterSelect = (newChapterId: string) => {
    setChapterId(newChapterId)
    const found = chapters.find((c) => c.id === newChapterId)
    if (found) setCurrentChapter(found)
    navigate(`/lecturer/chapters/${encodeURIComponent(newChapterId)}/materials`)
  }

  const handleCreateChapter = async () => {
    if (!newChapterName.trim()) {
      alert('Vui lòng nhập tên chương.')
      return
    }
    try {
      const created = await materialService.createChapter(courseId, {
        name: newChapterName.trim(),
        description: newChapterDesc.trim() || undefined,
        orderNo: chapters.length + 1,
      })
      setChapters((prev) => [...prev, created])
      setChapterId(created.id)
      setCurrentChapter(created)
      setIsCreateChapterOpen(false)
      setNewChapterName('')
      setNewChapterDesc('')
      setBanner({
        type: 'success',
        message: `Đã tạo thành công chương mới: ${created.name}`,
      })
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi tạo chương mới.')
    }
  }

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

        {/* Thanh chuyển chọn Môn học & Chương */}
        <div className="rounded-3xl border border-surface-container-high bg-surface-container-lowest p-5 shadow-xs space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Môn học:
              </span>
              <select
                value={courseId}
                onChange={(e) => handleCourseChange(e.target.value)}
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
                to={`/lecturer/courses/${encodeURIComponent(courseId)}/rubric`}
                className="rounded-xl border border-outline px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
              >
                Tiêu chí Rubric Môn
              </Link>
              <Link
                to={`/lecturer/chapters/${encodeURIComponent(chapterId)}/questions`}
                className="rounded-xl border border-primary bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white"
              >
                Vào Ngân Hàng Câu Hỏi
              </Link>
            </div>
          </div>

          {/* Danh sách tab các Chương thuộc môn */}
          <div className="flex flex-wrap items-center gap-2 border-t border-surface-container-high pt-3">
            <span className="text-xs font-semibold text-on-surface-variant mr-1">Chương:</span>
            {chapters.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => handleChapterSelect(ch.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  ch.id === chapterId
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                }`}
              >
                {ch.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsCreateChapterOpen(true)}
              className="rounded-xl border border-dashed border-outline px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
            >
              + Tạo Chương Mới
            </button>
          </div>
        </div>

        {/* Khung thông tin chương */}
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
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(true)}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-primary/90"
              >
                Sinh Câu Hỏi AI (RAG)
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
              className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-primary/90"
            >
              {uploading ? 'Đang Tải Lên & Xử Lý...' : 'Chọn Tệp Từ Máy Tính'}
            </label>
            <p className="mt-2 text-[11px] text-on-surface-variant">
              Tệp sẽ được lưu trữ an toàn trên GCS và chuyển trạng thái INDEXING sang READY sau khi bóc tách.
            </p>
          </div>
        </div>

        {/* Bảng danh sách tài liệu */}
        <div className="rounded-3xl border border-surface-container-high bg-surface p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4">
            <h3 className="text-title-sm font-bold text-on-surface">
              Danh Sách Slide & Học Liệu ({materials.length})
            </h3>
            <button
              type="button"
              onClick={loadMaterials}
              className="rounded-xl border border-outline px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
            >
              Làm Mới
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 w-full animate-pulse rounded-2xl bg-surface-container-high"
                />
              ))}
            </div>
          ) : materials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline p-8 text-center text-xs text-on-surface-variant">
              Chưa có tài liệu nào cho chương này. Hãy bấm &quot;Chọn Tệp Từ Máy Tính&quot; ở trên để nạp slide bài giảng.
            </div>
          ) : (
            <div className="divide-y divide-surface-container-high">
              {materials.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-on-surface">{m.title || m.fileName}</span>
                      <span className="rounded-md bg-surface-container-high px-2 py-0.5 text-[10px] font-semibold uppercase text-on-surface-variant">
                        {m.fileType}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-on-surface-variant">
                      <span>Kích thước: {(m.fileSize / 1024).toFixed(1)} KB</span>
                      {m.chunkCount ? <span>Số chunks: {m.chunkCount}</span> : null}
                      {m.createdAt ? (
                        <span>Nạp ngày: {new Date(m.createdAt).toLocaleDateString('vi-VN')}</span>
                      ) : null}
                    </div>
                    {m.errorMessage && (
                      <p className="text-[11px] text-rose-500 font-medium">Lỗi: {m.errorMessage}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Badge trạng thái RAG */}
                    {m.ragStatus === 'READY' && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Sẵn Sàng (READY)
                      </span>
                    )}
                    {m.ragStatus === 'INDEXING' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-600 dark:text-sky-400">
                        <span className="h-2 w-2 animate-ping rounded-full bg-sky-500" />
                        Đang Lập Chỉ Mục (INDEXING)
                      </span>
                    )}
                    {m.ragStatus === 'FAILED' && (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                          Thất Bại (FAILED)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleReindex(m.id, m.fileName)}
                          className="rounded-xl border border-rose-500/30 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          Thử Lại
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal tạo chương mới */}
      {isCreateChapterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs"
            onClick={() => setIsCreateChapterOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl border border-surface-container-high bg-surface p-6 shadow-xl">
            <h3 className="text-title-sm font-bold text-on-surface">Tạo Chương Mới</h3>
            <p className="mt-1 text-xs text-on-surface-variant">
              Thêm chương mới cho môn học {courseId}.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface">Tên Chương *</label>
                <input
                  type="text"
                  value={newChapterName}
                  onChange={(e) => setNewChapterName(e.target.value)}
                  placeholder="Ví dụ: Chương 3: Microservices Pattern"
                  className="mt-1 w-full rounded-xl border border-outline px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface">Mô Tả Chương</label>
                <textarea
                  rows={2}
                  value={newChapterDesc}
                  onChange={(e) => setNewChapterDesc(e.target.value)}
                  placeholder="Mô tả nội dung chương..."
                  className="mt-1 w-full rounded-xl border border-outline px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateChapterOpen(false)}
                className="rounded-xl border border-outline px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateChapter}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary/90"
              >
                Tạo Chương
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal sinh câu hỏi AI */}
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
