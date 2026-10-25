export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD'
export type QuestionStatus = 'DRAFT' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'
export type QuestionSource = 'MANUAL' | 'AI_GENERATED'

export interface DifficultyRatioConfig {
  easyPercent: number
  mediumPercent: number
  hardPercent: number
}

export interface GenerateQuestionsRequest {
  materialIds: string[]
  totalQuestions: number
  difficultyRatio: DifficultyRatioConfig
}

export interface QuestionResponse {
  id: string
  chapterId: string
  courseId: string
  content: string
  difficulty: QuestionDifficulty
  modelAnswer: string | null
  expectedKeywords: string[]
  source: QuestionSource
  status: QuestionStatus
  createdBy: string
  creatorName: string
  createdAt: string
  updatedAt: string
}

export interface RejectQuestionRequest {
  reason: string
}