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
          name: `Rubric chuẩn môn học ${courseId}`,
          description: 'Tiêu chí đánh giá thi vấn đáp',
          maxScore: 10,
          isLocked: false,
          criteria: [
            {
              name: 'Khái niệm cốt lõi & Định nghĩa',
              description: 'Nêu chính xác định nghĩa và nguyên lý cơ bản.',
              weightPercent: 40,
              orderNo: 1,
            },
            {
              name: 'Ứng dụng thực tiễn & Ví dụ',
              description: 'Đưa ra ví dụ minh họa và trường hợp sử dụng phù hợp.',
              weightPercent: 40,
              orderNo: 2,
            },
            {
              name: 'Khả năng lập luận & Phản biện',
              description: 'Giải thích logic, bảo vệ quan điểm rõ ràng.',
              weightPercent: 20,
              orderNo: 3,
            },
          ],
        }
      }
      throw err
    }
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
