export interface RubricCriteriaDto {
  id?: string
  name: string
  description: string
  weightPercent: number
  orderNo: number
}

export type RubricCriterion = RubricCriteriaDto

export interface CourseRubricResponse {
  id: string
  courseId: string
  name: string
  description: string | null
  maxScore: number
  isLocked: boolean
  criteria: RubricCriteriaDto[]
  /** Giảng viên đã duyệt rubric (duyệt xong mới sinh / duyệt câu hỏi được) */
  approved?: boolean
  approvedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export type CourseRubric = CourseRubricResponse

export interface UpdateCourseRubricRequest {
  name: string
  description?: string | null
  criteria: Array<{
    id?: string
    name: string
    description: string
    weightPercent: number
    orderNo: number
  }>
}

export interface CourseRubricApiResponse {
  success: boolean
  code: string
  message: string
  data: CourseRubricResponse
}
