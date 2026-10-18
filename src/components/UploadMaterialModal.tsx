import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import Modal from './Modal'
import { LectureMaterial, Lesson, Topic } from '../types'
import { contentService } from '../services/contentService'

interface UploadMaterialModalProps {
  onClose: () => void
  onUploaded: (material: LectureMaterial) => void
  defaultLessonId?: string
  defaultTopicId?: string
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB
const ALLOWED_EXTENSIONS = ['.pptx', '.ppt', '.pdf']

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function UploadMaterialModal({
  onClose,
  onUploaded,
  defaultLessonId,
  defaultTopicId,
}: UploadMaterialModalProps) {
  const [title, setTitle] = useState('')
  const [selectedLessonId, setSelectedLessonId] = useState(defaultLessonId || '')
  const [selectedTopicId, setSelectedTopicId] = useState(defaultTopicId || '')
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [loadingLessons, setLoadingLessons] = useState(true)
  const [loadingTopics, setLoadingTopics] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Load Lessons on mount
  useEffect(() => {
    let isMounted = true
    const fetchLessons = async () => {
      try {
        setLoadingLessons(true)
        const data = await contentService.getLessons()
        if (isMounted) {
          setLessons(data || [])
          if (!selectedLessonId && data && data.length > 0 && defaultLessonId) {
            setSelectedLessonId(defaultLessonId)
          }
        }
      } catch (err) {
        console.warn('Failed to load lessons:', err)
      } finally {
        if (isMounted) setLoadingLessons(false)
      }
    }
    fetchLessons()
    return () => {
      isMounted = false
    }
  }, [defaultLessonId])

  // Load Topics when Lesson changes
  useEffect(() => {
    let isMounted = true
    const fetchTopics = async () => {
      if (!selectedLessonId) {
        setTopics([])
        setSelectedTopicId('')
        return
      }
      try {
        setLoadingTopics(true)
        const data = await contentService.getTopics(selectedLessonId)
        if (isMounted) {
          setTopics(data || [])
          if (defaultTopicId && data?.some((t) => t.id === defaultTopicId)) {
            setSelectedTopicId(defaultTopicId)
          } else {
            setSelectedTopicId('')
          }
        }
      } catch (err) {
        console.warn('Failed to load topics:', err)
      } finally {
        if (isMounted) setLoadingTopics(false)
      }
    }
    fetchTopics()
    return () => {
      isMounted = false
    }
  }, [selectedLessonId, defaultTopicId])

  const validateAndSetFile = (chosenFile: File | null) => {
    setError('')
    if (!chosenFile) {
      setFile(null)
      return
    }

    const fileNameLower = chosenFile.name.toLowerCase()
    const isValidExt = ALLOWED_EXTENSIONS.some((ext) => fileNameLower.endsWith(ext))

    if (!isValidExt) {
      setFile(null)
      setError('Định dạng file không hợp lệ! Hệ thống chỉ hỗ trợ slide .pptx, .ppt hoặc tài liệu .pdf.')
      return
    }

    if (chosenFile.size > MAX_FILE_SIZE_BYTES) {
      setFile(null)
      setError(`File vượt quá dung lượng tối đa cho phép (${formatFileSize(chosenFile.size)} > 50 MB).`)
      return
    }

    if (chosenFile.size === 0) {
      setFile(null)
      setError('File tải lên bị rỗng. Vui lòng chọn file khác.')
      return
    }

    setFile(chosenFile)
    // Tự động điền tiêu đề nếu chưa có
    if (!title.trim()) {
      const baseName = chosenFile.name.replace(/\.[^/.]+$/, '')
      setTitle(baseName)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!submitting) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (submitting) return

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề cho học liệu / slide.')
      return
    }

    if (!file) {
      setError('Vui lòng chọn hoặc kéo thả file slide / học liệu.')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      // Bước 1: Đang tải lên Cloud Storage
      setStep(1)
      await new Promise((resolve) => setTimeout(resolve, 850))

      // Bước 2: Kích hoạt Vertex AI RAG Corpus băm vector
      setStep(2)
      const uploaded = await contentService.uploadMaterial(
        file,
        title.trim(),
        selectedLessonId || undefined,
        selectedTopicId || undefined,
      )

      // Chờ một chút để hiệu ứng bước 2 hoàn tất trực quan
      await new Promise((resolve) => setTimeout(resolve, 900))

      // Bước 3: Hoàn tất nạp tri thức
      setStep(3)
      await new Promise((resolve) => setTimeout(resolve, 800))

      onUploaded(uploaded)
      onClose()
    } catch (err: any) {
      console.error('Error uploading material to RAG corpus:', err)
      setError(err?.message || 'Có lỗi xảy ra trong quá trình nạp slide vào Vertex AI RAG Corpus.')
      setSubmitting(false)
      setStep(0)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      onClose()
    }
  }

