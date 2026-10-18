import { useEffect, useState } from 'react'
import { contentService } from '../services/contentService'

interface QuestionFigureProps {
  questionId: string
}

/**
 * Hình vẽ của 1 câu hỏi trong ngân hàng câu hỏi (cắt từ file PDF lúc nhập).
 * Chỉ dùng cho câu hỏi có hasFigure = true; tự tải hình khi hiện ra.
 */
export default function QuestionFigure({ questionId }: QuestionFigureProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    contentService
      .getQuestionFigure(questionId)
      .then((figure) => {
        if (!cancelled) setDataUrl(figure.dataUrl)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [questionId])

  if (failed) {
    return <p className="mt-3 text-body-xs text-error">Không tải được hình vẽ của câu hỏi.</p>
  }
  if (!dataUrl) {
    return <div className="mt-3 h-40 w-full max-w-md animate-pulse rounded-2xl bg-surface-container" />
  }
  return (
    <div className="mt-3 inline-block overflow-hidden rounded-2xl border border-outline-variant/40 bg-white p-2">
      <img src={dataUrl} alt="Hình vẽ của câu hỏi" className="block max-h-72 w-auto max-w-full object-contain" />
    </div>
  )
}
