/**
 * Lưu phiên đăng nhập (accessToken + thông tin user) vào localStorage
 * để tải lại trang không bị đăng xuất.
 */
const STORAGE_KEY = 'aives.session'

export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSession(session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Trình duyệt chặn localStorage (ví dụ chế độ ẩn danh): vẫn dùng được trong phiên hiện tại.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Bỏ qua, không có gì để xoá.
  }
}

export function getAccessToken() {
  return loadSession()?.accessToken ?? null
}
