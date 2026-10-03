import { useState } from 'react'
import { useLanguage } from '../hooks/useLanguage.js'
import Icon from './Icon.jsx'

/**
 * Ô nhập liệu dùng chung cho các form: có nhãn, icon bên trái, thông báo lỗi.
 * Với type="password" sẽ tự có nút hiện/ẩn mật khẩu.
 */
function TextField({
  id,
  label,
  icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  hint,
  error,
  required = false,
}) {
  const { t } = useLanguage()
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-label-md text-on-surface">
        {label}
        {required && <span className="ml-1 text-error">*</span>}
      </label>

      <div className="relative flex items-center">
        {icon && (
          <Icon
            name={icon}
            className="pointer-events-none absolute left-4 text-xl text-outline"
          />
        )}
        <input
          id={id}
          name={id}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`w-full rounded-2xl bg-surface-container-low py-3.5 text-body-md text-on-surface shadow-sm outline-none transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 ${
            icon ? 'pl-12' : 'pl-4'
          } ${isPassword ? 'pr-12' : 'pr-4'} ${
            error ? 'ring-2 ring-error focus:ring-error' : 'focus:ring-primary-container'
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={showPassword ? t('field.hidePassword') : t('field.showPassword')}
            className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full text-outline transition-colors hover:text-on-surface"
          >
            <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-xl" />
          </button>
        )}
      </div>

      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1 text-body-sm text-error">
          <Icon name="error" className="text-base" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-body-sm text-on-surface-variant">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

export default TextField
