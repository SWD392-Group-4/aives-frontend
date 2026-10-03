import { getAccessToken } from './tokenStorage.js'

/**
 * Địa chỉ gốc của backend.
 * Khi dev để mặc định '/api': Vite chuyển tiếp sang http://localhost:8080 (xem vite.config.js).
 * Khi deploy có thể đặt biến VITE_API_BASE_URL, ví dụ https://aives.example.com/api
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/**
 * Lỗi trả về từ backend, theo đúng ApiResponse của aives-backend:
 *   { success: false, code: 'EMAIL_ALREADY_EXISTS', message: '...', data: {...} }
 */
export class ApiError extends Error {
  constructor({ status, code, message, fieldErrors }) {
    super(message)
    this.name = 'ApiError'
    this.status = status // HTTP status, 0 nếu không kết nối được
    this.code = code // ErrorCode của backend, ví dụ INVALID_CREDENTIALS
    this.fieldErrors = fieldErrors ?? {} // { email: '...', password: '...' } khi VALIDATION_ERROR
  }
}

/**
 * Gọi API và trả về phần `data` trong ApiResponse.
 * Ví dụ: const user = await apiRequest('/auth/me')
 *        await apiRequest('/auth/login', { method: 'POST', body: { email, password } })
 */
export async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const token = auth ? getAccessToken() : null
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    // Câu hiện cho người dùng được dịch theo `code` (xem src/i18n/errorMessage.js).
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Không kết nối được máy chủ.',
    })
  }

  // Backend luôn trả JSON; nếu không đọc được (ví dụ backend chưa chạy, proxy trả 502) thì payload = null.
  const payload = await response.json().catch(() => null)

  if (!response.ok || payload?.success === false) {
    const isValidation = payload?.code === 'VALIDATION_ERROR'
    // Không có payload JSON: lỗi 5xx thường là backend chưa chạy (proxy trả 502).
    const fallbackCode = response.status >= 500 ? 'SERVER_UNAVAILABLE' : 'UNKNOWN_ERROR'
    throw new ApiError({
      status: response.status,
      code: payload?.code ?? fallbackCode,
      message: payload?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.',
      fieldErrors: isValidation ? payload?.data : undefined,
    })
  }

  return payload?.data ?? null
}
