import { clearSession, getAccessToken } from './tokenStorage'

/**
 * Địa chỉ gốc của backend.
 * Khi dev để mặc định '/api': Vite chuyển tiếp sang http://localhost:8080 (xem vite.config.js).
 * Khi deploy có thể đặt biến VITE_API_BASE_URL, ví dụ https://aives.example.com/api
 */
const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
let normalizedBase = '/api'
if (rawBaseUrl) {
  normalizedBase = rawBaseUrl.replace(/\/+$/, '')
  if (!normalizedBase.endsWith('/api') && normalizedBase.startsWith('http')) {
    normalizedBase = `${normalizedBase}/api`
  }
}
const API_BASE_URL = normalizedBase

export interface ApiErrorParams {
  status: number
  code: string
  message: string
  fieldErrors?: Record<string, string>
}

/**
 * Lỗi trả về từ backend, theo đúng ApiResponse của aives-backend:
 *   { success: false, code: 'EMAIL_ALREADY_EXISTS', message: '...', data: {...} }
 */
export class ApiError extends Error {
  status: number
  code: string
  fieldErrors: Record<string, string>

  constructor({ status, code, message, fieldErrors }: ApiErrorParams) {
    super(message)
    this.name = 'ApiError'
    this.status = status // HTTP status, 0 nếu không kết nối được
    this.code = code // ErrorCode của backend, ví dụ INVALID_CREDENTIALS
    this.fieldErrors = fieldErrors ?? {} // { email: '...', password: '...' } khi VALIDATION_ERROR
  }
}

export interface ApiRequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
}

/**
 * Gọi API và trả về phần `data` trong ApiResponse.
 * Hỗ trợ generic type <T>:
 *   const user = await apiRequest<User>('/auth/me')
 *   const exams = await apiRequest<ExamSession[]>('/exam-sessions')
 */
export async function apiRequest<T = any>(
  path: string,
  { method = 'GET', body, auth = true }: ApiRequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const token = auth ? getAccessToken() : null
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    // Lỗi mạng hoặc CORS do trình duyệt chặn
    console.error('[API Network Error]', err, `URL: ${API_BASE_URL}${path}`)
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Không kết nối được máy chủ. Vui lòng kiểm tra địa chỉ backend hoặc cấu hình CORS.',
    })
  }

  // Backend luôn trả JSON; nếu không đọc được (ví dụ backend chưa chạy, proxy trả 502, hoặc Vercel trả HTML index.html)
  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json().catch(() => null) : null

  if (!response.ok || payload?.success === false || payload === null) {
    // Tự động xoá session và kích hoạt sự kiện đăng xuất khi token hết hạn (401)
    if (response.status === 401 && auth && path !== '/auth/login' && path !== '/auth/register') {
      clearSession()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'))
      }
    }

    const isValidation = payload?.code === 'VALIDATION_ERROR'
    const fallbackCode = response.status >= 500 ? 'SERVER_UNAVAILABLE' : 'NETWORK_ERROR'
    const fallbackMessage = !isJson
      ? 'Phản hồi từ máy chủ không phải JSON (có thể do URL VITE_API_BASE_URL chưa đúng hoặc backend chưa sẵn sàng).'
      : (payload?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.')

    throw new ApiError({
      status: response.status,
      code: payload?.code ?? fallbackCode,
      message: fallbackMessage,
      fieldErrors: isValidation ? payload?.data : undefined,
    })
  }

  return (payload?.data ?? null) as T
}
