import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

/**
 * Chặn trang cần đăng nhập.
 *   <ProtectedRoute>...</ProtectedRoute>                    -> chỉ cần đăng nhập
 *   <ProtectedRoute roles={['ADMIN']}>...</ProtectedRoute>  -> phải đúng role
 * Tài khoản đang dùng mật khẩu tạm (user.mustChangePassword) chỉ vào được trang hồ sơ để đổi mật khẩu.
 * Backend vẫn kiểm tra quyền ở mọi API; phần này chỉ để điều hướng giao diện.
 */
const CHANGE_PASSWORD_PATH = '/profile'

function ProtectedRoute({ roles, children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    // Nhớ trang đang muốn vào để quay lại sau khi đăng nhập.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (user.mustChangePassword && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return children
}

export default ProtectedRoute
