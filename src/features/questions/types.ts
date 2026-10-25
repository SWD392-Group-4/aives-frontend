export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD'
export type QuestionStatus = 'DRAFT' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'
export type QuestionSource = 'AI_GENERATED' | 'MANUAL'

export interface Question {
  id: string
  chapterId: string
  courseId?: string
  topicId?: string
  topicName?: string
  lessonTitle?: string
  rubricId?: string
  rubricName?: string
  content: string
  difficulty: QuestionDifficulty
  bloomLevel?: string
  modelAnswer?: string
  expectedKeywords?: string[]
  source: QuestionSource
  status: QuestionStatus
  createdBy?: string
  creatorName?: string
  hasFigure?: boolean
  createdAt?: string
  updatedAt?: string
}

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

export interface CreateChapterQuestionRequest {
  content: string
  difficulty: QuestionDifficulty
  modelAnswer?: string
  expectedKeywords?: string[]
}

export interface UpdateQuestionRequest {
  content?: string
  difficulty?: QuestionDifficulty
  modelAnswer?: string
  expectedKeywords?: string[]
  status?: QuestionStatus
}
