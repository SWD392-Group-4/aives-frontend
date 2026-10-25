export interface RubricCriteriaDto {
  id?: string
  name: string
  description: string
  weightPercent: number
  orderNo: number
}

export interface CourseRubricResponse {
  id: string
  courseId: string
  name: string
  description: string | null
  maxScore: number
  isLocked: boolean
  criteria: RubricCriteriaDto[]
  createdAt: string
  updatedAt: string
}

export interface UpdateCourseRubricRequest {
  name: string
  description: string | null
  criteria: RubricCriteriaDto[]
}

export interface CourseRubricApiResponse {
  success: boolean
  code: string
  message: string
  data: CourseRubricResponse
}