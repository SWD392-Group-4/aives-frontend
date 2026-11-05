import { useCallback, useEffect, useRef, useState } from 'react'
import ConfirmModal from '../../components/ConfirmModal.jsx'
import Icon from '../../components/Icon.jsx'
import Modal from '../../components/Modal.jsx'
import TextField from '../../components/TextField'
import { materialService } from '../materials/materialService'
import { Chapter, Course, Material } from '../materials/types'
import { errorText, Notify } from './shared'

interface Props {
  course: Course
  chapters: Chapter[]
  reloadChapters: () => Promise<void>
  notify: Notify
}

const EMPTY_FORM = { name: '', orderNo: '1', description: '' }

function formatSize(bytes?: number) {
  if (!bytes) return '0 KB'
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Bước 1: chương của môn + tài liệu của từng chương (tải lên nhiều file cùng lúc). */
export default function CourseChaptersStep({ course, chapters, reloadChapters, notify }: Props) {
  const [materials, setMaterials] = useState<Record<string, Material[]>>({})
  const [uploadingChapterId, setUploadingChapterId] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const uploadTargetRef = useRef<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Chapter | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingChapter, setDeletingChapter] = useState<Chapter | null>(null)
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null)

  const loadMaterials = useCallback(async () => {
    const entries = await Promise.all(
      chapters.map(async (c) => [c.id, await materialService.getChapterMaterials(c.id).catch(() => [])] as const)
    )
    setMaterials(Object.fromEntries(entries))
  }, [chapters])

  useEffect(() => {
    loadMaterials()
  }, [loadMaterials])

  /* ---------- Chương ---------- */
  const openCreate = () => {
    const next = chapters.reduce((max, c) => Math.max(max, c.orderNo), 0) + 1
    setEditing(null)
    setForm({ ...EMPTY_FORM, orderNo: String(next) })
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (chapter: Chapter) => {
    setEditing(chapter)
    setForm({ name: chapter.name, orderNo: String(chapter.orderNo), description: chapter.description || '' })
    setFormError('')
    setModalOpen(true)
  }

  const saveChapter = async () => {
    const name = form.name.trim()
    const orderNo = Number(form.orderNo)
    if (!name) return setFormError('Vui lòng nhập tên chương.')
    if (!Number.isInteger(orderNo) || orderNo < 1) return setFormError('Thứ tự phải là số nguyên từ 1 trở lên.')
    const payload = { name, orderNo, description: form.description.trim() || undefined }
    setSaving(true)
    try {
      if (editing) {
        await materialService.updateChapter(course.id, editing.id, payload)
        notify('success', `Đã cập nhật chương "${name}".`)
      } else {
        await materialService.createChapter(course.id, payload)
        notify('success', `Đã thêm chương "${name}".`)
      }
      setModalOpen(false)
      await reloadChapters()
    } catch (err: any) {
      setFormError(errorText(err, 'Không lưu được chương.'))
    } finally {
      setSaving(false)
    }
  }

  const deleteChapter = async () => {
    if (!deletingChapter) return
    try {
      await materialService.deleteChapter(course.id, deletingChapter.id)
    } catch (err: any) {
      throw { message: errorText(err, 'Không xoá được chương.') }
    }
    notify('success', `Đã xoá chương "${deletingChapter.name}".`)
    setDeletingChapter(null)
    await reloadChapters()
  }

  /* ---------- Tài liệu ---------- */
  const pickFiles = (chapterId: string) => {
    uploadTargetRef.current = chapterId
    fileInputRef.current?.click()
  }

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const chapterId = uploadTargetRef.current
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!chapterId || files.length === 0) return

    setUploadingChapterId(chapterId)
    const failed: string[] = []
    let ok = 0
    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`Đang tải ${i + 1}/${files.length}: ${files[i].name}`)
      try {
        await materialService.uploadChapterMaterial(chapterId, files[i])
        ok++
      } catch (err: any) {
        failed.push(`${files[i].name} (${errorText(err, 'lỗi')})`)
      }
    }
    setUploadingChapterId(null)
    setUploadProgress('')
    await Promise.all([loadMaterials(), reloadChapters()])
    if (failed.length > 0) {
      notify('error', `Tải lên ${ok}/${files.length} file. Lỗi: ${failed.join('; ')}`)
    } else {
      notify('success', `Đã tải lên ${ok} file tài liệu.`)
    }
  }

  const deleteMaterial = async () => {
    if (!deletingMaterial) return
    try {
      await materialService.deleteMaterial(deletingMaterial.id)
    } catch (err: any) {
      throw { message: errorText(err, 'Không xoá được tài liệu.') }
    }
    notify('success', `Đã xoá tài liệu "${deletingMaterial.fileName}".`)
    setDeletingMaterial(null)
    await Promise.all([loadMaterials(), reloadChapters()])
  }

  const reread = async (m: Material) => {
    try {
      await materialService.reindexMaterial(m.id)
      await loadMaterials()
      notify('success', `Đã đọc lại nội dung "${m.fileName}".`)
    } catch (err: any) {
      notify('error', errorText(err, 'Không đọc lại được tài liệu.'))
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.pptx,.docx"
        className="hidden"
        onChange={handleFiles}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-on-surface-variant">
          Mỗi chương tải lên tài liệu bài giảng (PDF / PPTX / DOCX). AI dùng nội dung tài liệu để sinh câu hỏi ở Bước 3.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-sm hover:bg-primary/90"
        >
          <Icon name="add" className="text-base" />
          Thêm chương
        </button>
      </div>

      {chapters.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant/70 bg-surface-container-lowest p-10 text-center">
          <Icon name="post_add" className="mx-auto mb-2 text-3xl text-outline" />
          <h3 className="text-sm font-bold text-on-surface">Môn {course.courseCode} chưa có chương nào</h3>
          <p className="mt-1 text-xs text-on-surface-variant">Bấm &quot;Thêm chương&quot; để bắt đầu.</p>
        </div>
      ) : (
        chapters.map((chapter) => {
          const list = materials[chapter.id] || []
          const readyCount = list.filter((m) => m.ragStatus === 'READY').length
          const uploading = uploadingChapterId === chapter.id
          return (
            <div key={chapter.id} className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-[11px] font-bold text-primary">
                      {chapter.orderNo}
                    </span>
                    <h3 className="truncate text-sm font-bold text-on-surface">{chapter.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        readyCount > 0 ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'
                      }`}
                    >
                      {readyCount > 0 ? `${readyCount} tài liệu sẵn sàng` : 'Chưa có tài liệu'}
                    </span>
                  </div>
                  {chapter.description && <p className="mt-1 text-xs text-on-surface-variant">{chapter.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => pickFiles(chapter.id)}
                    disabled={uploadingChapterId !== null}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/40 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
                  >
                    <Icon name="upload_file" className="text-sm" />
                    Tải tài liệu
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(chapter)}
                    title="Sửa chương"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-outline hover:bg-surface-container hover:text-on-surface"
                  >
                    <Icon name="edit" className="text-sm" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingChapter(chapter)}
                    title="Xoá chương"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-outline hover:bg-error-container hover:text-error"
                  >
                    <Icon name="delete" className="text-sm" />
                  </button>
                </div>
              </div>

              {uploading && (
                <p className="mt-2 text-xs font-semibold text-primary">
                  <Icon name="hourglass_top" className="mr-1 animate-spin align-middle text-sm" />
                  {uploadProgress}
                </p>
              )}

              {list.length > 0 && (
                <ul className="mt-3 divide-y divide-outline-variant/30 rounded-xl border border-outline-variant/30">
                  {list.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-on-surface">{m.fileName}</p>
                        <p className="text-on-surface-variant">
                          {formatSize(m.fileSize)} · {m.chunkCount ?? 0} đoạn nội dung
                          {m.ragStatus === 'FAILED' && m.errorMessage && <span className="text-error"> · {m.errorMessage}</span>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 font-bold ${
                            m.ragStatus === 'READY'
                              ? 'bg-secondary-container text-on-secondary-container'
                              : m.ragStatus === 'FAILED'
                                ? 'bg-error-container text-on-error-container'
                                : 'bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          {m.ragStatus === 'READY' ? 'Sẵn sàng' : m.ragStatus === 'FAILED' ? 'Lỗi' : 'Đang xử lý'}
                        </span>
                        {m.ragStatus === 'FAILED' && (
                          <button type="button" onClick={() => reread(m)} className="font-semibold text-primary hover:underline">
                            Đọc lại
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeletingMaterial(m)}
                          title="Xoá tài liệu"
                          className="flex h-6 w-6 items-center justify-center rounded-md text-outline hover:bg-error-container hover:text-error"
                        >
                          <Icon name="close" className="text-sm" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })
      )}

      {modalOpen && (
        <Modal title={editing ? 'Sửa chương' : `Thêm chương vào ${course.courseCode}`} onClose={() => !saving && setModalOpen(false)}>
          <div className="space-y-4">
            <TextField
              id="chapter-name"
              label="Tên chương"
              required
              icon="menu_book"
              value={form.name}
              onChange={(e) => {
                setForm((p) => ({ ...p, name: e.target.value }))
                setFormError('')
              }}
              placeholder="VD: Chương 1: Số tự nhiên"
              inputProps={{ maxLength: 200 }}
            />
            <TextField
              id="chapter-order"
              label="Thứ tự"
              required
              icon="format_list_numbered"
              type="number"
              value={form.orderNo}
              onChange={(e) => {
                setForm((p) => ({ ...p, orderNo: e.target.value }))
                setFormError('')
              }}
              inputProps={{ min: 1, step: 1 }}
              error={formError}
            />
            <div className="space-y-1.5">
              <label htmlFor="chapter-desc" className="block text-label-md text-on-surface">
                Mô tả
              </label>
              <textarea
                id="chapter-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full rounded-2xl bg-surface-container-low p-3.5 text-body-md text-on-surface shadow-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                className="rounded-full px-5 py-2.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveChapter}
                className="rounded-full bg-primary px-6 py-2.5 text-xs font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Thêm chương'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deletingChapter && (
        <ConfirmModal
          title="Xoá chương"
          message={`Xoá chương "${deletingChapter.name}"? Chỉ xoá được khi chương không còn tài liệu và câu hỏi.`}
          confirmLabel="Xoá"
          cancelLabel="Huỷ"
          pendingLabel="Đang xoá..."
          icon="delete"
          danger
          onClose={() => setDeletingChapter(null)}
          onConfirm={deleteChapter}
        />
      )}

      {deletingMaterial && (
        <ConfirmModal
          title="Xoá tài liệu"
          message={`Xoá tài liệu "${deletingMaterial.fileName}"? Câu hỏi đã sinh từ tài liệu này vẫn được giữ lại.`}
          confirmLabel="Xoá"
          cancelLabel="Huỷ"
          pendingLabel="Đang xoá..."
          icon="delete"
          danger
          onClose={() => setDeletingMaterial(null)}
          onConfirm={deleteMaterial}
        />
      )}
    </div>
  )
}
