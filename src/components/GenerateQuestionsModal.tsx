import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon'
import { contentService, GenerateQuestionsFromRagRequest } from '../services/contentService'
import { LectureMaterial, Question, Topic } from '../types'

interface GenerateQuestionsModalProps {
  topics: Topic[]
  defaultTopicId?: string
  onClose: () => void
  onGenerated: (questions: Question[]) => void
}

type LoadingStage = 1 | 2 | 3

export default function GenerateQuestionsModal({
  topics,
  defaultTopicId,
  onClose,
  onGenerated,
}: GenerateQuestionsModalProps) {
  const [actualTopics, setActualTopics] = useState<Topic[]>(topics)

  // Topic state
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    defaultTopicId && defaultTopicId !== 'ALL'
      ? defaultTopicId
      : topics[0]?.id || ''
  )

  useEffect(() => {
    if (topics && topics.length > 0) {
      setActualTopics(topics)
      if (!selectedTopicId) {
        setSelectedTopicId(defaultTopicId && defaultTopicId !== 'ALL' ? defaultTopicId : topics[0].id)
      }
    } else {
      contentService.getTopics().then((res) => {
        if (res && res.length > 0) {
          setActualTopics(res)
          setSelectedTopicId((prev) => (prev ? prev : res[0].id))
        }
      }).catch((err) => {
        console.warn('Could not load topics:', err)
      })
    }
  }, [topics, defaultTopicId])

  // Materials state
  const [materials, setMaterials] = useState<LectureMaterial[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(true)
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([])
  const [filterByTopicOnly, setFilterByTopicOnly] = useState(false)

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

  // Load materials from backend
  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        setLoadingMaterials(true)
        const data = await contentService.getMaterials()
        if (isMounted) {
          setMaterials(data || [])
          // Auto-select ready materials
          const ready = (data || []).filter((m) => m.ragStatus === 'READY')
          if (ready.length > 0) {
            setSelectedMaterialIds([ready[0].id])
          }
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

  // Keyboard escape
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

  // Filtered materials
  const displayedMaterials = useMemo(() => {
    if (!filterByTopicOnly || !selectedTopicId) {
      return materials
    }
    return materials.filter((m) => m.topicId === selectedTopicId || !m.topicId)
  }, [materials, selectedTopicId, filterByTopicOnly])

  const readyMaterials = useMemo(() => {
    return displayedMaterials.filter((m) => m.ragStatus === 'READY')
  }, [displayedMaterials])

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

  // Toggle select all READY materials
  const handleToggleSelectAll = () => {
    const readyIds = readyMaterials.map((m) => m.id)
    const allSelected = readyIds.every((id) => selectedMaterialIds.includes(id))
    if (allSelected) {
      setSelectedMaterialIds([])
    } else {
      setSelectedMaterialIds(readyIds)
    }
  }

  const toggleMaterial = (id: string, isReady: boolean) => {
    if (!isReady || isGenerating) return
    setSelectedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Start Generation
  const handleStartGenerate = async () => {
    if (!selectedTopicId) {
      setError('Vui lòng chọn Chủ đề bài giảng.')
      return
    }

    if (selectedMaterialIds.length === 0) {
      setError('Vui lòng chọn ít nhất 1 tài liệu Slide RAG có trạng thái READY (BR-MAT-003).')
      return
    }

    if (!isBloomValid) {
      setError('Tổng tỷ lệ thang đo Bloom phải bằng 100%. Vui lòng điều chỉnh lại.')
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

      // Guarantee minimum visual feedback for high UX fidelity
      await new Promise((r) => setTimeout(r, 600))

      onGenerated(generated)
      onClose()
    } catch (err: any) {
      console.error('Error generating questions from RAG:', err)
      setError(err?.message || 'Có lỗi xảy ra khi sinh câu hỏi từ Slide RAG. Vui lòng thử lại.')
    } finally {
      clearTimeout(stage2Timer)
      clearTimeout(stage3Timer)
      setIsGenerating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-inverse-surface/60 p-3 sm:p-4 backdrop-blur-sm transition-opacity"
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
        className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-surface-container-lowest p-6 sm:p-8 shadow-2xl outline-none border border-outline-variant/30 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/30 pb-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary-container text-on-primary shadow-md">
              <Icon name="auto_awesome" className="text-2xl animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="generate-modal-title" className="text-xl sm:text-2xl font-bold text-on-surface">
                  Sinh câu hỏi Grounded AI từ Slide RAG
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-2.5 py-0.5 text-[11px] font-bold text-primary">
                  <Icon name="psychology" className="text-xs" />
                  Vertex AI Managed RAG
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                Truy xuất ngữ liệu slide bài giảng chính thống, áp dụng thang đo Bloom và tự động tạo Rubric chuẩn hóa 100% trọng số (BR-BANK-001/002).
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
          <div className="mt-4 flex items-center justify-between rounded-xl bg-error-container p-3.5 text-xs text-on-error-container shadow-sm">
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

        {/* Dynamic Loading State Indicator */}
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
                {loadingStage === 1 && 'AI đang truy xuất ngữ liệu RAG từ Slide...'}
                {loadingStage === 2 && 'Đang suy luận và lập luận câu hỏi theo thang Bloom...'}
                {loadingStage === 3 && 'Đang thiết lập Rubric 100% trọng số...'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                Quá trình này bóc tách vector semantic từ Google Cloud Storage và kích hoạt mô hình Gemini 1.5 Flash grounded.
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
                <span>1. Semantic Search</span>
              </div>
              <span className="text-outline">→</span>
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  loadingStage >= 2
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-surface-container text-outline'
                }`}
              >
                <span>2. Bloom Reasoning</span>
              </div>
              <span className="text-outline">→</span>
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  loadingStage >= 3
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-surface-container text-outline'
                }`}
              >
                <span>3. Rubric Matrix</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-6">
            {/* 1. Chọn Chủ đề */}
            <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="topic-select"
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-on-surface"
                >
                  <Icon name="topic" className="text-primary text-base" />
                  1. Chọn Chủ đề môn học (Topic)
                </label>
                <span className="text-xs text-outline font-medium">
                  {actualTopics.length} chủ đề khả dụng
                </span>
              </div>

              {actualTopics.length === 0 ? (
                <div className="rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-lowest p-3 text-xs text-on-surface-variant flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span>Chưa có chủ đề nào trong hệ thống. Vui lòng thiết lập Bài học & Chủ đề trước.</span>
                  <a
                    href="/lecturer/curriculum"
                    className="font-bold text-primary hover:underline shrink-0"
                  >
                    Đến trang Quản lý ➔
                  </a>
                </div>
              ) : (
                <select
                  id="topic-select"
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                >
                  {actualTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.lessonTitle ? `(${t.lessonTitle})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 2. Chọn Tài liệu Slide RAG Nguồn */}
            <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <Icon name="source" className="text-primary text-base" />
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
                    2. Chọn tài liệu Slide RAG nguồn (BR-MAT-003)
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-on-surface-variant cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={filterByTopicOnly}
                      onChange={(e) => setFilterByTopicOnly(e.target.checked)}
                      className="rounded text-primary focus:ring-primary/30"
                    />
                    <span>Chỉ hiện slide thuộc chủ đề</span>
                  </label>

                  {readyMaterials.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {readyMaterials.every((m) => selectedMaterialIds.includes(m.id))
                        ? 'Bỏ chọn tất cả'
                        : 'Chọn tất cả READY'}
                    </button>
                  )}
                </div>
              </div>

              {loadingMaterials ? (
                <div className="py-6 text-center text-xs text-on-surface-variant">
                  <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  Đang tải danh sách tài liệu RAG...
                </div>
              ) : displayedMaterials.length === 0 ? (
                <div className="rounded-xl border border-dashed border-outline-variant/50 p-6 text-center">
                  <Icon name="folder_off" className="text-2xl text-outline mx-auto" />
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Chưa có tài liệu slide nào. Vui lòng nạp học liệu tại trang{' '}
                    <strong className="text-primary">Quản lý Slide RAG</strong> trước.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {displayedMaterials.map((mat) => {
                    const isReady = mat.ragStatus === 'READY'
                    const isSelected = selectedMaterialIds.includes(mat.id)
                    const isSlide = mat.fileType === 'pptx' || mat.fileType === 'ppt'

                    return (
                      <div
                        key={mat.id}
                        onClick={() => toggleMaterial(mat.id, isReady)}
                        className={`flex items-center justify-between gap-3 rounded-xl p-3 border transition-all ${
                          !isReady
                            ? 'bg-surface-container-high/40 border-outline-variant/30 opacity-65 cursor-not-allowed'
                            : isSelected
                              ? 'bg-primary-fixed/20 border-primary/50 shadow-sm cursor-pointer'
                              : 'bg-surface-container-lowest border-outline-variant/40 hover:border-primary/40 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!isReady}
                            onChange={() => toggleMaterial(mat.id, isReady)}
                            className="h-4 w-4 rounded text-primary focus:ring-primary/20 shrink-0"
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
                              {mat.fileName} • {mat.chunkCount || 0} chunks RAG
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {isReady ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary-fixed/50 px-2 py-0.5 text-[10px] font-bold text-secondary">
                              <Icon name="check_circle" className="text-xs" />
                              READY
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-error-container px-2 py-0.5 text-[10px] font-bold text-on-error-container"
                              title="Tài liệu chưa lập chỉ mục thành công (BR-MAT-003)"
                            >
                              <Icon name="warning" className="text-xs text-error" />
                              {mat.ragStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-xs text-on-surface-variant pt-2 border-t border-outline-variant/20">
                <span>
                  Đã chọn: <strong className="text-primary">{selectedMaterialIds.length}</strong> tài liệu READY
                </span>
                <span className="text-[11px] text-outline">
                  (Chỉ tài liệu READY mới được dùng để sinh câu hỏi Grounded)
                </span>
              </div>
            </div>

            {/* 3. Số lượng câu hỏi & Cấu hình Bloom */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Cột trái: Số lượng câu hỏi */}
              <div className="md:col-span-4 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon name="tag" className="text-primary text-base" />
                    <label
                      htmlFor="question-count-input"
                      className="text-xs font-bold uppercase tracking-wider text-on-surface"
                    >
                      3. Số lượng câu hỏi
                    </label>
                  </div>
                  <p className="text-xs text-on-surface-variant mb-4">
                    Số câu hỏi viva AI sẽ sinh và gắn Rubric.
                  </p>

                  <div className="flex items-center gap-2">
                    <input
                      id="question-count-input"
                      type="number"
                      min={1}
                      max={20}
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                      className="w-20 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3 py-2 text-center text-base font-bold text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-xs text-on-surface-variant font-medium">câu (1 - 20)</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
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

                <div className="mt-4 rounded-xl bg-surface-container p-2.5 text-[11px] text-outline">
                  <Icon name="info" className="text-xs inline mr-1 text-primary" />
                  Mỗi câu hỏi sinh ra sẽ mang trạng thái <strong>DRAFT</strong> (BR-BANK-002) kèm Model Answer & Rubric.
                </div>
              </div>

              {/* Cột phải: Thang đo Bloom */}
              <div className="md:col-span-8 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Icon name="bar_chart" className="text-primary text-base" />
                    <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
                      4. Tỷ lệ Thang đo Bloom
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
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
                <div className="space-y-3">
                  {/* REMEMBER */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-on-surface flex items-center gap-1">
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
                      <span className="font-semibold text-on-surface flex items-center gap-1">
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
                      <span className="font-semibold text-on-surface flex items-center gap-1">
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
                      <span className="font-semibold text-on-surface flex items-center gap-1">
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
          </div>
        )}

        {/* Footer Actions */}
        {!isGenerating && (
          <div className="mt-8 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-outline-variant/30 pt-5">
            <div className="flex items-center gap-2 text-xs text-outline">
              <Icon name="verified_user" className="text-secondary text-base" />
              <span>Neo chặt tri thức vào slide đã băm vector RAG</span>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-outline-variant/60 bg-surface-container px-5 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
              >
                Hủy bỏ
              </button>

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
        )}
      </div>
    </div>
  )
}
