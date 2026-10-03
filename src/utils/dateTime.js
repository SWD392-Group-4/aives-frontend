/**
 * Chuyển đổi thời gian giữa backend (ISO-8601, giờ UTC) và ô <input type="datetime-local">
 * (giờ theo múi giờ trên máy người dùng, dạng 'yyyy-MM-ddTHH:mm').
 */

const pad = (value) => String(value).padStart(2, '0')

/** Date -> 'yyyy-MM-ddTHH:mm' theo giờ máy, để đặt vào ô datetime-local. */
export function dateToInputValue(date) {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/** '2026-10-10T01:00:00Z' -> '2026-10-10T08:00' (máy ở Việt Nam). Chuỗi sai thì trả về ''. */
export function isoToInputValue(isoString) {
  const date = new Date(isoString)
  return Number.isNaN(date.getTime()) ? '' : dateToInputValue(date)
}

/** '2026-10-10T08:00' (giờ máy) -> Date. Trả về null nếu ô đang trống hoặc sai. */
export function inputValueToDate(inputValue) {
  if (!inputValue) return null
  const date = new Date(inputValue)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Hiển thị ngày giờ ngắn gọn theo ngôn ngữ đang chọn, ví dụ '10/10/2026 08:00'. */
export function formatDateTime(isoString, locale) {
  if (!isoString) return '-'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** Tên múi giờ của máy, ví dụ 'Asia/Saigon'. */
export function getDeviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}
