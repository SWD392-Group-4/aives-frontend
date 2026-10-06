export type Role = 'ADMIN' | 'LECTURER' | 'STUDENT'

export interface User {
  id: string
  email: string
  fullName: string
  role: Role
  active: boolean
  createdAt?: string
}

export type BloomLevel = 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE'
export type QuestionStatus = 'DRAFT' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'
export type QuestionSource = 'MANUAL' | 'AI_GENERATED'

export interface Lesson {
  id: string
  lecturerId: string
  title: string
  description?: string
  topicCount?: number
  questionCount?: number
  createdAt: string
  updatedAt?: string
}

export interface Topic {
  id: string
  lessonId: string
  lessonTitle?: string
  name: string
  description?: string
  questionCount?: number
}

export interface RubricCriterion {
  id: string
  rubricId: string
  name: string
  description: string
  weightPercent: number // 0-100
  orderNo: number
}

export interface Rubric {
  id: string
  createdBy: string
  name: string
  description?: string
  maxScore: number
  criteria: RubricCriterion[]
  createdAt: string
}

export interface Question {
  id: string
  topicId: string
  topicName?: string
  lessonTitle?: string
  rubricId?: string
  rubricName?: string
  content: string
  bloomLevel: BloomLevel
  modelAnswer?: string
  expectedKeywords?: string[]
  source: QuestionSource
  status: QuestionStatus
  questionAudioKey?: string
  createdAt: string
  updatedAt?: string
}

export type ExamSessionStatus = 'UPCOMING' | 'ONGOING' | 'ENDED' | 'CANCELLED'

export interface ExamSession {
  id: string // AIVES_EXAM_yyyy_xxxxxx
  passcode: string
  title: string
  description?: string
  startAt: string
  endAt: string
  durationMinutes: number
  maxAttempts: number // số lượt thi tối đa của mỗi sinh viên trong phiên (1-10)
  maxFollowUpPerQuestion: number
  prepareSeconds: number
  answerSeconds: number
  domainKeywords?: string[]
  status: ExamSessionStatus
  ownerId: string
  ownerName: string
  attemptCount: number
  scheduleLocked: boolean
  createdAt: string
}

export type AttemptStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'
export type ResultStatus = 'NONE' | 'GRADING' | 'PENDING_REVIEW' | 'GRADING_FAILED' | 'PUBLISHED'

export interface VivaAttempt {
  attemptId: string
  examId: string
  title: string
  durationMinutes: number
  attemptNo: number // lượt thi thứ mấy của sinh viên trong phiên
  maxAttempts: number // số lượt thi tối đa của mỗi sinh viên trong phiên
  status: AttemptStatus
  resultStatus: ResultStatus
  totalAiScore?: number
  totalFinalScore?: number
  startedAt: string
  deadlineAt: string
  completedAt?: string
  publishedAt?: string
  serverTime: string
  remainingSeconds: number
  studentId?: string
  studentName?: string
  studentEmail?: string
}

export type FollowUpReason = 'INCOMPLETE' | 'AMBIGUOUS' | 'CONTRADICTORY'
export type AiDecision = 'FOLLOW_UP' | 'NEXT' | 'SKIPPED'

export interface InterviewExchange {
  id: string
  attemptId: string
  questionId: string
  parentExchangeId?: string
  depth: number // 0: main question, >0: follow up
  questionText: string
  questionAudioUrl?: string
  transcript?: string
  answerAudioUrl?: string
  followUpReason?: FollowUpReason
  aiDecision?: AiDecision
  aiDecisionReason?: string
  answerStartedAt?: string
  answerEndedAt?: string
  latencyMs?: number
  createdAt: string
}

export type GradeStatus = 'AI_DRAFT' | 'APPROVED' | 'FAILED'

export interface CriteriaGrade {
  id: string
  questionGradeId: string
  rubricCriteriaId: string
  criterionName: string
  weightPercent: number
  aiScore?: number
  finalScore?: number
  evidenceQuote?: string
  rationale?: string
}

export interface QuestionGrade {
  id: string
  attemptId: string
  questionId: string
  questionText: string
  bloomLevel: BloomLevel
  weight: number
  aiScore?: number
  finalScore?: number
  aiStrengths?: string
  aiWeaknesses?: string
  aiFeedback?: string
  lecturerNote?: string
  status: GradeStatus
  gradedBy?: string
  gradedByName?: string
  gradedAt?: string
  criteriaGrades: CriteriaGrade[]
  exchanges: InterviewExchange[]
}

export type AppealStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export interface GradeAppeal {
  id: string
  questionGradeId: string
  questionText?: string
  attemptId: string
  examTitle?: string
  studentId: string
  studentName?: string
  reason: string
  status: AppealStatus
  scoreBefore: number
  scoreAfter?: number
  response?: string
  resolvedBy?: string
  resolvedByName?: string
  createdAt: string
  resolvedAt?: string
}

export interface SystemSetting {
  settingKey: string
  settingValue: string
  description?: string
  category: 'AI_MODELS' | 'SPEECH_RECOGNITION' | 'TEXT_TO_SPEECH' | 'VIVA_LIMITS'
  updatedBy?: string
  updatedAt?: string
}

export interface AuditLog {
  id: string
  actorId: string
  actorName: string
  action: string
  entityType: string
  entityId: string
  oldValue?: string
  newValue?: string
  timestamp: string
}
