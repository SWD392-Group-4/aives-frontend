/**
 * Icon Material Symbols. Tra tên icon tại https://fonts.google.com/icons
 * Ví dụ: <Icon name="mail" className="text-xl text-outline" />
 */
function Icon({ name, filled = false, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${filled ? 'is-filled' : ''} ${className}`}
    >
      {name}
    </span>
  )
}

export default Icon