  return (
    <Modal title="Tải lên Slide & Nạp RAG Corpus" onClose={handleClose}>
      <div className="space-y-5">
        <p className="text-body-sm text-on-surface-variant">
          Slide bài giảng và học liệu tải lên sẽ được lưu trữ an toàn trên Google Cloud Storage và tự động băm vector vào{' '}
          <strong className="text-on-surface">Vertex AI RAG Corpus</strong> để phục vụ AI sinh câu hỏi phỏng vấn chuẩn xác.
        </p>

        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-error-container/80 p-3.5 text-on-error-container">
            <Icon name="error" className="shrink-0 text-lg text-error" />
            <div className="text-body-sm font-medium">{error}</div>
          </div>
        )}

        {/* STEPPER TIẾN TRÌNH RAG KHI SUBMITTING */}
        {submitting && (
          <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low p-4.5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Quy trình nạp tri thức Vertex AI
              </span>
              <span className="text-xs font-semibold text-on-surface-variant">
                {step === 1 ? 'Bước 1 / 3' : step === 2 ? 'Bước 2 / 3' : 'Hoàn tất'}
              </span>
            </div>

            {/* Stepper items */}
            <div className="space-y-3">
              {/* Step 1 */}
              <div
                className={`flex items-start gap-3 rounded-xl p-3 transition-colors ${
                  step === 1
                    ? 'bg-primary-container/20 border border-primary/30 text-on-surface'
                    : step > 1
                      ? 'bg-secondary-fixed/30 text-secondary'
                      : 'text-outline'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {step > 1 ? (
                    <Icon name="check_circle" className="text-lg text-secondary" />
                  ) : step === 1 ? (
                    <Icon name="progress_activity" className="text-lg animate-spin text-primary" />
                  ) : (
                    <Icon name="radio_button_unchecked" className="text-lg" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold">
                    Bước 1: Tải file lên Cloud Storage (GCS)
                  </div>
                  <div className="mt-0.5 truncate text-body-xs font-mono text-on-surface-variant">
                    gs://exam-slides-bucket-2026/{file?.name}
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div
                className={`flex items-start gap-3 rounded-xl p-3 transition-colors ${
                  step === 2
                    ? 'bg-primary-container/20 border border-primary/30 text-on-surface'
                    : step > 2
                      ? 'bg-secondary-fixed/30 text-secondary'
                      : 'text-outline opacity-60'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {step > 2 ? (
                    <Icon name="check_circle" className="text-lg text-secondary" />
                  ) : step === 2 ? (
                    <Icon name="progress_activity" className="text-lg animate-spin text-primary" />
                  ) : (
                    <Icon name="radio_button_unchecked" className="text-lg" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold">
                    Bước 2: Kích hoạt Vertex AI RAG Corpus băm vector
                  </div>
                  <div className="mt-0.5 text-body-xs text-on-surface-variant">
                    Corpus: <span className="font-mono font-semibold">6917529027641081856</span> (chunkSize: 1024, chunkOverlap: 256)...
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div
                className={`flex items-start gap-3 rounded-xl p-3 transition-colors ${
                  step === 3
                    ? 'bg-secondary-fixed/40 border border-secondary/40 text-on-surface'
                    : 'text-outline opacity-60'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {step === 3 ? (
                    <Icon name="verified" className="text-lg text-secondary" />
                  ) : (
                    <Icon name="radio_button_unchecked" className="text-lg" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold">
                    Bước 3: Hoàn tất nạp tri thức!
                  </div>
                  <div className="mt-0.5 text-body-xs text-on-surface-variant">
                    Slide đã sẵn sàng cung cấp ngữ cảnh cho AI sinh câu hỏi phỏng vấn viva.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tiêu đề tài liệu */}
          <div>
            <label htmlFor="material-title" className="block text-label-md font-semibold text-on-surface">
              Tiêu đề tài liệu / Slide <span className="text-error">*</span>
            </label>
            <input
              id="material-title"
              type="text"
              disabled={submitting}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Slide Bài giảng Chương 3 - Microservices Architecture"
              className="mt-1.5 w-full rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none disabled:bg-surface-container disabled:text-outline"
            />
          </div>

          {/* Chọn Bài học & Chủ đề */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="material-lesson" className="block text-label-md font-semibold text-on-surface">
                Liên kết Bài học (Lesson)
              </label>
              <select
                id="material-lesson"
                disabled={submitting || loadingLessons}
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5 text-body-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none disabled:bg-surface-container disabled:text-outline"
              >
                <option value="">-- Không gắn bài học cụ thể --</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="material-topic" className="block text-label-md font-semibold text-on-surface">
                Chủ đề (Topic)
              </label>
              <select
                id="material-topic"
                disabled={submitting || loadingTopics || !selectedLessonId}
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5 text-body-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none disabled:bg-surface-container disabled:text-outline"
              >
                <option value="">
                  {selectedLessonId ? '-- Chọn chủ đề liên quan --' : '-- Chọn bài học trước --'}
                </option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Vùng kéo thả file */}
          <div>
            <label className="block text-label-md font-semibold text-on-surface">
              File Slide / Tài liệu (.pptx, .ppt, .pdf) <span className="text-error">*</span>
            </label>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (!submitting) fileInputRef.current?.click()
              }}
              className={`mt-1.5 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-primary bg-primary-container/10 scale-[1.01]'
                  : file
                    ? 'border-secondary/60 bg-secondary-fixed/20'
                    : 'border-outline-variant/80 bg-surface-container-low hover:border-primary/60 hover:bg-surface-container'
              } ${submitting ? 'pointer-events-none opacity-60' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pptx,.ppt,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    validateAndSetFile(e.target.files[0])
                  }
                }}
              />

              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-fixed text-secondary shadow-sm">
                    <Icon
                      name={file.name.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 'slideshow'}
                      className="text-2xl"
                    />
                  </div>
                  <div className="max-w-xs truncate text-label-md font-bold text-on-surface sm:max-w-md">
                    {file.name}
                  </div>
                  <div className="text-body-xs font-semibold text-secondary">
                    Dung lượng: {formatFileSize(file.size)} &bull; Sẵn sàng nạp
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                    }}
                    className="mt-1 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs text-error hover:bg-error/10 transition-colors"
                  >
                    <Icon name="delete" className="text-sm" />
                    Chọn file khác
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container-high text-primary">
                    <Icon name="cloud_upload" className="text-2xl" />
                  </div>
                  <div className="text-body-sm font-semibold text-on-surface">
                    Kéo thả file slide vào đây hoặc{' '}
                    <span className="text-primary underline">chọn từ thiết bị</span>
                  </div>
                  <p className="text-body-xs text-outline">
                    Định dạng hỗ trợ: PowerPoint (.pptx, .ppt) hoặc PDF (.pdf). Tối đa 50MB.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={submitting}
              onClick={handleClose}
              className="rounded-full px-6 py-2.5 text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || !file || !title.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-container px-6 py-2.5 text-label-md font-semibold text-on-primary shadow-md transition-all hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon
                name={submitting ? 'progress_activity' : 'auto_awesome'}
                className={`text-lg ${submitting ? 'animate-spin' : ''}`}
              />
              <span>{submitting ? 'Đang nạp RAG...' : 'Tải lên & Nạp vào RAG Corpus'}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
