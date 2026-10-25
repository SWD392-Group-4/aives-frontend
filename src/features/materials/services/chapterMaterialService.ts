import { apiRequest } from '@/services/apiClient'
import { ChapterResponse, MaterialResponse } from '../types'

export const chapterMaterialService = {
  getChaptersByCourse: async (courseId: string): Promise<ChapterResponse[]> => {
    return apiRequest<ChapterResponse[]>(`/v1/courses/${courseId}/chapters`, {
      method: 'GET',
    })
  },

  getMaterialsByChapter: async (chapterId: string): Promise<MaterialResponse[]> => {
    return apiRequest<MaterialResponse[]>(`/v1/chapters/${chapterId}/materials`, {
      method: 'GET',
    })
  },

  uploadMaterial: async (chapterId: string, file: File): Promise<MaterialResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    return apiRequest<MaterialResponse>(`/v1/chapters/${chapterId}/materials`, {
      method: 'POST',
      formData,
    })
  },

  reindexMaterial: async (materialId: string): Promise<MaterialResponse> => {
    return apiRequest<MaterialResponse>(`/v1/materials/${materialId}/reindex`, {
      method: 'POST',
    })
  },
}