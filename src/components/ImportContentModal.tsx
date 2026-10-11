import { useRef, useState } from 'react'
import { ContentImportResult, IMPORT_ACCEPT, IMPORT_MAX_BYTES, contentService } from '../services/contentService'
import Icon from './Icon'
import Modal from './Modal'
import { Rubric } from '../types'

interface ImportContentModalProps {
  // 'questions': file câu hỏi + đáp án (trang Ngân hàng câu hỏi); 'rubrics': file tiêu chí chấm điểm (trang Rubric)
  kind: 'questions' | 'rubrics'
  // Chỉ dùng cho file câu hỏi: các rubric có sẵn để gắn cho câu hỏi trong file
  rubrics?: Rubric[]
  onClose: () => void
  onImported: (result: ContentImportResult) => void
}

const ALLOWED_EXTENSIONS = IMPORT_ACCEPT.split(',')

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Hộp thoại gửi 1 file (.pdf, .docx, .txt) cho AI ở backend đọc.
 * File câu hỏi -> câu hỏi NHÁP (giảng viên xem lại rồi mới duyệt). File rubric -> rubric dùng được ngay.
 */
export default function ImportContentModal({ kind, rubrics = [], onClose, onImported }: ImportContentModalProps) {
  const isQuestions = kind === 'questions'
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [rubricId, setRubricId] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const chooseFile = (chosen: File | null) => {
    setError('')
    if (!chosen) {
      setFile(null)
      return
    }
    const name = chosen.name.toLowerCase()
    if (name.endsWith('.doc')) {
      setFile(null)
      setError('Chưa hỗ trợ file .doc đời cũ. Hãy mở bằng Word rồi lưu lại thành .docx hoặc .pdf.')
      return
    }
    if (!ALLOWED_EXTENSIONS.some((extension) => name.endsWith(extension))) {
      setFile(null)
      setError('Chỉ nhận file .pdf, .docx hoặc .txt.')
      return
    }
    if (chosen.size > IMPORT_MAX_BYTES) {
      setFile(null)
      setError(`File quá lớn (${formatSize(chosen.size)}), tối đa ${formatSize(IMPORT_MAX_BYTES)}.`)
      return
    }
    if (chosen.size === 0) {
      setFile(null)
      setError('File rỗng, vui lòng chọn file khác.')
      return
    }
    setFile(chosen)
  }

  const handleSubmit = async () => {
    if (!file || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const result = isQuestions
        ? await contentService.importQuestionFile(file, rubricId || undefined)
        : await contentService.importRubricFile(file)
      onImported(result)
    } catch (err: any) {
      setError(err?.message || 'Không gửi được file, vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  // Đang chờ AI đọc file thì không cho đóng, tránh gửi lại file lần nữa
  const close = () => {
    if (!submitting) onClose()
  }

  return (
    <Modal title={isQuestions ? 'Gửi file câu hỏi' : 'Gửi file rubric'} onClose={close}>
      <div className="space-y-4">
        {isQuestions ? (
          <p className="text-body-sm text-on-surface-variant">
            Gửi <strong>một file</strong> gồm danh sách câu hỏi và ý chính cần trả lời (đáp án). AI sẽ đọc file và tách
            thành câu hỏi <strong>nháp</strong>; bạn xem lại rồi bấm duyệt thì câu hỏi mới được dùng để thi.
          </p>
        ) : (
          <p className="text-body-sm text-on-surface-variant">
            Gửi <strong>một file</strong> mô tả tiêu chí chấm điểm: tên từng tiêu chí, mô tả và trọng số (%). AI sẽ đọc
            file và tạo rubric; tổng trọng số các tiêu chí trong một rubric phải bằng 100%.
          </p>
        )}

        {isQuestions && (
          <div>
            <label htmlFor="import-rubric" className="mb-1 block text-label-sm font-semibold text-on-surface">
              Rubric chấm điểm cho các câu hỏi trong file
            </label>
            <select
              id="import-rubric"
              value={rubricId}
              disabled={submitting}
              onChange={(event) => setRubricId(event.target.value)}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-body-sm text-on-surface focus:outline-none"
            >
              <option value="">Chưa chọn (chọn sau, lúc duyệt từng câu)</option>
              {rubrics.map((rubric) => (
                <option key={rubric.id} value={rubric.id}>
                  {rubric.name}
                </option>
              ))}
            </select>
            {rubrics.length === 0 && (
              <p className="mt-1 text-body-xs text-outline">
                Chưa có rubric nào. Vào trang Quản lý Rubric để gửi file rubric trước, hoặc cứ gửi câu hỏi rồi gắn
                rubric sau.
              </p>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={IMPORT_ACCEPT}
          className="hidden"
          onChange={(event) => {
            chooseFile(event.target.files?.[0] ?? null)
            // Cho phép chọn lại đúng file vừa chọn
            event.target.value = ''
          }}
        />

        <button
          type="button"
          disabled={submitting}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            if (!submitting) chooseFile(event.dataTransfer.files?.[0] ?? null)
          }}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-low p-6 text-center transition-colors hover:border-primary disabled:opacity-60"
        >
          <Icon name={file ? 'description' : 'upload_file'} className="text-4xl text-primary" />
          {file ? (
            <>
              <span className="text-label-lg font-semibold text-on-surface break-all">{file.name}</span>
              <span className="text-body-xs text-outline">{formatSize(file.size)} · Bấm để chọn file khác</span>
            </>
          ) : (
            <>
              <span className="text-label-lg font-semibold text-on-surface">Bấm để chọn file hoặc kéo thả vào đây</span>
              <span className="text-body-xs text-outline">.pdf, .docx hoặc .txt · tối đa {formatSize(IMPORT_MAX_BYTES)}</span>
            </>
          )}
        </button>

        {error && (
          <div className="flex items-start gap-2 rounded-2xl bg-error-container p-3 text-body-sm text-on-error-container">
            <Icon name="error" className="text-base" />
            <span>{error}</span>
          </div>
        )}

        {submitting && (
          <div className="flex items-center gap-2 rounded-2xl bg-surface-container p-3 text-body-sm text-on-surface-variant">
            <Icon name="progress_activity" className="animate-spin text-primary" />
            <span>
              AI đang đọc file và tách {isQuestions ? 'câu hỏi' : 'rubric'}. File dài có thể mất khoảng 1 phút, vui
              lòng không đóng trang.
            </span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="rounded-full px-5 py-2 text-label-md text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!file || submitting}
            className="inline-flex items-center gap-2 rounded-full bg-primary-container px-6 py-2.5 text-label-md font-semibold text-on-primary shadow-md hover:bg-primary disabled:opacity-50"
          >
            <Icon name="auto_awesome" />
            <span>{submitting ? 'Đang xử lý...' : 'Gửi file cho AI đọc'}</span>
          </button>
        </div>
      </div>
    </Modal>
  )
}
