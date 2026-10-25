export type MaterialRagStatus = 'INDEXING' | 'READY' | 'FAILED'
export type RagStatus = MaterialRagStatus

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
  description?: string | null
  materialCount?: number
  questionCount?: number
}

export type ChapterResponse = Chapter

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
