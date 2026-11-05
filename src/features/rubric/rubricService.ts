import { apiRequest } from '../../services/apiClient'
import { CourseRubric, UpdateCourseRubricRequest } from './types'

export const rubricService = {
  async getCourseRubric(courseId: string): Promise<CourseRubric> {
    try {
      const data = await apiRequest<CourseRubric>(`/v1/courses/${encodeURIComponent(courseId)}/rubric`)
      return {
        id: data.id,
        courseId: data.courseId || courseId,
        name: data.name || `Rubric môn học ${courseId}`,
        description: data.description || '',
        maxScore: data.maxScore ?? 10,
        isLocked: Boolean(data.isLocked),
        approved: Boolean(data.approved),
        approvedAt: data.approvedAt ?? null,
        criteria: Array.isArray(data.criteria)
          ? data.criteria.map((c, idx) => ({
              id: c.id,
              name: c.name || '',
              description: c.description || '',
              weightPercent: Number(c.weightPercent) || 0,
              orderNo: c.orderNo ?? idx + 1,
            }))
          : [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }
    } catch (err: any) {
      if (err?.status === 404 || err?.code === 'RUBRIC_NOT_FOUND' || err?.code === 'COURSE_NOT_FOUND') {
        return {
          id: '',
          courseId,
          name: '',
          description: '',
          maxScore: 10,
          isLocked: false,
          approved: false,
          criteria: [],
        }
      }
      throw err
    }
  },

  /**
   * POST /v1/courses/{courseId}/rubric/extract (multipart) -> AI đọc file tiêu chí (.pdf, .docx, .pptx, .txt)
   * và trả về bản nháp rubric (CHƯA lưu). Trọng số đã được chuẩn hoá về tổng 100%.
   */
  async extractRubricFromFile(courseId: string, file: File): Promise<UpdateCourseRubricRequest> {
    const formData = new FormData()
    formData.append('file', file)
    const data = await apiRequest<UpdateCourseRubricRequest>(
      `/v1/courses/${encodeURIComponent(courseId)}/rubric/extract`,
      { method: 'POST', formData }
    )
    return {
      name: data?.name || '',
      description: data?.description || '',
      criteria: Array.isArray(data?.criteria)
        ? data.criteria.map((c, idx) => ({
            name: c.name || '',
            description: c.description || '',
            weightPercent: Number(c.weightPercent) || 0,
            orderNo: c.orderNo ?? idx + 1,
          }))
        : [],
    }
  },

  /** POST /v1/courses/{courseId}/rubric/approve -> duyệt rubric (tổng trọng số phải đúng 100%) */
  async approveCourseRubric(courseId: string): Promise<void> {
    await apiRequest<void>(`/v1/courses/${encodeURIComponent(courseId)}/rubric/approve`, { method: 'POST' })
  },

  async updateCourseRubric(courseId: string, req: UpdateCourseRubricRequest): Promise<CourseRubric> {
    const formattedCriteria = req.criteria.map((c, idx) => ({
      id: c.id,
      name: c.name.trim(),
      description: c.description.trim(),
      weightPercent: Number(c.weightPercent),
      orderNo: c.orderNo ?? idx + 1,
    }))

    const payload: UpdateCourseRubricRequest = {
      name: req.name.trim(),
      description: req.description?.trim(),
      criteria: formattedCriteria,
    }

    const data = await apiRequest<CourseRubric>(`/v1/courses/${encodeURIComponent(courseId)}/rubric`, {
      method: 'PUT',
      body: payload,
    })

    return {
      id: data.id,
      courseId: data.courseId || courseId,
      name: data.name,
      description: data.description,
      maxScore: data.maxScore ?? 10,
      isLocked: Boolean(data.isLocked),
      approved: Boolean(data.approved),
      approvedAt: data.approvedAt ?? null,
      criteria: Array.isArray(data.criteria)
        ? data.criteria.map((c, idx) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            weightPercent: Number(c.weightPercent),
            orderNo: c.orderNo ?? idx + 1,
          }))
        : [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }
  },

  async isCourseRubricReady(courseId: string): Promise<boolean> {
    try {
      const rubric = await this.getCourseRubric(courseId)
      if (!rubric || !rubric.criteria || rubric.criteria.length === 0) {
        return false
      }
      const sum = rubric.criteria.reduce((acc, c) => acc + (Number(c.weightPercent) || 0), 0)
      return Math.abs(sum - 100) < 0.05
    } catch {
      return false
    }
  },
}
