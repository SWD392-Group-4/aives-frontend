import { apiRequest } from './apiClient.js'

/**
 * API quản lý tài khoản dành cho ADMIN (AdminUserController, prefix /api/admin/users).
 */

/** GET /admin/users -> danh sách tất cả tài khoản */
export function getUsers() {
  return apiRequest('/admin/users')
}

/**
 * POST /admin/users -> tài khoản vừa tạo.
 * Với role STUDENT, không gửi studentCode thì backend tự sinh mã ngẫu nhiên.
 */
export function createUser({ email, password, fullName, role }) {
  return apiRequest('/admin/users', {
    method: 'POST',
    body: { email, password, fullName, role },
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
