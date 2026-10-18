/**
 * Các role khớp với enum Role của backend.
 * Tên hiển thị của role nằm trong bản dịch: t(`roles.${role}`).
 */
export const ROLES = {
  ADMIN: 'ADMIN',
  LECTURER: 'LECTURER',
  STUDENT: 'STUDENT',
}

/** Màu nhãn của từng role (class lấy từ src/styles/colors.css). */
export const ROLE_BADGE_CLASSES = {
  ADMIN: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  LECTURER: 'bg-primary-fixed text-on-primary-fixed-variant',
  STUDENT: 'bg-secondary-container/50 text-on-secondary-fixed-variant',
}

/** Trang mặc định sau khi đăng nhập, theo role. */
export function getHomePathForRole(role) {
  if (role === ROLES.ADMIN) return '/admin/dashboard'
  if (role === ROLES.STUDENT) return '/student/dashboard'
  if (role === ROLES.LECTURER) return '/lecturer/dashboard'
  return '/'
}
