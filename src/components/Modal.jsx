import { useEffect, useRef } from 'react'
import { useLanguage } from '../hooks/useLanguage.js'
import Icon from './Icon.jsx'

/** Hộp thoại nổi giữa màn hình. Đóng bằng nút X, phím Esc hoặc bấm ra nền. */
function Modal({ title, onClose, children }) {
  const { t } = useLanguage()
  const panelRef = useRef(null)
  // Giữ onClose mới nhất trong ref để effect bên dưới chỉ chạy một lần khi mở hộp thoại.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', handleKeyDown)
    // Khoá cuộn trang phía sau khi hộp thoại đang mở.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-inverse-surface/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-surface-container-lowest p-6 shadow-2xl outline-none sm:rounded-[2rem] sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="text-headline-md text-on-surface">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default Modal
