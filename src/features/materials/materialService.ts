import { apiRequest } from '../../services/apiClient'
import { Chapter, Material } from './types'

export const materialService = {
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
    if (!ext || !['pdf', 'pptx', 'ppt'].includes(ext)) {
      throw new Error('Định dạng tệp không hợp lệ. Hệ thống chỉ hỗ trợ tài liệu học tập .pdf, .pptx, .ppt.')
    }

    const formData = new FormData()
    formData.append('file', file)

    return apiRequest<Material>(`/v1/chapters/${encodeURIComponent(chapterId)}/materials`, {
      method: 'POST',
      formData,
    })
  },

  async reindexMaterial(materialId: string): Promise<Material> {
    return apiRequest<Material>(`/v1/materials/${encodeURIComponent(materialId)}/reindex`, {
      method: 'POST',
    })
  },
}
