import { apiRequest } from '../../services/apiClient'
import {
  CreateChapterQuestionRequest,
  GenerateQuestionsRequest,
  Question,
  UpdateQuestionRequest,
} from './types'

export const questionService = {
  async getChapterQuestions(
    chapterId: string,
    status?: string,
    difficulty?: string,
    page = 0,
    size = 50
  ): Promise<{ content: Question[]; totalElements: number }> {
    const params = new URLSearchParams()
    if (status && status !== 'ALL') params.append('status', status)
    if (difficulty && difficulty !== 'ALL') params.append('difficulty', difficulty)
    params.append('page', String(page))
    params.append('size', String(size))

    const query = params.toString() ? `?${params.toString()}` : ''
    const response = await apiRequest<any>(
      `/v1/chapters/${encodeURIComponent(chapterId)}/questions${query}`
    )

    if (Array.isArray(response)) {
      return { content: response, totalElements: response.length }
    }
    if (response?.content && Array.isArray(response.content)) {
      return { content: response.content, totalElements: response.totalElements ?? response.content.length }
    }
    return { content: [], totalElements: 0 }
  },

  async generateQuestions(
    chapterId: string,
    req: GenerateQuestionsRequest
  ): Promise<Question[]> {
    const data = await apiRequest<Question[]>(
      `/v1/chapters/${encodeURIComponent(chapterId)}/questions/generate`,
      {
        method: 'POST',
        body: req,
      }
    )
    return Array.isArray(data) ? data : []
  },

  async createQuestion(
    chapterId: string,
    req: CreateChapterQuestionRequest
  ): Promise<Question> {
    return apiRequest<Question>(
      `/v1/chapters/${encodeURIComponent(chapterId)}/questions`,
      {
        method: 'POST',
        body: req,
      }
    )
  },

  async getQuestionDetail(questionId: string): Promise<Question> {
    return apiRequest<Question>(`/v1/questions/${encodeURIComponent(questionId)}`)
  },

  async updateQuestion(
    questionId: string,
    req: UpdateQuestionRequest
  ): Promise<Question> {
    return apiRequest<Question>(`/v1/questions/${encodeURIComponent(questionId)}`, {
      method: 'PUT',
      body: req,
    })
  },

  async deleteQuestion(questionId: string): Promise<void> {
    await apiRequest<void>(`/v1/questions/${encodeURIComponent(questionId)}`, {
      method: 'DELETE',
    })
  },

  async approveQuestion(questionId: string): Promise<Question> {
    return apiRequest<Question>(
      `/v1/questions/${encodeURIComponent(questionId)}/approve`,
      {
        method: 'PATCH',
      }
    )
  },

  async rejectQuestion(questionId: string, reason?: string): Promise<Question> {
    return apiRequest<Question>(
      `/v1/questions/${encodeURIComponent(questionId)}/reject`,
      {
        method: 'PATCH',
        body: reason ? { reason } : undefined,
      }
    )
  },
}
