import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal'
import CopyButton from '../components/CopyButton'
import Icon from '../components/Icon'
import LecturerLayout from '../components/LecturerLayout'
import UploadMaterialModal from '../components/UploadMaterialModal'
import { contentService } from '../services/contentService'
import { LectureMaterial, Lesson, RagStatus, Topic } from '../types'
import { formatDateTime } from '../utils/dateTime'

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function MaterialsManagementPage() {
  const [materials, setMaterials] = useState<LectureMaterial[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLessonId, setSelectedLessonId] = useState<string>('')
  const [selectedTopicId, setSelectedTopicId] = useState<string>('')
  const [selectedRagStatus, setSelectedRagStatus] = useState<RagStatus | 'ALL'>('ALL')

  // Modals & Actions
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [deletingMaterial, setDeletingMaterial] = useState<LectureMaterial | null>(null)
  const [reindexingId, setReindexingId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  // Feedback Banner
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  // Fetch initial data
  const loadData = async () => {
    try {
      setLoading(true)
      const [materialsData, lessonsData, topicsData] = await Promise.all([
        contentService.getMaterials(),
        contentService.getLessons().catch(() => []),
        contentService.getTopics().catch(() => []),
      ])
      setMaterials(materialsData || [])
      setLessons(lessonsData || [])
      setTopics(topicsData || [])
    } catch (err: any) {
      console.error('Failed to load materials:', err)
      setBanner({
        type: 'error',
        message: err?.message || 'Không thể tải danh sách tài liệu. Vui lòng thử lại sau.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter topics based on selected lesson
  const availableTopics = useMemo(() => {
    if (!selectedLessonId) return topics
    return topics.filter((t) => t.lessonId === selectedLessonId)
  }, [topics, selectedLessonId])

  // Reset selected topic if lesson changes and topic doesn't belong
  useEffect(() => {
    if (selectedTopicId && selectedLessonId) {
      const match = topics.find((t) => t.id === selectedTopicId && t.lessonId === selectedLessonId)
      if (!match) setSelectedTopicId('')
    }
  }, [selectedLessonId, selectedTopicId, topics])

  // Statistics calculation
  const stats = useMemo(() => {
    const total = materials.length
    const slides = materials.filter((m) => m.fileType === 'pptx' || m.fileType === 'ppt').length
    const pdfs = materials.filter((m) => m.fileType === 'pdf').length
    const ready = materials.filter((m) => m.ragStatus === 'READY').length
    return { total, slides, pdfs, ready }
  }, [materials])

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchTitle = item.title.toLowerCase().includes(query)
        const matchFile = item.fileName.toLowerCase().includes(query)
        const matchGcs = item.gcsUri.toLowerCase().includes(query)
        if (!matchTitle && !matchFile && !matchGcs) return false
      }

      // Filter Lesson
      if (selectedLessonId && item.lessonId !== selectedLessonId) {
        return false
      }

      // Filter Topic
      if (selectedTopicId && item.topicId !== selectedTopicId) {
        return false
      }

      // Filter RAG Status
      if (selectedRagStatus !== 'ALL' && item.ragStatus !== selectedRagStatus) {
        return false
      }

      return true
    })
  }, [materials, searchQuery, selectedLessonId, selectedTopicId, selectedRagStatus])

  // Handle Re-index
  const handleReindex = async (material: LectureMaterial) => {
    try {
      setReindexingId(material.id)
      setBanner(null)
      const updated = await contentService.reindexMaterial(material.id)
      setMaterials((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
      setBanner({
        type: 'success',
        message: `Đang phân tích lại nội dung tài liệu "${material.title}".`,
      })
    } catch (err: any) {
      console.error('Re-index error:', err)
      setBanner({
        type: 'error',
        message: err?.message || `Lỗi khi xử lý lại tài liệu "${material.title}".`,
      })
    } finally {
      setReindexingId(null)
    }
  }

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deletingMaterial) return
    try {
      await contentService.deleteMaterial(deletingMaterial.id)
      setMaterials((prev) => prev.filter((m) => m.id !== deletingMaterial.id))
      setBanner({
        type: 'success',
        message: `Đã xóa tài liệu "${deletingMaterial.title}".`,
      })
    } catch (err: any) {
      console.error('Delete material error:', err)
      setBanner({
        type: 'error',
        message: err?.message || `Không thể xóa tài liệu "${deletingMaterial.title}".`,
      })
    } finally {
      setDeletingMaterial(null)
    }
  }

  // Handle Sync from Cloud RAG
  const handleSyncCloud = async () => {
    try {
      setSyncing(true)
      setBanner(null)
      const synced = await contentService.syncMaterials()
      setMaterials(synced)
      setBanner({
        type: 'success',
        message: `Đã đồng bộ thành công ${synced.length} tài liệu về hệ thống!`,
      })
    } catch (err: any) {
      console.error('Sync error:', err)
      setBanner({
        type: 'error',
        message: err?.message || 'Lỗi khi đồng bộ tài liệu từ hệ thống.',
      })
    } finally {
      setSyncing(false)
    }
  }

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedLessonId('')
    setSelectedTopicId('')
    setSelectedRagStatus('ALL')
  }

  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedLessonId || selectedTopicId || selectedRagStatus !== 'ALL',
  )

  return (
    <LecturerLayout breadcrumbs={[{ label: 'Tài liệu môn học' }]}>
      <div className="space-y-6">
        {/* Banner Feedback */}
        {banner && (
          <div
            className={`mb-6 flex items-center justify-between rounded-2xl p-4 shadow-sm transition-all ${
              banner.type === 'success'
                ? 'bg-secondary-fixed/50 text-on-secondary-fixed-variant'
                : banner.type === 'error'
                  ? 'bg-error-container text-on-error-container'
                  : 'bg-primary-fixed/50 text-on-primary-fixed-variant'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon
                name={
                  banner.type === 'success'
                    ? 'check_circle'
                    : banner.type === 'error'
                      ? 'error'
                      : 'info'
                }
                className="text-xl shrink-0"
              />
              <span className="text-sm font-semibold">{banner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="rounded-full p-1 hover:bg-black/10 transition-colors"
              aria-label="Đóng thông báo"
            >
              <Icon name="close" className="text-lg" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Link to="/lecturer/dashboard" className="hover:underline">
                Bảng điều khiển
              </Link>
              <span>/</span>
              <span>Tài liệu môn học</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
                Quản lý Tài liệu & Học liệu môn học
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed px-3 py-0.5 text-xs font-bold text-primary">
                <Icon name="folder" className="text-sm" />
                Tài liệu giảng dạy
              </span>
            </div>
            <p className="mt-1 text-sm text-on-surface-variant max-w-3xl">
              Kho lưu trữ slide bài giảng (.pptx) và tài liệu (.pdf) phục vụ cho việc tạo câu hỏi và tổ chức thi vấn đáp thông minh.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              disabled={syncing}
              onClick={handleSyncCloud}
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/60 bg-surface-container-low px-4 py-2.5 text-label-md font-semibold text-on-surface transition-all hover:bg-surface-container disabled:opacity-50"
              title="Đồng bộ danh sách tài liệu mới nhất về hệ thống"
            >
              <Icon name="sync" className={`text-xl text-primary ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu'}</span>
            </button>

            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-primary-container px-5 py-2.5 text-label-md font-semibold text-on-primary shadow-md transition-all hover:bg-primary"
            >
              <Icon name="cloud_upload" className="text-xl" />
              <span>Tải lên tài liệu mới</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Tổng số tài liệu */}
          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-on-surface-variant">Tổng số tài liệu</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed/60 text-primary">
                <Icon name="folder" className="text-2xl" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-on-surface">{stats.total}</span>
              <span className="text-xs text-on-surface-variant">học liệu trong kho</span>
            </div>
            <p className="mt-2 text-xs text-outline">Bao gồm slide bài giảng và tài liệu PDF</p>
          </div>

          {/* Card 2: Slide bài giảng */}
          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-on-surface-variant">Slide bài giảng (.pptx/.ppt)</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Icon name="slideshow" className="text-2xl" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-600">{stats.slides}</span>
              <span className="text-xs text-on-surface-variant">tập tin slide</span>
            </div>
            <p className="mt-2 text-xs text-outline">Đã trích xuất nội dung bài thuyết trình</p>
          </div>

          {/* Card 3: Tài liệu PDF */}
          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-on-surface-variant">Tài liệu PDF (.pdf)</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
                <Icon name="picture_as_pdf" className="text-2xl" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-rose-600">{stats.pdfs}</span>
              <span className="text-xs text-on-surface-variant">tài liệu PDF</span>
            </div>
            <p className="mt-2 text-xs text-outline">Giáo trình & hướng dẫn thực hành</p>
          </div>

          {/* Card 4: Sẵn sàng sử dụng */}
          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-on-surface-variant">Tài liệu sẵn sàng</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-fixed/50 text-secondary">
                <Icon name="verified" className="text-2xl" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-secondary">{stats.ready}</span>
              <span className="text-xs text-on-surface-variant">/{stats.total} tài liệu</span>
            </div>
            <p className="mt-2 text-xs text-secondary font-medium">Đã xử lý nội dung sẵn sàng sử dụng</p>
          </div>
        </div>

        {/* Toolbar: Search, Filters & Actions */}
        <div className="mb-6 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-4">
              <label htmlFor="search-input" className="block text-xs font-semibold text-on-surface-variant mb-1">
                Tìm kiếm tài liệu
              </label>
              <div className="relative">
                <Icon
                  name="search"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg pointer-events-none"
                />
                <input
                  id="search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên bài giảng, tài liệu..."
                  className="w-full rounded-xl border border-outline-variant/60 bg-surface-container-lowest pl-9 pr-4 py-2 text-sm text-on-surface placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-1"
                  >
                    <Icon name="close" className="text-sm" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Lesson */}
            <div className="lg:col-span-3">
              <label htmlFor="filter-lesson" className="block text-xs font-semibold text-on-surface-variant mb-1">
                Lọc theo Bài học
              </label>
              <select
                id="filter-lesson"
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                className="w-full rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              >
                <option value="">Tất cả bài học</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Topic */}
            <div className="lg:col-span-3">
              <label htmlFor="filter-topic" className="block text-xs font-semibold text-on-surface-variant mb-1">
                Lọc theo Chủ đề
              </label>
              <select
                id="filter-topic"
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="w-full rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              >
                <option value="">Tất cả chủ đề</option>
                {availableTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status */}
            <div className="lg:col-span-2">
              <label htmlFor="filter-rag" className="block text-xs font-semibold text-on-surface-variant mb-1">
                Trạng thái
              </label>
              <select
                id="filter-rag"
                value={selectedRagStatus}
                onChange={(e) => setSelectedRagStatus(e.target.value as RagStatus | 'ALL')}
                className="w-full rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="READY">Sẵn sàng</option>
                <option value="INDEXING">Đang xử lý nội dung</option>
                <option value="UPLOADING">Đang tải lên</option>
                <option value="FAILED">Lỗi xử lý</option>
              </select>
            </div>
          </div>

          {/* Active filter counter & Reset button */}
          {hasActiveFilters && (
            <div className="mt-3 flex items-center justify-between border-t border-outline-variant/20 pt-3 text-xs text-on-surface-variant">
              <span>
                Tìm thấy <strong>{filteredMaterials.length}</strong> / {materials.length} tài liệu phù hợp
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
              >
                <Icon name="filter_alt_off" className="text-sm" />
                Đặt lại bộ lọc
              </button>
            </div>
          )}
        </div>

        {/* Content Table / Cards */}
        {loading ? (
          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center text-sm text-on-surface-variant">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            Đang tải dữ liệu học liệu & tài liệu...
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container-high text-primary">
              <Icon name="folder_open" className="text-3xl" />
            </div>
            <h3 className="mt-4 text-base font-bold text-on-surface">Không tìm thấy tài liệu phù hợp</h3>
            <p className="mt-1 text-sm text-on-surface-variant max-w-md mx-auto">
              {hasActiveFilters
                ? 'Không có học liệu nào khớp với điều kiện tìm kiếm và bộ lọc hiện tại. Hãy thử thay đổi bộ lọc hoặc từ khóa.'
                : 'Chưa có slide bài giảng hoặc tài liệu nào được tải lên. Hãy tải tài liệu đầu tiên để tạo câu hỏi và hỗ trợ thi vấn đáp!'}
            </p>
            <div className="mt-5">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container-low px-4 py-2 text-xs font-semibold text-primary hover:bg-surface-container transition-colors"
                >
                  <Icon name="refresh" className="text-sm" />
                  Đặt lại bộ lọc
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary-container px-5 py-2.5 text-label-md font-semibold text-on-primary shadow-md hover:bg-primary transition-colors"
                >
                  <Icon name="cloud_upload" className="text-lg" />
                  Tải lên tài liệu đầu tiên
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-outline-variant/30 bg-surface-container-low text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  <tr>
                    <th scope="col" className="px-6 py-4">
                      Tài liệu & Slide
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Bài học & Chủ đề
                    </th>
                    <th scope="col" className="px-6 py-4">
                      Thông tin tệp
                    </th>
                    <th scope="col" className="px-6 py-4 text-center">
                      Trạng thái
                    </th>
                    <th scope="col" className="px-6 py-4 text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {filteredMaterials.map((material) => {
                    const isSlide = material.fileType === 'pptx' || material.fileType === 'ppt'
                    const isPdf = material.fileType === 'pdf'
                    const isReindexing = reindexingId === material.id

                    return (
                      <tr
                        key={material.id}
                        className="transition-colors hover:bg-surface-container-low/50"
                      >
                        {/* 1. Tài liệu & Slide */}
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3.5">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
                                isSlide
                                  ? 'bg-amber-500/10 text-amber-600'
                                  : isPdf
                                    ? 'bg-rose-500/10 text-rose-600'
                                    : 'bg-primary-fixed/60 text-primary'
                              }`}
                            >
                              <Icon
                                name={isSlide ? 'slideshow' : isPdf ? 'picture_as_pdf' : 'description'}
                                className="text-2xl"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-on-surface text-base line-clamp-1">
                                {material.title}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                                <span className="font-medium text-outline">{material.fileName}</span>
                                <span>&bull;</span>
                                <span className="font-semibold">{formatFileSize(material.fileSize)}</span>
                                <span>&bull;</span>
                                <span>{formatDateTime(material.uploadedAt, 'vi-VN')}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Bài học & Chủ đề */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {material.lessonTitle ? (
                              <div className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface">
                                <Icon name="menu_book" className="text-primary text-sm shrink-0" />
                                <span className="truncate max-w-[200px]" title={material.lessonTitle}>
                                  {material.lessonTitle}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-outline italic">Chưa gắn bài học</span>
                            )}

                            {material.topicName && (
                              <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                                <Icon name="topic" className="text-secondary text-sm shrink-0" />
                                <span className="truncate max-w-[200px]" title={material.topicName}>
                                  {material.topicName}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 3. Thông tin tệp */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-on-surface">
                                {material.fileName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                              <span className="font-medium uppercase rounded bg-surface-container px-1.5 py-0.5 text-[10px]">
                                {material.fileType}
                              </span>
                              <span>&bull;</span>
                              <span>{formatFileSize(material.fileSize)}</span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Trạng thái */}
                        <td className="px-6 py-4 text-center">
                          {material.ragStatus === 'READY' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-fixed/60 px-3 py-1 text-xs font-bold text-secondary">
                              <Icon name="check_circle" className="text-sm" />
                              Sẵn sàng
                            </span>
                          ) : material.ragStatus === 'INDEXING' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed px-3 py-1 text-xs font-bold text-primary">
                              <Icon name="progress_activity" className="text-sm animate-spin" />
                              Đang xử lý nội dung...
                            </span>
                          ) : material.ragStatus === 'UPLOADING' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600">
                              <Icon name="cloud_upload" className="text-sm animate-pulse" />
                              Đang tải lên...
                            </span>
                          ) : (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 rounded-full bg-error-container px-3 py-1 text-xs font-bold text-on-error-container">
                                <Icon name="error" className="text-sm text-error" />
                                Lỗi xử lý
                              </span>
                              {material.errorMessage && (
                                <span className="mt-1 text-[11px] text-error line-clamp-1 max-w-[140px]" title={material.errorMessage}>
                                  {material.errorMessage}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 5. Thao tác */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Re-index button */}
                            <button
                              type="button"
                              onClick={() => handleReindex(material)}
                              disabled={isReindexing || material.ragStatus === 'INDEXING'}
                              title="Xử lý lại nội dung tài liệu"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary disabled:opacity-50"
                            >
                              <Icon
                                name="refresh"
                                className={`text-lg ${isReindexing ? 'animate-spin text-primary' : ''}`}
                              />
                            </button>

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => setDeletingMaterial(material)}
                              title="Xóa tài liệu"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
                            >
                              <Icon name="delete" className="text-lg" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="flex items-center justify-between border-t border-outline-variant/20 bg-surface-container-low px-6 py-3 text-xs text-on-surface-variant">
              <span>
                Hiển thị <strong>{filteredMaterials.length}</strong> / {materials.length} học liệu & slide
              </span>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-secondary"></span>
                <span>Hệ thống lưu trữ học liệu sẵn sàng</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <UploadMaterialModal
          defaultLessonId={selectedLessonId}
          defaultTopicId={selectedTopicId}
          onClose={() => setUploadModalOpen(false)}
          onUploaded={(newMaterial) => {
            setMaterials((prev) => [newMaterial, ...prev])
            setBanner({
              type: 'success',
              message: `Đã tải lên và xử lý thành công tài liệu "${newMaterial.title}"!`,
            })
          }}
        />
      )}

      {/* Confirm Delete Modal */}
      {deletingMaterial && (
        <ConfirmModal
          title="Xóa tài liệu môn học"
          message={`Bạn có chắc chắn muốn xóa "${deletingMaterial.title}" (${deletingMaterial.fileName})? Tài liệu này sẽ không còn được sử dụng để tạo câu hỏi thi.`}
          confirmLabel="Xóa tài liệu"
          pendingLabel="Đang xóa..."
          cancelLabel="Hủy bỏ"
          icon="delete"
          danger
          onClose={() => setDeletingMaterial(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </LecturerLayout>
  )
}
