import { createContext } from 'react'

/**
 * Giá trị: { user, isAuthenticated, login(email, password), logout() }
 * Dùng qua hook useAuth() trong src/hooks/useAuth.js
 */
export const AuthContext = createContext(null)
