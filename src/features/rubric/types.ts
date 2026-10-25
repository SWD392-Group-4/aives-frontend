export interface RubricCriterion {
  id?: string
  name: string
  description: string
  weightPercent: number
  orderNo: number
}

export interface CourseRubric {
  id: string
  courseId: string
  name: string
  description?: string
  maxScore?: number
  isLocked: boolean
  criteria: RubricCriterion[]
  createdAt?: string
  updatedAt?: string
}

export interface UpdateCourseRubricRequest {
  name: string
  description?: string
  criteria: Array<{
    id?: string
    name: string
    description: string
    weightPercent: number
    orderNo: number
  }>
}
