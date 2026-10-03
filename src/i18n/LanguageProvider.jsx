import { useCallback, useEffect, useMemo, useState } from 'react'
import { LanguageContext } from './LanguageContext.js'
import { DEFAULT_LANGUAGE, LANGUAGES, translate } from './translate.js'

const STORAGE_KEY = 'aives.language'

function loadLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return LANGUAGES.some((item) => item.code === saved) ? saved : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

/** Bọc toàn bộ app để mọi component dịch được chữ theo ngôn ngữ đang chọn. */
function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(loadLanguage)

  const setLanguage = useCallback((code) => {
    setLanguageState(code)
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {
      // Trình duyệt chặn localStorage: vẫn đổi được trong phiên hiện tại.
    }
  }, [])

  // Cập nhật thuộc tính lang và tiêu đề tab theo ngôn ngữ.
  useEffect(() => {
    document.documentElement.lang = language
    document.title = translate(language, 'app.title')
  }, [language])

  const value = useMemo(() => {
    const locale = LANGUAGES.find((item) => item.code === language)?.locale ?? 'vi-VN'
    return {
      language,
      locale,
      setLanguage,
      t: (key, params) => translate(language, key, params),
    }
  }, [language, setLanguage])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export default LanguageProvider
