import { apiRequest } from './apiClient'

/**
 * API quản lý tài khoản dành cho ADMIN (AdminUserController, prefix /api/admin/users).
 */

/** GET /admin/users -> danh sách tất cả tài khoản */
export function getUsers() {
  return apiRequest('/admin/users')
}

/**
 * POST /admin/users -> { user, emailSent }
 * Không gửi mật khẩu: backend tự sinh mật khẩu tạm và gửi tới email của người dùng.
 * emailSent = false: backend chưa bật gửi mail, mật khẩu tạm chỉ được in ở console của backend.
 */
export function createUser({ email, fullName, role }) {
  return apiRequest('/admin/users', {
    method: 'POST',
    body: { email, fullName, role },
  })
}

/**
 * PUT /admin/users/{id}/status -> tài khoản sau khi cập nhật.
 * active = false: vô hiệu hoá (không đăng nhập được, token đang dùng bị từ chối).
 * active = true: kích hoạt lại.
 */
export function updateUserStatus(id, active) {
  return apiRequest(`/admin/users/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    body: { active },
  })
}

/** DELETE /admin/users/{id} */
export function deleteUser(id) {
  return apiRequest(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
