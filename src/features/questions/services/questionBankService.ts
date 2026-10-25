import { apiRequest } from '@/services/apiClient'
import {
  GenerateQuestionsRequest,
  QuestionDifficulty,
  QuestionResponse,
  QuestionStatus,
  RejectQuestionRequest,
} from '../types'

export const questionBankService = {
  getChapterQuestions: async (
    chapterId: string,
    params?: {
      status?: QuestionStatus | 'ALL'
      difficulty?: QuestionDifficulty | 'ALL'
      page?: number
      size?: number
    }
  ): Promise<QuestionResponse[]> => {
    const query = new URLSearchParams()
    if (params?.status && params.status !== 'ALL') query.append('status', params.status)
    if (params?.difficulty && params.difficulty !== 'ALL') query.append('difficulty', params.difficulty)
    if (params?.page !== undefined) query.append('page', String(params.page))
    if (params?.size !== undefined) query.append('size', String(params.size))

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return apiRequest<QuestionResponse[]>(`/v1/chapters/${chapterId}/questions${queryString}`, {
      method: 'GET',
    })
  },

  generateChapterQuestions: async (
    chapterId: string,
    request: GenerateQuestionsRequest
  ): Promise<QuestionResponse[]> => {
    return apiRequest<QuestionResponse[]>(`/v1/chapters/${chapterId}/questions/generate`, {
      method: 'POST',
      body: request,
    })
  },

  approveQuestion: async (questionId: string): Promise<QuestionResponse> => {
    return apiRequest<QuestionResponse>(`/v1/questions/${questionId}/approve`, {
      method: 'PATCH',
    })
  },

  rejectQuestion: async (
    questionId: string,
    request: RejectQuestionRequest
  ): Promise<QuestionResponse> => {
    return apiRequest<QuestionResponse>(`/v1/questions/${questionId}/reject`, {
      method: 'PATCH',
      body: request,
    })
  },

  deleteQuestion: async (questionId: string): Promise<void> => {
    return apiRequest<void>(`/v1/questions/${questionId}`, {
      method: 'DELETE',
    })
  },
}