import { apiRequest } from './apiClient.js'

/**
 * Các API xác thực của aives-backend (AuthController, prefix /api/auth).
 */

/** POST /auth/login -> { accessToken, tokenType, expiresIn, user } */
export function login({ email, password }) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
}

/** POST /auth/register -> user vừa tạo (role luôn là STUDENT) */
export function register({ email, password, fullName, studentCode }) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: { email, password, fullName, studentCode },
    auth: false,
  })
}

/** POST /auth/logout: vô hiệu hoá token hiện tại */
export function logout() {
  return apiRequest('/auth/logout', { method: 'POST' })
}

/** GET /auth/me -> user đang đăng nhập */
export function getCurrentUser() {
  return apiRequest('/auth/me')
}
