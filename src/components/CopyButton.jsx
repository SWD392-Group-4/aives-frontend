import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'

/**
 * Nút sao chép một chuỗi vào clipboard. Bấm xong đổi thành dấu tick trong 1,5 giây.
 * Ví dụ: <CopyButton value={session.id} label={t('sessions.copyCode')} copiedLabel={t('sessions.copied')} />
 */
function CopyButton({ value, label, copiedLabel, className = '' }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      // Trình duyệt chặn clipboard (ví dụ không phải HTTPS/localhost): người dùng tự bôi đen để chép.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? copiedLabel : label}
      title={copied ? copiedLabel : label}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-container ${
        copied ? 'text-secondary' : 'text-outline hover:text-primary'
      } ${className}`}
    >
      <Icon name={copied ? 'check' : 'content_copy'} className="text-lg" />
    </button>
  )
}

export default CopyButton
