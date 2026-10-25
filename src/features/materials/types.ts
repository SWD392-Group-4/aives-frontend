export type RagStatus = 'INDEXING' | 'READY' | 'FAILED'

export interface Course {
  id: string
  courseCode: string
  name: string
  description?: string
}

export interface Chapter {
  id: string
  courseId: string
  name: string
  orderNo: number
  description?: string
  materialCount?: number
  questionCount?: number
}

export interface Material {
  id: string
  chapterId: string
  lecturerId?: string
  title: string
  fileName: string
  fileSize: number
  fileType: string
  gcsUri?: string
  fileUrl?: string
  ragCorpusId?: string
  ragStatus: RagStatus
  chunkCount?: number
  errorMessage?: string
  createdAt?: string
}
