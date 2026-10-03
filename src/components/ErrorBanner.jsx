import Icon from './Icon.jsx'

/** Dòng báo lỗi dùng trong form và hộp thoại. */
function ErrorBanner({ children }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-2xl bg-error-container px-4 py-3 text-body-sm text-on-error-container"
    >
      <Icon name="error" className="text-lg" />
      {children}
    </p>
  )
}

export default ErrorBanner
