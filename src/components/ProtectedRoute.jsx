import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'



function ProtectedRoute({ roles = null, children }) {

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
