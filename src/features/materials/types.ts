export type MaterialRagStatus = 'INDEXING' | 'READY' | 'FAILED'

export interface MaterialResponse {
  id: string
  chapterId: string
  title: string
  fileUrl: string
  fileType: string
  fileSize: number
  ragStatus: MaterialRagStatus
  createdAt: string
}

export interface ChapterResponse {
  id: string
  courseId: string
  name: string
  orderNo: number
  description: string | null
  materialCount?: number
  questionCount?: number
}