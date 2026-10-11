import { apiRequest } from './apiClient'

/**
 * Các API xác thực và hồ sơ cá nhân của aives-backend (AuthController, prefix /api/auth).
 */

/** POST /auth/login -> { accessToken, tokenType, expiresIn, user } */
export function login({ email, password }) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
}

/**
 * POST /auth/register -> user vừa tạo (role luôn là STUDENT).
 */
export function register({ email, password, fullName }) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: { email, password, fullName },
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

/** PUT /auth/me -> user sau khi cập nhật */
export function updateProfile({ fullName }) {
  return apiRequest('/auth/me', { method: 'PUT', body: { fullName } })
}

/** PUT /auth/me/password */
export function changePassword({ currentPassword, newPassword }) {
  return apiRequest('/auth/me/password', {
    method: 'PUT',
    body: { currentPassword, newPassword },
  })
}
