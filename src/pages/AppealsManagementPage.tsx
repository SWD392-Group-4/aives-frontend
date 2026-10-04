import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import Navbar from '../components/Navbar'
import { gradingService } from '../services/gradingService'
import { GradeAppeal } from '../types'
import { formatDateTime } from '../utils/dateTime'

export default function AppealsManagementPage() {
  const [appeals, setAppeals] = useState<GradeAppeal[]>([])
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modal xử lý phúc khảo
  const [selectedAppeal, setSelectedAppeal] = useState<GradeAppeal | null>(null)
  const [decisionAction, setDecisionAction] = useState<'ACCEPTED' | 'REJECTED'>('ACCEPTED')
  const [scoreAfter, setScoreAfter] = useState<number>(0)
  const [responseMsg, setResponseMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadAppeals = async () => {
    try {
      const data = await gradingService.getAppeals()
      setAppeals(data)
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Lỗi tải danh sách phúc khảo' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAppeals()
  }, [])

  const handleOpenDecision = (appeal: GradeAppeal, action: 'ACCEPTED' | 'REJECTED') => {
    setSelectedAppeal(appeal)
    setDecisionAction(action)
    setScoreAfter(appeal.scoreBefore)
    setResponseMsg('')
  }

  const handleSubmitDecision = async () => {
    if (!selectedAppeal) return
    if (!responseMsg.trim()) {
      alert('Vui lòng nhập phản hồi giải thích lý do cho sinh viên.')
      return
    }

    setSubmitting(true)
    try {
      const updated = await gradingService.resolveAppeal(selectedAppeal.id, decisionAction, {
        scoreAfter: decisionAction === 'ACCEPTED' ? scoreAfter : selectedAppeal.scoreBefore,
        response: responseMsg,
      })
      setAppeals((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setSelectedAppeal(null)
      setBanner({
        type: 'success',
        message: `Đã ${decisionAction === 'ACCEPTED' ? 'chấp thuận' : 'từ chối'} đơn phúc khảo thành công!`,
      })
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/40 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Link to="/lecturer/reviews" className="text-body-sm text-primary hover:underline flex items-center gap-1">
                <Icon name="arrow_back" className="text-base" /> Bảng thẩm định điểm
              </Link>
            </div>
            <h1 className="mt-2 text-headline-md font-bold text-on-surface">Quản lý Đơn Phúc khảo Điểm (AIVES)</h1>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Xem xét các khiếu nại về điểm số và bằng chứng từ phía sinh viên theo quy định hậu kiểm.
            </p>
          </div>
        </div>

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
            <button type="button" onClick={() => setBanner(null)} className="text-label-sm font-bold hover:underline">
              Đóng
            </button>
          </div>
        )}

        {/* Bảng danh sách đơn phúc khảo */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-container text-label-xs uppercase text-outline">
                <th className="p-4 sm:px-6">Mã đơn</th>
                <th className="p-4">Sinh viên</th>
                <th className="p-4">Lý do phúc khảo</th>
                <th className="p-4 text-center">Điểm ban đầu</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4 text-right sm:pr-6">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-body-sm">
              {appeals.map((ap) => {
                const isPending = ap.status === 'PENDING'
                const isAccepted = ap.status === 'ACCEPTED'

                return (
                  <tr key={ap.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-4 sm:px-6 font-mono font-bold text-primary">{ap.id}</td>
                    <td className="p-4">
                      <span className="font-bold text-on-surface block">{ap.studentName}</span>
                      <span className="text-body-xs text-outline font-mono">{ap.studentId}</span>
                    </td>
                    <td className="p-4 max-w-md">
                      <p className="line-clamp-2 text-on-surface">{ap.reason}</p>
                      <span className="text-body-xs text-outline mt-1 block">
                        Gửi lúc: {formatDateTime(ap.createdAt)}
                      </span>
                    </td>
                    <td className="p-4 text-center font-bold text-primary">
                      {ap.scoreBefore} / 10
                      {ap.scoreAfter !== undefined && isAccepted && (
                        <span className="block text-secondary text-label-xs">Mới: {ap.scoreAfter}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`rounded-full px-3 py-1 text-label-xs font-bold ${
                          isPending
                            ? 'bg-tertiary-fixed text-tertiary'
                            : isAccepted
                              ? 'bg-secondary-container text-secondary'
                              : 'bg-error-container text-error'
                        }`}
                      >
                        {ap.status}
                      </span>
                    </td>
                    <td className="p-4 text-right sm:pr-6">
                      {isPending ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDecision(ap, 'ACCEPTED')}
                            className="rounded-full bg-secondary-container px-3 py-1 text-label-xs font-bold text-secondary hover:bg-secondary-fixed transition-colors"
                          >
                            Chấp thuận
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDecision(ap, 'REJECTED')}
                            className="rounded-full bg-error-container px-3 py-1 text-label-xs font-bold text-error hover:bg-error/20 transition-colors"
                          >
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        <span className="text-body-xs text-outline italic">Đã giải quyết</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal xử lý phúc khảo */}
      {selectedAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-surface-container-lowest p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
              <h3 className="text-headline-xs font-bold text-on-surface">
                {decisionAction === 'ACCEPTED' ? 'Chấp thuận đơn phúc khảo' : 'Từ chối đơn phúc khảo'}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAppeal(null)}
                className="rounded-full p-1.5 text-outline hover:bg-surface-container"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-surface-container p-3.5 text-body-sm">
                <span className="text-label-xs font-bold text-outline block mb-1">Lý do sinh viên khiếu nại:</span>
                <p className="italic text-on-surface">"{selectedAppeal.reason}"</p>
              </div>

              {decisionAction === 'ACCEPTED' && (
                <div>
                  <label className="block text-label-sm font-semibold text-on-surface mb-1">
                    Điểm số sau điều chỉnh (Ban đầu: {selectedAppeal.scoreBefore}/10):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={scoreAfter}
                    onChange={(e) => setScoreAfter(Number(e.target.value))}
                    className="w-full rounded-2xl border border-outline-variant bg-surface-container-low p-3 text-headline-xs font-bold text-primary"
                  />
                </div>
              )}

              <div>
                <label className="block text-label-sm font-semibold text-on-surface mb-1">
                  Ý kiến phản hồi của Giảng viên cho sinh viên:
                </label>
                <textarea
                  rows={3}
                  required
                  value={responseMsg}
                  onChange={(e) => setResponseMsg(e.target.value)}
                  placeholder="Giải thích lý do chấp thuận hoặc lý do bảo lưu điểm số..."
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low p-3.5 text-body-sm text-on-surface"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedAppeal(null)}
                className="rounded-full px-5 py-2 text-label-md text-on-surface-variant hover:bg-surface-container"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitDecision}
                disabled={submitting}
                className={`rounded-full px-6 py-2.5 text-label-md font-semibold shadow-md ${
                  decisionAction === 'ACCEPTED'
                    ? 'bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed'
                    : 'bg-error text-on-error hover:bg-error/90'
                }`}
              >
                {decisionAction === 'ACCEPTED' ? 'Xác nhận cập nhật điểm' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
