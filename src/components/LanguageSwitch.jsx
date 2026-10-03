import { useLanguage } from '../hooks/useLanguage.js'
import { LANGUAGES } from '../i18n/translate.js'

/** Hộp đổi ngôn ngữ EN | VN. */
function LanguageSwitch({ className = '' }) {
  const { language, setLanguage, t } = useLanguage()

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className={`inline-flex shrink-0 items-center rounded-full bg-surface-container p-1 ${className}`}
    >
      {LANGUAGES.map((item, index) => {
        const active = item.code === language
        return (
          <span key={item.code} className="flex items-center">
            {index > 0 && <span aria-hidden="true" className="mx-0.5 h-3.5 w-px bg-outline-variant" />}
            <button
              type="button"
              lang={item.code}
              aria-pressed={active}
              aria-label={t(`language.${item.code}`)}
              onClick={() => setLanguage(item.code)}
              className={`rounded-full px-2.5 py-1.5 text-label-sm transition-colors ${
                active
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {item.label}
            </button>
          </span>
        )
      })}
    </div>
  )
}

export default LanguageSwitch
