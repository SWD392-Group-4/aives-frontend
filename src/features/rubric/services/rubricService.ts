import { apiRequest } from '@/services/apiClient'
import { CourseRubricResponse, UpdateCourseRubricRequest } from '../types'

export const rubricService = {
  getRubricByCourseId: async (courseId: string): Promise<CourseRubricResponse> => {
    return apiRequest<CourseRubricResponse>(`/v1/courses/${courseId}/rubric`, {
      method: 'GET',
    })
  },

  updateCourseRubric: async (
    courseId: string,
    request: UpdateCourseRubricRequest
  ): Promise<CourseRubricResponse> => {
    return apiRequest<CourseRubricResponse>(`/v1/courses/${courseId}/rubric`, {
      method: 'PUT',
      body: request,
    })
  },

  checkRubricReady: async (courseId: string): Promise<boolean> => {
    try {
      const rubric = await rubricService.getRubricByCourseId(courseId)
      if (!rubric || !rubric.criteria || rubric.criteria.length === 0) {
        return false
      }
      const totalWeight = rubric.criteria.reduce(
        (sum, item) => sum + Number(item.weightPercent || 0),
        0
      )
      return Math.round(totalWeight) === 100
    } catch {
      return false
    }
  },
}