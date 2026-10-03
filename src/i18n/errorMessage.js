import { hasTranslation, translate } from './translate.js'

/**
 * Lấy câu báo lỗi để hiện cho người dùng từ một ApiError.
 * Có bản dịch theo mã lỗi (errors.<CODE>) thì dùng, không thì dùng message backend trả về.
 */
export function getErrorMessage(error, language) {
  const key = `errors.${error?.code}`
  if (error?.code && hasTranslation(language, key)) {
    return translate(language, key)
  }
  return error?.message ?? translate(language, 'errors.UNKNOWN_ERROR')
}
