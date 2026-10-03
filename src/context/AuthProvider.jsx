import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authService from '../services/authService.js'
import { clearSession, loadSession, saveSession } from '../services/tokenStorage.js'
import { AuthContext } from './AuthContext.js'

/** Bọc toàn bộ app để mọi trang biết ai đang đăng nhập. */
function AuthProvider({ children }) {
  // Lấy phiên đã lưu để tải lại trang không bị đăng xuất.
  const [user, setUser] = useState(() => loadSession()?.user ?? null)

  // Khi mở app, hỏi lại backend xem token đã lưu còn dùng được không.
  useEffect(() => {
    const session = loadSession()
    if (!session?.accessToken) return

    let cancelled = false
    authService
      .getCurrentUser()
      .then((freshUser) => {
        if (cancelled) return
        saveSession({ ...session, user: freshUser })
        setUser(freshUser)
      })
      .catch((error) => {
        // Chỉ đăng xuất khi token hết hạn hoặc tài khoản bị khoá, không phải khi mất mạng.
        if (cancelled || (error.status !== 401 && error.status !== 403)) return
        clearSession()
        setUser(null)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const result = await authService.login({ email, password })
    saveSession({ accessToken: result.accessToken, user: result.user })
    setUser(result.user)
    return result.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // Backend lỗi hay token đã hết hạn thì vẫn đăng xuất ở phía trình duyệt.
    }
    clearSession()
    setUser(null)
  }, [])

  // Gọi sau khi cập nhật hồ sơ để navbar và các trang khác thấy thông tin mới.
  const updateUser = useCallback((nextUser) => {
    const session = loadSession()
    if (session) saveSession({ ...session, user: nextUser })
    setUser(nextUser)
  }, [])

  const value = useMemo(
    () => ({ user, isAuthenticated: user !== null, login, logout, updateUser }),
    [user, login, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
