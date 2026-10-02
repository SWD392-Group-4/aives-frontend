import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext.js'

/** Ví dụ: const { user, isAuthenticated, login, logout } = useAuth() */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth phải được dùng bên trong <AuthProvider>')
  }
  return context
}
