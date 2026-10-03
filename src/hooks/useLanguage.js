import { useContext } from 'react'
import { LanguageContext } from '../i18n/LanguageContext.js'

/**
 * Ví dụ: const { t, language, setLanguage } = useLanguage()
 *        t('common.login')                      -> 'Đăng nhập' hoặc 'Log in'
 *        t('home.greeting', { name: 'Minh' })   -> 'Xin chào, Minh'
 */
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage phải được dùng bên trong <LanguageProvider>')
  }
  return context
}
