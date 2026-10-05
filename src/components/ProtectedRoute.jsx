import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

/**
 * Chặn trang cần đăng nhập.
 *   <ProtectedRoute>...</ProtectedRoute>                    -> chỉ cần đăng nhập
 *   <ProtectedRoute roles={['ADMIN']}>...</ProtectedRoute>  -> phải đúng role
 * Backend vẫn kiểm tra quyền ở mọi API; phần này chỉ để điều hướng giao diện.
 */
function ProtectedRoute({ roles = null, children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    // Nhớ trang đang muốn vào để quay lại sau khi đăng nhập.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return children
}

export default ProtectedRoute
