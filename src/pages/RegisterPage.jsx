import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import Logo from '../components/Logo.jsx'
import Mascot from '../components/Mascot.jsx'
import TextField from '../components/TextField.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { register } from '../services/authService.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Khớp với RegisterRequest của backend: mật khẩu từ 6 đến 72 ký tự.
const MIN_PASSWORD_LENGTH = 6

// Lỗi nghiệp vụ của backend cần hiện ngay dưới ô tương ứng.
const FIELD_BY_ERROR_CODE = {
  EMAIL_ALREADY_EXISTS: 'email',
  STUDENT_CODE_ALREADY_EXISTS: 'studentCode',
}

const HIGHLIGHTS = [
  {
    icon: 'record_voice_over',
    title: 'Thi vấn đáp 1-1 với AI',
    description: 'Nghe câu hỏi, trả lời bằng giọng nói và được hỏi sâu thêm theo chính câu trả lời của bạn.',
    iconClass: 'text-primary group-hover:bg-primary group-hover:text-on-primary',
  },
  {
    icon: 'menu_book',
    title: 'Câu hỏi bám sát bài học',
    description: 'Đề thi do giảng viên soạn theo từng bài học và chủ đề của môn.',
    iconClass: 'text-secondary group-hover:bg-secondary group-hover:text-on-secondary',
  },
  {
    icon: 'analytics',
    title: 'Điểm rõ theo từng tiêu chí',
    description: 'Xem điểm, nhận xét cho từng câu và gửi phúc khảo khi chưa đồng ý với kết quả.',
    iconClass: 'text-tertiary group-hover:bg-tertiary group-hover:text-on-tertiary',
  },
]

const EMPTY_FORM = {
  fullName: '',
  studentCode: '',
  email: '',
  password: '',
  confirmPassword: '',
}

