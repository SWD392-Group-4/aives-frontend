import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon'
import UploadMaterialModal from './UploadMaterialModal'
import { contentService, GenerateQuestionsFromRagRequest } from '../services/contentService'
import { LectureMaterial, Lesson, Question, Topic } from '../types'

interface GenerateQuestionsModalProps {
  topics: Topic[]
  defaultTopicId?: string
  onClose: () => void
  onGenerated: (questions: Question[]) => void
}

type LoadingStage = 1 | 2 | 3
type StepNumber = 1 | 2 | 3

export default function GenerateQuestionsModal({
  topics,
  defaultTopicId,
  onClose,
  onGenerated,
}: GenerateQuestionsModalProps) {
  // Curriculum data state
  const [actualTopics, setActualTopics] = useState<Topic[]>(topics || [])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loadingCurriculum, setLoadingCurriculum] = useState(true)

  // Step state for progressive sequential flow
  const [activeStep, setActiveStep] = useState<StepNumber>(1)

  // Scope selection: Lesson & Topic
  const [selectedLessonId, setSelectedLessonId] = useState<string>('')
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    defaultTopicId && defaultTopicId !== 'ALL'
      ? defaultTopicId
      : topics[0]?.id || ''
  )

  // Materials state - strictly READY materials
  const [materials, setMaterials] = useState<LectureMaterial[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(true)
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([])
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  // Question configuration
  const [questionCount, setQuestionCount] = useState<number>(5)

  // Bloom taxonomy distribution (percentages)
  const [bloomDist, setBloomDist] = useState({
    REMEMBER: 20,
    UNDERSTAND: 40,
    APPLY: 20,
    ANALYZE: 20,
  })

  // Dynamic loading state during AI generation
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingStage, setLoadingStage] = useState<LoadingStage>(1)
  const [error, setError] = useState<string | null>(null)

  const modalRef = useRef<HTMLDivElement>(null)

  // Tải danh sách bài học và chủ đề từ máy chủ
  useEffect(() => {
    let isMounted = true
    const loadCurriculum = async () => {
      try {
        setLoadingCurriculum(true)
        const [topList, lesList] = await Promise.all([
          contentService.getTopics(),
          contentService.getLessons(),
        ])
        if (isMounted) {
          const validTopics = Array.isArray(topList) ? topList : []
          const validLessons = Array.isArray(lesList) ? lesList : []
          setActualTopics(validTopics)
          setLessons(validLessons)

          // Determine initial lesson & topic selection
          if (defaultTopicId && defaultTopicId !== 'ALL') {
            const matchedTopic = validTopics.find((t) => t.id === defaultTopicId)
            if (matchedTopic) {
              setSelectedTopicId(matchedTopic.id)
              if (matchedTopic.lessonId) {
                setSelectedLessonId(matchedTopic.lessonId)
              }
            }
          } else if (validLessons.length > 0) {
            const firstLesson = validLessons[0]
            setSelectedLessonId(firstLesson.id)
            const firstTopicInLesson = validTopics.find((t) => t.lessonId === firstLesson.id)
            if (firstTopicInLesson) {
              setSelectedTopicId(firstTopicInLesson.id)
            } else if (validTopics.length > 0) {
              setSelectedTopicId(validTopics[0].id)
            }
          } else if (validTopics.length > 0) {
            setSelectedTopicId(validTopics[0].id)
          }
        }
      } catch (err) {
        console.warn('Failed to load curriculum in modal:', err)
      } finally {
        if (isMounted) setLoadingCurriculum(false)
      }
    }
    loadCurriculum()
    return () => {
      isMounted = false
    }
  }, [defaultTopicId])

  // Load materials from backend - only materials ready for RAG
  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        setLoadingMaterials(true)
        const data = await contentService.getMaterials()
        if (isMounted) {
          // Chỉ lấy tài liệu ở trạng thái READY (không hiện tài liệu chưa sẵn sàng)
          const readyOnly = (data || []).filter((m) => m.ragStatus === 'READY')
          setMaterials(readyOnly)
        }
      } catch (err: any) {
        console.error('Failed to load materials in modal:', err)
      } finally {
        if (isMounted) setLoadingMaterials(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  // Keyboard escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGenerating) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [isGenerating, onClose])

  // Lọc chủ đề theo bài học đã chọn
  const availableTopicsForLesson = useMemo(() => {
    if (!selectedLessonId) return actualTopics
    const filtered = actualTopics.filter((t) => t.lessonId === selectedLessonId)
    return filtered.length > 0 ? filtered : actualTopics
  }, [actualTopics, selectedLessonId])

  // Khi người dùng đổi Bài học, tự động chọn chủ đề đầu tiên của bài học đó
  const handleLessonChange = (newLessonId: string) => {
    setSelectedLessonId(newLessonId)
    const topicsInLesson = actualTopics.filter((t) => t.lessonId === newLessonId)
    if (topicsInLesson.length > 0) {
      setSelectedTopicId(topicsInLesson[0].id)
    }
  }

  // Danh sách tài liệu READY: Chỉ hiển thị tài liệu thuộc chủ đề đã chọn
  const readyMaterials = useMemo(() => {
    if (!selectedTopicId || materials.length === 0) return []
    return materials.filter(
      (m) => m.ragStatus === 'READY' && m.topicId === selectedTopicId
    )
  }, [materials, selectedTopicId])

  // Tự động chọn tài liệu đầu tiên khi danh sách tài liệu khả dụng thay đổi
  useEffect(() => {
    if (readyMaterials.length > 0) {
      const isCurrentSelectionValid = selectedMaterialIds.some((id) =>
        readyMaterials.some((m) => m.id === id)
      )
      if (!isCurrentSelectionValid) {
        setSelectedMaterialIds([readyMaterials[0].id])
      }
    } else {
      setSelectedMaterialIds([])
    }
  }, [readyMaterials])

  // Bloom sum calculation
  const totalBloomPercent = useMemo(() => {
    return (
      (bloomDist.REMEMBER || 0) +
      (bloomDist.UNDERSTAND || 0) +
      (bloomDist.APPLY || 0) +
      (bloomDist.ANALYZE || 0)
    )
  }, [bloomDist])

  const isBloomValid = totalBloomPercent === 100

  // Presets
  const applyPreset = (rem: number, und: number, app: number, ana: number) => {
    setBloomDist({
      REMEMBER: rem,
      UNDERSTAND: und,
      APPLY: app,
      ANALYZE: ana,
    })
  }

  const toggleMaterial = (id: string) => {
    if (isGenerating) return
    setSelectedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Metadata for collapsed summary cards
  const currentLesson = lessons.find((l) => l.id === selectedLessonId)
  const currentTopic = actualTopics.find((t) => t.id === selectedTopicId)
  const selectedMaterials = readyMaterials.filter((m) => selectedMaterialIds.includes(m.id))

  // Start Generation
  const handleStartGenerate = async () => {
    if (!selectedTopicId) {
      setError('Vui lòng chọn Chủ đề bài giảng.')
      setActiveStep(1)
      return
    }

    if (selectedMaterialIds.length === 0) {
      setError('Vui lòng chọn ít nhất 1 tài liệu bài giảng hợp lệ để tạo câu hỏi.')
      setActiveStep(2)
      return
    }

    if (!isBloomValid) {
      setError('Tổng tỷ lệ thang đo Bloom phải bằng 100%. Vui lòng điều chỉnh lại.')
      setActiveStep(3)
      return
    }

    setError(null)
    setIsGenerating(true)
    setLoadingStage(1)

    // Dynamic staged loading messages
    const stage2Timer = setTimeout(() => {
      setLoadingStage(2)
    }, 1200)

    const stage3Timer = setTimeout(() => {
      setLoadingStage(3)
    }, 2400)

    try {
      const request: GenerateQuestionsFromRagRequest = {
        topicId: selectedTopicId,
        materialIds: selectedMaterialIds,
        questionCount,
        bloomDistribution: bloomDist,
      }

      const generated = await contentService.generateQuestionsFromRag(request)

      // Guarantee minimum visual feedback
      await new Promise((r) => setTimeout(r, 600))

      onGenerated(generated)
      onClose()
    } catch (err: any) {
      console.error('Error generating questions from RAG:', err)
      setError(err?.message || 'Có lỗi xảy ra khi tạo câu hỏi từ tài liệu. Vui lòng thử lại.')
    } finally {
      clearTimeout(stage2Timer)
      clearTimeout(stage3Timer)
      setIsGenerating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[50] flex items-center justify-center bg-inverse-surface/60 p-3 sm:p-4 backdrop-blur-sm transition-opacity"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isGenerating) {
          onClose()
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="generate-modal-title"
        className="h-[740px] max-h-[92vh] w-full max-w-4xl rounded-[2rem] bg-surface-container-lowest shadow-2xl outline-none border border-outline-variant/30 flex flex-col overflow-hidden"
      >
        {/* Header - Cố định ở trên */}
        <div className="shrink-0 flex items-start justify-between gap-4 border-b border-outline-variant/30 px-6 sm:px-8 py-5 bg-surface-container-lowest">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary-container text-on-primary shadow-md">
              <Icon name="auto_awesome" className="text-2xl animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="generate-modal-title" className="text-xl sm:text-2xl font-bold text-on-surface">
                  Tạo câu hỏi bằng AI từ tài liệu môn học
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-2.5 py-0.5 text-[11px] font-bold text-primary">
                  <Icon name="psychology" className="text-xs" />
                  Trợ lý AI
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                Tự động trích xuất nội dung từ bài giảng, áp dụng thang đo Bloom và tạo thang điểm chấm tương ứng.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            aria-label="Đóng hộp thoại"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-40"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="shrink-0 mx-6 sm:mx-8 mt-4 flex items-center justify-between rounded-xl bg-error-container p-3.5 text-xs text-on-error-container shadow-sm">
            <div className="flex items-center gap-2 font-medium">
              <Icon name="error" className="text-lg shrink-0 text-error" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-outline hover:text-on-surface"
            >
              <Icon name="close" className="text-sm" />
            </button>
          </div>
        )}

        {/* Main Content Area - Cố định kích thước, cuộn bên trong */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-5">
          {isGenerating ? (
          <div className="py-12 px-4 text-center space-y-6">
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-primary-fixed/30 text-primary shadow-inner">
              <Icon
                name={
                  loadingStage === 1
                    ? 'manage_search'
                    : loadingStage === 2
                      ? 'psychology'
                      : 'verified'
                }
                className="text-4xl animate-bounce"
              />
              <div className="absolute inset-0 rounded-3xl border-2 border-primary border-t-transparent animate-spin"></div>
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-on-surface">
                {loadingStage === 1 && 'AI đang đọc và phân tích nội dung tài liệu...'}
                {loadingStage === 2 && 'Đang xây dựng câu hỏi theo các mức độ Bloom...'}
                {loadingStage === 3 && 'Đang thiết lập thang điểm chấm (Rubric)...'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                Quá trình này phân tích nội dung bài giảng và thiết kế câu hỏi kèm thang điểm tương ứng.
              </p>
            </div>

            {/* Stepper Progress */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  loadingStage >= 1
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-surface-container text-outline'
                }`}
              >
                <span>1. Phân tích nội dung</span>
              </div>
              <span className="text-outline">→</span>
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  loadingStage >= 2
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-surface-container text-outline'
                }`}
              >
                <span>2. Sinh câu hỏi Bloom</span>
              </div>
              <span className="text-outline">→</span>
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  loadingStage >= 3
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-surface-container text-outline'
                }`}
              >
                <span>3. Tạo Rubric chấm điểm</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {/* ===================== BƯỚC 1: BÀI HỌC & CHỦ ĐỀ ===================== */}
            {activeStep === 1 ? (
              <div className="rounded-2xl border-2 border-primary/40 bg-surface-container-lowest p-5 shadow-sm transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary text-xs font-bold">
                      1
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-on-surface">
                        Chọn Bài học & Chủ đề môn học
                      </h3>
                      <p className="text-xs text-on-surface-variant">
                        Xác định phạm vi kiến thức mà AI sẽ sử dụng để đặt câu hỏi.
                      </p>
                    </div>
                  </div>
                </div>

                {loadingCurriculum ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-on-surface-variant">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    <span>Đang tải thông tin bài học và chủ đề...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Chọn Bài học */}
                      <div>
                        <label
                          htmlFor="lesson-select"
                          className="block text-xs font-bold text-on-surface mb-1.5"
                        >
                          Bài học (Chương)
                        </label>
                        <select
                          id="lesson-select"
                          value={selectedLessonId}
                          onChange={(e) => handleLessonChange(e.target.value)}
                          className="w-full rounded-xl border border-outline-variant/60 bg-surface-container-low px-3.5 py-2.5 text-sm font-medium text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        >
                          {lessons.length === 0 ? (
                            <option value="">Chưa có bài học nào trong hệ thống</option>
                          ) : (
                            lessons.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.title}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* Chọn Chủ đề */}
                      <div>
                        <label
                          htmlFor="topic-select"
                          className="block text-xs font-bold text-on-surface mb-1.5"
                        >
                          Chủ đề bài giảng (Topic)
                        </label>
                        <select
                          id="topic-select"
                          value={selectedTopicId}
                          onChange={(e) => setSelectedTopicId(e.target.value)}
                          className="w-full rounded-xl border border-outline-variant/60 bg-surface-container-low px-3.5 py-2.5 text-sm font-medium text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        >
                          {availableTopicsForLesson.length === 0 ? (
                            <option value="">Không có chủ đề trong bài học này</option>
                          ) : (
                            availableTopicsForLesson.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Nút tiếp tục sang Bước 2 */}
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        disabled={!selectedTopicId}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-on-primary shadow-sm hover:bg-primary/90 transition-all disabled:opacity-40"
                      >
                        <span>Tiếp tục: Chọn tài liệu</span>
                        <Icon name="arrow_forward" className="text-sm" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Bước 1 đã hoàn thành -> Thu gọn lại */
              <div
                onClick={() => setActiveStep(1)}
                className="flex items-center justify-between rounded-2xl border border-outline-variant/40 bg-surface-container-low p-3.5 sm:p-4 hover:border-primary/50 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                    <Icon name="check" className="text-base font-bold" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                        Phạm vi bài giảng
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-on-surface truncate">
                      {currentLesson?.title || 'Tất cả bài học'}
                      <span className="text-outline mx-1.5 font-normal">➔</span>
                      <span className="text-primary">{currentTopic?.name || 'Chủ đề mặc định'}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveStep(1)
                  }}
                  className="shrink-0 text-xs font-semibold text-primary hover:underline px-3 py-1 rounded-lg hover:bg-primary/5 transition-colors"
                >
                  Thay đổi
                </button>
              </div>
            )}

            {/* ===================== CHỌN TÀI LIỆU BÀI GIẢNG ===================== */}
            {activeStep === 2 ? (
              <div className="rounded-2xl border-2 border-primary/40 bg-surface-container-lowest p-5 shadow-sm transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary text-xs font-bold">
                      2
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-on-surface">
                        Chọn tài liệu bài giảng nguồn
                      </h3>
                      <p className="text-xs text-on-surface-variant">
                        Chỉ hiển thị các tài liệu đã sẵn sàng phục vụ sinh câu hỏi.
                      </p>
                    </div>
                  </div>

                  {/* Nút Thêm tài liệu */}
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary px-3.5 py-1.5 text-xs font-bold transition-all hover:shadow-sm"
                  >
                    <Icon name="add" className="text-sm" />
                    <span>Thêm tài liệu</span>
                  </button>
                </div>

                {loadingMaterials ? (
                  <div className="py-8 text-center text-xs text-on-surface-variant">
                    <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    Đang tải danh sách tài liệu...
                  </div>
                ) : readyMaterials.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-low p-6 text-center">
                    <Icon name="folder_off" className="text-2xl text-outline mx-auto" />
                    <p className="mt-2 text-xs font-semibold text-on-surface">
                      Chưa có tài liệu sẵn sàng nào thuộc chủ đề "{currentTopic?.name || ''}".
                    </p>
                    <p className="mt-1 text-[11px] text-on-surface-variant">
                      Vui lòng bấm nút <strong>"+ Thêm tài liệu"</strong> ở góc trên để tải lên slide cho chủ đề này.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {readyMaterials.map((mat) => {
                      const isSelected = selectedMaterialIds.includes(mat.id)
                      const isSlide = mat.fileType === 'pptx' || mat.fileType === 'ppt'

                      return (
                        <div
                          key={mat.id}
                          onClick={() => toggleMaterial(mat.id)}
                          className={`flex items-center justify-between gap-3 rounded-xl p-3 border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary-fixed/20 border-primary/60 shadow-sm'
                              : 'bg-surface-container-low border-outline-variant/40 hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleMaterial(mat.id)}
                              className="h-4 w-4 rounded text-primary focus:ring-primary/20 shrink-0 cursor-pointer"
                              aria-label={`Chọn tài liệu ${mat.title}`}
                            />

                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${
                                isSlide
                                  ? 'bg-amber-500/10 text-amber-600'
                                  : 'bg-rose-500/10 text-rose-600'
                              }`}
                            >
                              <Icon name={isSlide ? 'slideshow' : 'picture_as_pdf'} />
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-bold text-on-surface truncate" title={mat.title}>
                                {mat.title}
                              </p>
                              <p className="text-[11px] text-outline truncate">
                                {mat.fileName}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary-fixed/50 px-2 py-0.5 text-[10px] font-bold text-secondary">
                              <Icon name="check_circle" className="text-xs" />
                              Sẵn sàng
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Footer Phần 2 - Đã bỏ nút Quay lại */}
                <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant">
                    Đã chọn: <strong className="text-primary">{selectedMaterialIds.length}</strong> tài liệu
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    disabled={selectedMaterialIds.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-on-primary shadow-sm hover:bg-primary/90 transition-all disabled:opacity-40"
                  >
                    <span>Tiếp tục: Cấu hình câu hỏi</span>
                    <Icon name="arrow_forward" className="text-sm" />
                  </button>
                </div>
              </div>
            ) : activeStep > 2 ? (
              /* Phần 2 đã hoàn thành -> Thu gọn lại */
              <div
                onClick={() => setActiveStep(2)}
                className="flex items-center justify-between rounded-2xl border border-outline-variant/40 bg-surface-container-low p-3.5 sm:p-4 hover:border-primary/50 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                    <Icon name="check" className="text-base font-bold" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                      Tài liệu bài giảng
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-on-surface truncate">
                      Đã chọn {selectedMaterialIds.length} tài liệu
                      {selectedMaterials.length > 0 && (
                        <span className="text-outline font-normal">
                          {' '}({selectedMaterials.map((m) => m.title).join(', ')})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveStep(2)
                  }}
                  className="shrink-0 text-xs font-semibold text-primary hover:underline px-3 py-1 rounded-lg hover:bg-primary/5 transition-colors"
                >
                  Thay đổi
                </button>
              </div>
            ) : (
              /* Phần 2 chưa tới lượt -> Hiển thị dạng chờ */
              <div className="flex items-center gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/50 p-3.5 opacity-50">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container text-outline text-xs font-bold">
                  2
                </div>
                <div>
                  <span className="text-xs font-bold text-outline">
                    2. Tài liệu bài giảng nguồn
                  </span>
                  <p className="text-[11px] text-outline">
                    Chọn bài học & chủ đề ở trên để tiếp tục
                  </p>
                </div>
              </div>
            )}

            {/* ===================== BƯỚC 3: CẤU HÌNH CÂU HỎI & BLOOM ===================== */}
            {activeStep === 3 ? (
              <div className="rounded-2xl border-2 border-primary/40 bg-surface-container-lowest p-5 shadow-sm transition-all space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary text-xs font-bold">
                      3
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-on-surface">
                        Cấu hình số lượng & Thang đo Bloom
                      </h3>
                      <p className="text-xs text-on-surface-variant">
                        Tùy chỉnh độ khó và tỷ lệ phân bổ các mức độ nhận thức của câu hỏi.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* 1. Chọn số lượng câu hỏi */}
                  <div className="md:col-span-5 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label
                          htmlFor="question-count-input"
                          className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5"
                        >
                          <Icon name="tag" className="text-primary text-sm" />
                          Số lượng câu hỏi
                        </label>
                        <span className="text-xs text-on-surface-variant font-medium">
                          (Tối đa 20 câu)
                        </span>
                      </div>

                      <div className="flex items-center gap-3 my-3">
                        <input
                          id="question-count-input"
                          type="number"
                          min={1}
                          max={20}
                          value={questionCount}
                          onChange={(e) =>
                            setQuestionCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))
                          }
                          className="w-20 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3 py-1.5 text-center text-sm font-bold text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-xs text-on-surface-variant font-medium">câu hỏi</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {[3, 5, 8, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setQuestionCount(num)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                              questionCount === num
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                            }`}
                          >
                            {num} câu {num === 5 ? '★' : ''}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl bg-surface-container/60 p-3 text-[11px] text-on-surface-variant leading-relaxed">
                      <Icon name="info" className="text-xs inline mr-1 text-primary" />
                      Mỗi câu hỏi sinh ra sẽ có gợi ý câu trả lời & thang điểm chấm (Rubric) chi tiết.
                    </div>
                  </div>

                  {/* 2. Thang đo Bloom */}
                  <div className="md:col-span-7 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Icon name="bar_chart" className="text-primary text-sm" />
                        <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
                          Tỷ lệ Thang đo Bloom
                        </span>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isBloomValid
                            ? 'bg-secondary-fixed/60 text-secondary'
                            : 'bg-error-container text-on-error-container'
                        }`}
                      >
                        Tổng: {totalBloomPercent}% {isBloomValid ? '✓' : '(≠ 100%)'}
                      </span>
                    </div>

                    {/* Preset buttons */}
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyPreset(20, 40, 20, 20)}
                        className="rounded-lg bg-surface-container px-2.5 py-1 text-[11px] font-medium text-on-surface hover:bg-surface-container-high transition-colors"
                      >
                        Cân bằng (20/40/20/20)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset(10, 50, 30, 10)}
                        className="rounded-lg bg-surface-container px-2.5 py-1 text-[11px] font-medium text-on-surface hover:bg-surface-container-high transition-colors"
                      >
                        Hiểu sâu (10/50/30/10)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset(10, 20, 40, 30)}
                        className="rounded-lg bg-surface-container px-2.5 py-1 text-[11px] font-medium text-on-surface hover:bg-surface-container-high transition-colors"
                      >
                        Vận dụng cao (10/20/40/30)
                      </button>
                    </div>

                    {/* Sliders for 4 levels */}
                    <div className="space-y-2.5">
                      {/* REMEMBER */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-on-surface flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                            REMEMBER (Nhớ - Định nghĩa, thuật ngữ)
                          </span>
                          <span className="font-mono font-bold text-primary">{bloomDist.REMEMBER}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={bloomDist.REMEMBER}
                          onChange={(e) =>
                            setBloomDist((prev) => ({ ...prev, REMEMBER: parseInt(e.target.value) || 0 }))
                          }
                          className="w-full accent-primary h-1.5 bg-surface-container rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* UNDERSTAND */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-on-surface flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            UNDERSTAND (Hiểu - Cơ chế, luồng xử lý)
                          </span>
                          <span className="font-mono font-bold text-primary">{bloomDist.UNDERSTAND}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={bloomDist.UNDERSTAND}
                          onChange={(e) =>
                            setBloomDist((prev) => ({ ...prev, UNDERSTAND: parseInt(e.target.value) || 0 }))
                          }
                          className="w-full accent-emerald-500 h-1.5 bg-surface-container rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* APPLY */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-on-surface flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                            APPLY (Vận dụng - Tình huống, thiết kế)
                          </span>
                          <span className="font-mono font-bold text-primary">{bloomDist.APPLY}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={bloomDist.APPLY}
                          onChange={(e) =>
                            setBloomDist((prev) => ({ ...prev, APPLY: parseInt(e.target.value) || 0 }))
                          }
                          className="w-full accent-amber-500 h-1.5 bg-surface-container rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* ANALYZE */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-on-surface flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                            ANALYZE (Phân tích - So sánh, phản biện)
                          </span>
                          <span className="font-mono font-bold text-primary">{bloomDist.ANALYZE}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={bloomDist.ANALYZE}
                          onChange={(e) =>
                            setBloomDist((prev) => ({ ...prev, ANALYZE: parseInt(e.target.value) || 0 }))
                          }
                          className="w-full accent-purple-500 h-1.5 bg-surface-container rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Phần 3 - Đã bỏ nút Quay lại */}
                <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleStartGenerate}
                    disabled={selectedMaterialIds.length === 0 || !isBloomValid}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-container px-6 py-2.5 text-xs font-bold text-on-primary shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Icon name="auto_awesome" className="text-sm" />
                    <span>Bắt đầu sinh đề ({questionCount} câu)</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Phần 3 chưa tới lượt -> Hiển thị dạng chờ */
              <div className="flex items-center gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/50 p-3.5 opacity-50">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container text-outline text-xs font-bold">
                  3
                </div>
                <div>
                  <span className="text-xs font-bold text-outline">
                    3. Cấu hình số lượng & Thang đo Bloom
                  </span>
                  <p className="text-[11px] text-outline">
                    Chọn tài liệu ở trên để tiến hành cấu hình
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        </div>

        {/* Global Footer - Cố định ở dưới */}
        {!isGenerating && (
          <div className="shrink-0 flex items-center justify-between border-t border-outline-variant/30 px-6 sm:px-8 py-4 bg-surface-container-lowest">
            <div className="flex items-center gap-1.5 text-xs text-outline">
              <Icon name="verified_user" className="text-secondary text-base" />
              <span>Câu hỏi được sinh trực tiếp từ tài liệu bài giảng</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-outline-variant/60 bg-surface-container px-4 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Hủy bỏ
            </button>
          </div>
        )}
      </div>

      {/* Upload Material Modal - fill sẵn Bài học & Chủ đề */}
      {uploadModalOpen && (
        <UploadMaterialModal
          defaultLessonId={selectedLessonId}
          defaultTopicId={selectedTopicId}
          onClose={() => setUploadModalOpen(false)}
          onUploaded={(newMaterial) => {
            setMaterials((prev) => [newMaterial, ...prev])
            if (newMaterial.ragStatus === 'READY') {
              setSelectedMaterialIds((prev) => [newMaterial.id, ...prev])
            }
            setUploadModalOpen(false)
          }}
        />
      )}
    </div>
  )
}
