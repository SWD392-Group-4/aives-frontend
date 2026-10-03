import { useState } from 'react'
import { useLanguage } from '../hooks/useLanguage.js'
import { getErrorMessage } from '../i18n/errorMessage.js'
import ErrorBanner from './ErrorBanner.jsx'
import Icon from './Icon.jsx'
import Modal from './Modal.jsx'

/**
 * Hộp thoại xác nhận trước một thao tác quan trọng.
 * onConfirm là hàm async: nếu nó ném ApiError thì lỗi hiện ngay trong hộp thoại.
 * danger = true (mặc định) thì nút xác nhận màu đỏ, false thì màu xanh.
 */
function ConfirmModal({ title, message, cancelLabel, confirmLabel, pendingLabel, icon, danger = true, onClose, onConfirm }) {
  const { language } = useLanguage()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async () => {
    setSubmitting(true)
    setError('')
    try {
      await onConfirm()
    } catch (apiError) {
      setError(getErrorMessage(apiError, language))
      setSubmitting(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-body-md text-on-surface-variant">{message}</p>

      {error && (
        <div className="mt-4">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-6 py-3 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-label-md transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70 ${
            danger ? 'bg-error text-on-error' : 'bg-primary-container text-on-primary'
          }`}
        >
          <Icon name={submitting ? 'progress_activity' : icon} className={`text-lg ${submitting ? 'animate-spin' : ''}`} />
          {submitting ? pendingLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export default ConfirmModal
