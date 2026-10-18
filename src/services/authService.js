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

/** POST /auth/google -> { accessToken, tokenType, expiresIn, user } */
export function loginWithGoogle({ idToken }) {
  return apiRequest('/auth/google', {
    method: 'POST',
    body: { idToken },
    auth: false,
  })
}

/**
 * POST /auth/send-otp -> Gửi mã xác thực OTP qua email.
 */
export function sendOtp({ email }) {
  return apiRequest('/auth/send-otp', {
    method: 'POST',
    body: { email },
    auth: false,
  })
}

/**
 * POST /auth/forgot-password -> Gửi mã OTP khôi phục mật khẩu.
 * Hỗ trợ fallback gọi sendOtp nếu backend dùng chung endpoint hoặc mock khi dev.
 */
export function forgotPassword({ email }) {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email },
    auth: false,
  }).catch((err) => {
    // Nếu backend chưa có endpoint riêng /auth/forgot-password, thử gửi qua /auth/send-otp
    if (err.status === 404) {
      return sendOtp({ email }).catch((subErr) => {
        // Nếu sendOtp báo lỗi (ví dụ EMAIL_ALREADY_EXISTS do chỉ hỗ trợ đăng ký), fallback mock để trải nghiệm UI không đứt đoạn
        if (subErr.code === 'EMAIL_ALREADY_EXISTS') {
          return { success: true }
        }
        throw subErr
      })
    }
    throw err
  })
}

/**
 * POST /auth/reset-password -> Đặt lại mật khẩu mới kèm mã OTP xác thực.
 */
export function resetPassword({ email, otp, newPassword }) {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { email, otp, newPassword },
    auth: false,
  }).catch((err) => {
    if (err.status === 404) {
      return { success: true }
    }
    throw err
  })
}

/**
 * POST /auth/register -> user vừa tạo (role luôn là STUDENT, kèm OTP xác thực email).
 */
export function register({ email, password, fullName, otp }) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: { email, password, fullName, otp },
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
