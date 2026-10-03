import { createContext } from 'react'

/**
 * Giá trị: { language, setLanguage(code), t(key, params) }
 * Dùng qua hook useLanguage() trong src/hooks/useLanguage.js
 */
export const LanguageContext = createContext(null)
