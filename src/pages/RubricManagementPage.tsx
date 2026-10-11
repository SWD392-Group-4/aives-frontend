import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import ImportContentModal from '../components/ImportContentModal'
import Navbar from '../components/Navbar'
import { ContentImportResult, contentService } from '../services/contentService'
import { Rubric } from '../types'
import { formatDateTime } from '../utils/dateTime'

export default function RubricManagementPage() {
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [loading, setLoading] = useState(true)
  // Rubric không soạn tay: gửi 1 file tiêu chí chấm điểm để AI tách thành rubric
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadRubrics = async () => {
    try {
      const data = await contentService.getRubrics()
      setRubrics(data)
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Lỗi tải danh sách Rubric' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRubrics()
  }, [])

  const handleImported = async (result: ContentImportResult) => {
    setImportModalOpen(false)
    setBanner({
      type: 'success',
      message: `Đã tạo ${result.rubrics.length} rubric từ file "${result.fileName}". Khi gửi file câu hỏi ở Ngân hàng câu hỏi, bạn chọn rubric này để gắn cho câu hỏi.`,
    })
    await loadRubrics()
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/40 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Link to="/lecturer/questions" className="text-body-sm text-primary hover:underline flex items-center gap-1">
                <Icon name="arrow_back" className="text-base" /> Ngân hàng câu hỏi
              </Link>
            </div>
            <h1 className="mt-2 text-headline-md font-bold text-on-surface">Quản lý Rubric Chấm điểm (AIVES)</h1>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Gửi file tiêu chí chấm điểm để AI tạo rubric; Giám khảo AI và giảng viên chấm theo các tiêu chí này.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary-container px-6 py-2.5 text-label-md font-semibold text-on-primary shadow-md hover:bg-primary transition-colors"
          >
            <Icon name="upload_file" />
            <span>Gửi file rubric</span>
          </button>
        </div>

        {/* Thông báo banner */}
        {banner && (
          <div
            className={`mt-6 flex items-center justify-between rounded-2xl p-4 ${
              banner.type === 'success'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-error-container text-on-error-container'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon name={banner.type === 'success' ? 'check_circle' : 'error'} />
              <span>{banner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="text-label-sm font-bold hover:underline"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Danh sách Rubrics */}
        {!loading && rubrics.length === 0 && (
          <div className="mt-8 rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center text-body-md text-on-surface-variant">
            Chưa có rubric nào. Bấm "Gửi file rubric" để AI tạo rubric từ file tiêu chí chấm điểm của bạn.
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {rubrics.map((r) => (
            <div
              key={r.id}
              className="flex flex-col justify-between rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-label-xs font-bold text-primary">{r.id}</span>
                  <span className="rounded-full bg-primary-fixed px-3 py-1 text-label-xs font-bold text-primary">
                    Thang điểm: {r.maxScore}đ
                  </span>
                </div>

                <h3 className="mt-3 text-headline-sm font-bold text-on-surface">{r.name}</h3>
                {r.description && <p className="mt-2 text-body-sm text-on-surface-variant">{r.description}</p>}

                {/* Tiêu chí chi tiết */}
                <div className="mt-6 space-y-3">
                  <h4 className="text-label-xs font-bold uppercase tracking-wider text-outline">
                    Các tiêu chí đánh giá ({r.criteria.length}):
                  </h4>

                  {r.criteria.map((c) => (
                    <div key={c.id} className="rounded-2xl bg-surface-container p-4 border border-outline-variant/30">
                      <div className="flex items-center justify-between">
                        <span className="text-label-md font-semibold text-on-surface">{c.name}</span>
                        <span className="rounded-full bg-secondary-container px-2.5 py-0.5 text-label-xs font-bold text-secondary">
                          {c.weightPercent}%
                        </span>
                      </div>
                      <p className="mt-1.5 text-body-xs text-on-surface-variant leading-relaxed">{c.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-outline-variant/30 pt-4 text-body-xs text-outline">
                <span>Tạo bởi: {r.createdBy}</span>
                <span>{formatDateTime(r.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {importModalOpen && (
        <ImportContentModal kind="rubrics" onClose={() => setImportModalOpen(false)} onImported={handleImported} />
      )}
    </div>
  )
}
