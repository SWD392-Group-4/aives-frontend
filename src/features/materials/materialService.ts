import { apiRequest } from '../../services/apiClient'
import { Chapter, ChapterRequest, Course, CourseRequest, Material } from './types'

export const materialService = {
  async getCourses(): Promise<Course[]> {
    try {
      const data = await apiRequest<Course[]>('/v1/courses')
      return Array.isArray(data) ? data : []
    } catch (err: any) {
      if (err?.status === 404) return []
      throw err
    }
  },

  async getChapters(courseId: string): Promise<Chapter[]> {
    try {
      const data = await apiRequest<Chapter[]>(`/v1/courses/${encodeURIComponent(courseId)}/chapters`)
      return Array.isArray(data) ? data : []
    } catch (err: any) {
      if (err?.status === 404) return []
      throw err
    }
  },

  async createChapter(
    courseId: string,
    req: { name: string; description?: string; orderNo?: number }
  ): Promise<Chapter> {
    return apiRequest<Chapter>(`/v1/courses/${encodeURIComponent(courseId)}/chapters`, {
      method: 'POST',
      body: req,
    })
  },

  /** Tìm môn học chứa chương (mở trang theo URL /chapters/:chapterId). Trả về courseId hoặc null. */
  async findCourseOfChapter(courses: Course[], chapterId: string): Promise<string | null> {
    for (const course of courses) {
      const chapters = await this.getChapters(course.id)
      if (chapters.some((c) => c.id === chapterId)) return course.id
    }
    return null
  },

  /** PUT /v1/courses/{courseId}/chapters/{chapterId} */
  async updateChapter(courseId: string, chapterId: string, req: ChapterRequest): Promise<Chapter> {
    return apiRequest<Chapter>(
      `/v1/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}`,
      { method: 'PUT', body: req }
    )
  },

  /** DELETE /v1/courses/{courseId}/chapters/{chapterId} -> chỉ xoá được chương chưa có tài liệu, câu hỏi */
  async deleteChapter(courseId: string, chapterId: string): Promise<void> {
    await apiRequest<void>(
      `/v1/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}`,
      { method: 'DELETE' }
    )
  },

  /** POST /v1/courses (chỉ Admin) */
  async createCourse(req: CourseRequest): Promise<Course> {
    return apiRequest<Course>('/v1/courses', { method: 'POST', body: req })
  },

  /** PUT /v1/courses/{courseId} (chỉ Admin) */
  async updateCourse(courseId: string, req: CourseRequest): Promise<Course> {
    return apiRequest<Course>(`/v1/courses/${encodeURIComponent(courseId)}`, { method: 'PUT', body: req })
  },

  /** DELETE /v1/courses/{courseId} (chỉ Admin) -> chỉ xoá được môn chưa có tài liệu, câu hỏi, phiên thi */
  async deleteCourse(courseId: string): Promise<void> {
    await apiRequest<void>(`/v1/courses/${encodeURIComponent(courseId)}`, { method: 'DELETE' })
  },

  async getChapterMaterials(chapterId: string): Promise<Material[]> {
    try {
      const data = await apiRequest<Material[]>(`/v1/chapters/${encodeURIComponent(chapterId)}/materials`)
      return Array.isArray(data) ? data : []
    } catch (err: any) {
      if (err?.status === 404) return []
      throw err
    }
  },

  async uploadChapterMaterial(chapterId: string, file: File): Promise<Material> {
    const MAX_SIZE = 50 * 1024 * 1024 // 50MB limit
    if (file.size > MAX_SIZE) {
      throw new Error(`Dung lượng tệp (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn cho phép là 50MB.`)
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['pdf', 'pptx', 'docx'].includes(ext)) {
      throw new Error('Định dạng tệp không hợp lệ. Hệ thống chỉ hỗ trợ tài liệu .pdf, .pptx, .docx.')
    }

    const formData = new FormData()
    formData.append('file', file)

    return apiRequest<Material>(`/v1/chapters/${encodeURIComponent(chapterId)}/materials`, {
      method: 'POST',
      formData,
    })
  },

  /** DELETE /v1/materials/{id} */
  async deleteMaterial(materialId: string): Promise<void> {
    await apiRequest<void>(`/v1/materials/${encodeURIComponent(materialId)}`, { method: 'DELETE' })
  },

  async reindexMaterial(materialId: string): Promise<Material> {
    return apiRequest<Material>(`/v1/materials/${encodeURIComponent(materialId)}/reindex`, {
      method: 'POST',
    })
  },
}