function validate(form) {
  const errors = {}
  if (!form.fullName.trim()) {
    errors.fullName = 'Vui lòng nhập họ và tên.'
  }
  if (!form.studentCode.trim()) {
    errors.studentCode = 'Vui lòng nhập mã số sinh viên.'
  }
  if (!form.email.trim()) {
    errors.email = 'Vui lòng nhập email.'
  } else if (!EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = 'Email chưa đúng định dạng, ví dụ: ten@fpt.edu.vn'
  }
  if (form.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`
  }
  if (!form.confirmPassword) {
    errors.confirmPassword = 'Vui lòng nhập lại mật khẩu.'
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Mật khẩu nhập lại chưa khớp.'
  }
  return errors
}

function RegisterPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Đã đăng nhập rồi thì không cần đăng ký nữa.
  if (isAuthenticated) return <Navigate to="/" replace />

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setFormError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setFormError('')
    try {
      const user = await register({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        studentCode: form.studentCode.trim().toUpperCase(),
      })
      // Backend không tự đăng nhập sau khi đăng ký, nên chuyển sang trang đăng nhập.
      navigate('/login', { replace: true, state: { registeredEmail: user.email } })
    } catch (error) {
      const field = FIELD_BY_ERROR_CODE[error.code]
      if (field) {
        setErrors({ [field]: error.message })
      } else if (Object.keys(error.fieldErrors ?? {}).length > 0) {
        setErrors(error.fieldErrors)
      } else {
        setFormError(error.message)
      }
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen w-full bg-surface">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <Icon name="arrow_back" className="text-base" />
            Trang chủ
          </Link>
        </div>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
          {/* ============ CỘT TRÁI: giới thiệu ============ */}
          <aside className="order-2 flex flex-col space-y-6 lg:order-1 lg:col-span-5">
            <div className="relative overflow-hidden rounded-[2rem] bg-primary-container p-8 text-on-primary shadow-xl">
              <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-on-primary/10 blur-2xl" />
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-secondary-fixed/20 blur-xl" />

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-on-primary/15 px-3.5 py-1.5 backdrop-blur-md">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-secondary-fixed" />
                  <span className="text-label-sm tracking-wider uppercase">Thi vấn đáp cùng AI</span>
                </div>
                <Mascot className="h-44 w-44 shadow-2xl sm:h-52 sm:w-52" />
                <h2 className="mt-5 text-headline-lg">
                  Khởi đầu cùng <span className="text-secondary-fixed">AIVES.AI</span>
                </h2>
                <p className="mt-2 max-w-sm text-body-sm text-on-primary-container/90">
                  Tạo tài khoản sinh viên để vào phòng thi vấn đáp và xem kết quả của bạn.
                </p>
              </div>
            </div>

            <ul className="flex flex-col space-y-3.5">
              {HIGHLIGHTS.map((item) => (
                <li
                  key={item.title}
                  className="group flex items-start gap-4 rounded-3xl bg-surface-container-lowest p-5 shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container-high transition-colors ${item.iconClass}`}
                  >
                    <Icon name={item.icon} className="text-[26px]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-headline-sm text-on-surface">{item.title}</h3>
                    <p className="mt-1 text-body-sm text-on-surface-variant">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>

          {/* ============ CỘT PHẢI: form đăng ký ============ */}
          <section className="order-1 lg:order-2 lg:col-span-7">
            <div className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-lg sm:p-10">
              <div className="mb-8 flex flex-col space-y-3">
                <span className="self-start rounded-full bg-surface-container px-3 py-1 text-label-sm font-bold text-primary">
                  Dành cho sinh viên
                </span>
                <h1 className="text-headline-xl-mobile text-on-surface md:text-headline-xl">Tạo tài khoản sinh viên</h1>
                <p className="text-body-md text-on-surface-variant">
                  Điền thông tin bên dưới để bắt đầu thi vấn đáp cùng AI.
                </p>
              </div>

              <form className="flex flex-col space-y-5" onSubmit={handleSubmit} noValidate>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-12 sm:gap-4">
                  <div className="sm:col-span-7">
                    <TextField
                      id="fullName"
                      label="Họ và tên"
                      icon="person"
                      value={form.fullName}
                      onChange={handleChange}
                      placeholder="Nguyễn Văn An"
                      autoComplete="name"
                      error={errors.fullName}
                      required
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <TextField
                      id="studentCode"
                      label="Mã số sinh viên"
                      icon="badge"
                      value={form.studentCode}
                      onChange={handleChange}
                      placeholder="SE180001"
                      autoComplete="off"
                      error={errors.studentCode}
                      required
                    />
                  </div>
                </div>

                <TextField
                  id="email"
                  label="Email"
                  icon="mail"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="ten@fpt.edu.vn"
                  autoComplete="email"
                  hint="Email này dùng để đăng nhập."
                  error={errors.email}
                  required
                />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
                  <TextField
                    id="password"
                    label="Mật khẩu"
                    icon="lock"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder={`Tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`}
                    autoComplete="new-password"
                    error={errors.password}
                    required
                  />
                  <TextField
                    id="confirmPassword"
                    label="Nhập lại mật khẩu"
                    icon="lock_reset"
                    type="password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Nhập lại mật khẩu"
                    autoComplete="new-password"
                    error={errors.confirmPassword}
                    required
                  />
                </div>

                {formError && (
                  <p role="alert" className="flex items-start gap-2 rounded-2xl bg-error-container px-4 py-3 text-body-sm text-on-error-container">
                    <Icon name="error" className="text-lg" />
                    {formError}
                  </p>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-label-lg text-on-primary shadow-xl shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-tint active:translate-y-0 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
                  >
                    {submitting ? 'Đang đăng ký...' : 'Đăng ký tài khoản'}
                    <Icon name={submitting ? 'progress_activity' : 'arrow_forward'} className={`text-xl ${submitting ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </form>

              <div className="mt-8 border-t border-outline-variant/30 pt-6 text-center">
                <p className="text-body-md text-on-surface-variant">
                  Đã có tài khoản?
                  <Link to="/login" className="ml-1.5 font-bold text-primary hover:underline">
                    Đăng nhập ngay
                  </Link>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default RegisterPage
