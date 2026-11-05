export type Notify = (type: 'success' | 'error', message: string) => void

/** Lấy message backend trả về (vd lý do không xoá được) thay vì câu báo lỗi chung. */
export function errorText(err: any, fallback: string): string {
  if (err?.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
    return Object.values(err.fieldErrors).join('. ')
  }
  return err?.message || fallback
}

export const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: 'Dễ',
  MEDIUM: 'Trung bình',
  HARD: 'Khó',
}

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  ARCHIVED: 'Lưu trữ',
}
