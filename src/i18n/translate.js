import en from './translations/en.js'
import vi from './translations/vi.js'

/** Các ngôn ngữ hỗ trợ. `label` là chữ hiện trên nút đổi ngôn ngữ. */
export const LANGUAGES = [
  { code: 'en', label: 'EN', locale: 'en-GB' },
  { code: 'vi', label: 'VN', locale: 'vi-VN' },
]

export const DEFAULT_LANGUAGE = 'vi'

const DICTIONARIES = { vi, en }

/** Lấy giá trị theo đường dẫn 'nhom.khoa' trong một bộ từ điển. */
function lookup(dictionary, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dictionary)
}

/** Kiểm tra một khoá có bản dịch hay không (dùng cho mã lỗi backend). */
export function hasTranslation(language, key) {
  return lookup(DICTIONARIES[language], key) !== undefined
}

/**
 * Dịch một khoá. Thiếu ở ngôn ngữ đang chọn thì lấy tiếng Việt, vẫn thiếu thì trả về chính khoá đó.
 * Giá trị có thể là chuỗi (thay {bien} bằng params) hoặc mảng / object (trả về nguyên vẹn).
 */
export function translate(language, key, params) {
  const value = lookup(DICTIONARIES[language], key) ?? lookup(DICTIONARIES[DEFAULT_LANGUAGE], key)
  if (value === undefined) return key
  if (typeof value !== 'string' || !params) return value
  return value.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match))
}
