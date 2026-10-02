import { useRef } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer.jsx'
import Icon from '../components/Icon.jsx'
import Mascot from '../components/Mascot.jsx'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../hooks/useAuth.js'

const HERO_BADGES = [
  { icon: 'auto_awesome', iconClass: 'text-accent-amber', label: 'AI hỏi xoáy theo câu trả lời' },
  { icon: 'verified', iconClass: 'text-secondary-fixed', label: 'Chấm điểm theo rubric' },
  { icon: 'mic', iconClass: 'text-accent-cyan', label: 'Vấn đáp bằng giọng nói' },
]

const HERO_FACTS = [
  { value: '3 vai trò', label: ['Sinh viên, giảng viên', 'và quản trị viên'] },
  { value: 'Tiếng Việt', label: ['AI đọc câu hỏi,', 'sinh viên trả lời bằng lời'] },
  { value: '100%', label: ['Điểm cuối cùng', 'do giảng viên chốt'] },
]

const FEATURES = [
  {
    icon: 'record_voice_over',
    title: 'Vấn đáp bằng giọng nói',
    description: 'AI đọc câu hỏi, sinh viên trả lời bằng lời nói và hệ thống tự chuyển thành văn bản.',
    tag: '01 / Giọng nói',
    gradient: 'from-track-orange-from to-track-orange-to',
    glow: 'hover:shadow-track-orange-to/35',
  },
  {
    icon: 'menu_book',
    title: 'Ngân hàng câu hỏi',
    description: 'Giảng viên soạn câu hỏi theo từng bài học, chủ đề và gắn rubric chấm điểm cho mỗi câu.',
    tag: '02 / Câu hỏi',
    gradient: 'from-track-blue-from to-track-blue-to',
    glow: 'hover:shadow-track-blue-to/35',
  },
  {
    icon: 'psychology',
    title: 'Hỏi xoáy thích ứng',
    description: 'AI đọc câu trả lời rồi hỏi tiếp khi ý còn thiếu, chưa rõ hoặc mâu thuẫn.',
    tag: '03 / Hỏi xoáy',
    gradient: 'from-track-green-from to-track-green-to',
    glow: 'hover:shadow-track-green-to/35',
  },
  {
    icon: 'fact_check',
    title: 'Gợi ý điểm theo rubric',
    description: 'AI đối chiếu câu trả lời với từng tiêu chí, đề xuất điểm kèm nhận xét và trích dẫn.',
    tag: '04 / Rubric',
    gradient: 'from-track-cyan-from to-track-cyan-to',
    glow: 'hover:shadow-track-cyan-to/35',
  },
  {
    icon: 'approval',
    title: 'Giảng viên chốt điểm',
    description: 'Giảng viên xem lại nội dung hỏi đáp, sửa điểm nếu cần rồi mới công bố kết quả.',
    tag: '05 / Phê duyệt',
    gradient: 'from-track-indigo-from to-track-indigo-to',
    glow: 'hover:shadow-track-indigo-to/35',
  },
  {
    icon: 'analytics',
    title: 'Kết quả và phúc khảo',
    description: 'Sinh viên xem điểm từng câu, đọc nhận xét và gửi phúc khảo khi chưa đồng ý.',
    tag: '06 / Kết quả',
    gradient: 'from-track-amber-from to-track-amber-to',
    glow: 'hover:shadow-track-amber-to/35',
  },
]

const STEPS = [
  {
    icon: 'edit_note',
    title: 'Soạn câu hỏi và rubric',
    description:
      'Giảng viên tạo câu hỏi theo bài học, gắn rubric gồm các tiêu chí và thang điểm, rồi chọn câu hỏi đưa vào đề thi.',
    note: 'Dành cho giảng viên',
    noteIcon: 'check_circle',
    iconBox: 'bg-primary-fixed text-primary',
    accent: 'text-primary',
  },
  {
    icon: 'forum',
    title: 'Vào phòng thi, trả lời AI',
    description:
      'Sinh viên bật micro và trả lời từng câu. AI nghe câu trả lời, hỏi xoáy thêm khi cần rồi chuyển sang câu tiếp theo.',
    note: 'Dành cho sinh viên',
    noteIcon: 'mic',
    iconBox: 'bg-secondary-container text-secondary',
    accent: 'text-secondary',
  },
  {
    icon: 'verified_user',
    title: 'Nhận điểm sau khi duyệt',
    description:
      'AI gợi ý điểm theo từng tiêu chí. Giảng viên rà soát, chốt điểm chính thức và sinh viên xem kết quả.',
    note: 'Minh bạch, có đối chiếu',
    noteIcon: 'task_alt',
    iconBox: 'bg-tertiary-fixed text-tertiary',
    accent: 'text-tertiary',
  },
]

const SAMPLE_SCORES = [
  { value: '9.2 / 10', label: 'Kiến thức chuyên môn', color: 'text-primary' },
  { value: '8.8 / 10', label: 'Phản xạ đối đáp', color: 'text-secondary' },
  { value: '8.5 / 10', label: 'Tư duy phản biện', color: 'text-tertiary-container' },
  { value: '9.0 / 10', label: 'Diễn đạt và bố cục', color: 'text-primary' },
]

function HomePage() {
  const { user } = useAuth()
  const railRef = useRef(null)

  const scrollRail = (direction) => {
    railRef.current?.scrollBy({ left: direction * 300, behavior: 'smooth' })
  }

  return (
    <>
      <Navbar />

      <main className="w-full bg-background pt-20">
        {/* ============ HERO ============ */}
        <section className="relative -mt-20 w-full overflow-hidden bg-linear-to-b from-hero-from via-primary-container to-hero-to pt-28 pb-20 text-on-primary md:pb-28">
          {/* Các vòng tròn lan toả phía sau */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[320px] w-[320px] animate-ping rounded-full border border-on-primary/10 opacity-25 md:h-[600px] md:w-[600px]" />
            <div className="absolute h-[500px] w-[500px] rounded-full border border-on-primary/15 md:h-[860px] md:w-[860px]" />
            <div className="absolute h-[720px] w-[720px] rounded-full border border-on-primary/10 md:h-[1140px] md:w-[1140px]" />
            <div className="absolute h-[980px] w-[980px] rounded-full border border-on-primary/5 md:h-[1460px] md:w-[1460px]" />
            <div className="absolute h-[450px] w-[450px] rounded-full bg-accent-cyan/20 blur-3xl" />
          </div>

          <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-4 text-center sm:px-6">
            <ul className="mb-6 flex flex-wrap items-center justify-center gap-3 sm:mb-8">
              {HERO_BADGES.map((badge) => (
                <li
                  key={badge.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-on-primary/15 px-3.5 py-1.5 text-label-sm shadow-sm backdrop-blur-md"
                >
                  <Icon name={badge.icon} filled className={`text-base ${badge.iconClass}`} />
                  {badge.label}
                </li>
              ))}
            </ul>

            <h1 className="max-w-4xl text-display-hero-mobile text-balance drop-shadow-sm md:text-display-hero">
              Nền tảng thi vấn đáp thông minh cùng AI
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-body-md text-on-primary/85 md:text-body-lg">
              AI đặt câu hỏi, hỏi xoáy theo câu trả lời của sinh viên và gợi ý điểm theo rubric. Giảng viên luôn là
              người chốt điểm cuối cùng.
            </p>

            <div className="relative mt-10 flex items-center justify-center">
              <div
                aria-hidden="true"
                className="absolute inset-0 animate-pulse rounded-full bg-linear-to-tr from-accent-cyan/40 via-on-primary/30 to-accent-amber/30 blur-2xl"
              />
              <Mascot className="relative z-10 h-44 w-44 shadow-2xl sm:h-56 sm:w-56 md:h-64 md:w-64" />
            </div>

            {user ? (
              <p className="mt-10 inline-flex items-center gap-2 rounded-full bg-on-primary/15 px-6 py-3 text-label-lg backdrop-blur-md">
                <Icon name="waving_hand" filled className="text-xl text-accent-amber" />
                Xin chào, {user.fullName}
              </p>
            ) : (
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  to="/register"
                  className="group inline-flex items-center justify-center rounded-full bg-surface-container-lowest px-10 py-4 text-label-lg tracking-wide text-primary-container shadow-xl shadow-on-primary/40 transition-all duration-200 hover:scale-105"
                >
                  BẮT ĐẦU NGAY
                  <Icon name="arrow_forward" className="ml-2 text-xl transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-full bg-on-primary/10 px-7 py-4 text-label-md backdrop-blur-md transition-colors hover:bg-on-primary/20"
                >
                  <Icon name="login" className="mr-2 text-xl" />
                  Tôi đã có tài khoản
                </Link>
              </div>
            )}

            <dl className="mt-12 flex w-full max-w-4xl flex-wrap items-center justify-around gap-6 border-t border-on-primary/15 pt-8">
              {HERO_FACTS.map((fact) => (
                <div key={fact.value} className="flex items-center gap-3">
                  <dt className="order-2 text-left text-body-sm leading-tight text-on-primary/75">
                    {fact.label[0]}
                    <br />
                    {fact.label[1]}
                  </dt>
                  <dd className="order-1 text-headline-md">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ============ TÍNH NĂNG ============ */}
        <section id="tinh-nang" className="w-full scroll-mt-20 bg-surface py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
            <div className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-surface-container-high px-3 py-1 text-label-sm text-primary">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  TÍNH NĂNG CHÍNH
                </div>
                <h2 className="text-headline-xl-mobile text-balance text-on-surface md:text-headline-xl">
                  Trọn vẹn một buổi thi vấn đáp, từ ra đề đến chốt điểm
                </h2>
              </div>
              <p className="max-w-md text-body-md text-on-surface-variant lg:pb-1">
                AIVES hỗ trợ giảng viên ở những khâu tốn thời gian nhất: đặt câu hỏi, hỏi sâu và chấm theo rubric.
              </p>
            </div>

            <div className="relative w-full">
              <button
                type="button"
                onClick={() => scrollRail(-1)}
                aria-label="Xem thẻ trước"
                className="absolute top-1/2 -left-2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface-container-lowest shadow-lg transition hover:bg-surface-container-low sm:flex lg:-left-5"
              >
                <Icon name="chevron_left" className="text-2xl text-primary" />
              </button>
              <button
                type="button"
                onClick={() => scrollRail(1)}
                aria-label="Xem thẻ tiếp theo"
                className="absolute top-1/2 -right-2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface-container-lowest shadow-lg transition hover:bg-surface-container-low sm:flex lg:-right-5"
              >
                <Icon name="chevron_right" className="text-2xl text-primary" />
              </button>

              <ul
                ref={railRef}
                className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pt-2 pb-8 md:gap-5"
              >
                {FEATURES.map((feature) => (
                  <li
                    key={feature.title}
                    className={`flex min-h-[340px] w-[260px] flex-none snap-start flex-col justify-between rounded-3xl bg-linear-to-b p-6 text-on-primary transition-all duration-300 hover:-translate-y-2 hover:shadow-xl sm:w-[280px] sm:p-7 ${feature.gradient} ${feature.glow}`}
                  >
                    <div>
                      <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-2xl bg-on-primary/20 backdrop-blur-sm">
                        <Icon name={feature.icon} className="text-2xl" />
                      </div>
                      <h3 className="mb-3 text-headline-md tracking-tight">{feature.title}</h3>
                      <p className="text-body-sm leading-relaxed text-on-primary/90">{feature.description}</p>
                    </div>
                    <div className="pt-6 text-label-sm tracking-wider text-on-primary/80 uppercase">{feature.tag}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ============ QUY TRÌNH 3 BƯỚC ============ */}
        <section id="quy-trinh" className="w-full scroll-mt-20 bg-surface-container-low py-16 lg:py-24">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-12">
            <div className="mx-auto mb-14 max-w-2xl">
              <span className="mb-3 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-label-sm text-primary">
                QUY TRÌNH TINH GỌN
              </span>
              <h2 className="text-headline-xl-mobile text-balance text-on-surface md:text-headline-xl">
                Một buổi thi vấn đáp chỉ với 3 bước
              </h2>
              <p className="mt-3 text-body-md text-on-surface-variant">
                Chạy ngay trên trình duyệt, chỉ cần micro để trả lời.
              </p>
            </div>

            <ol className="grid grid-cols-1 gap-6 text-left md:grid-cols-3 lg:gap-8">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-surface-container-lowest p-8 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div
                    aria-hidden="true"
                    className="absolute -right-4 -bottom-4 text-7xl font-extrabold text-surface-container-high opacity-40 select-none"
                  >
                    0{index + 1}
                  </div>
                  <div className="relative">
                    <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl ${step.iconBox}`}>
                      <Icon name={step.icon} className="text-2xl" />
                    </div>
                    <div className={`mb-1 text-label-sm font-bold tracking-wider uppercase ${step.accent}`}>
                      Bước 0{index + 1}
                    </div>
                    <h3 className="mb-3 text-headline-sm text-on-surface">{step.title}</h3>
                    <p className="text-body-sm leading-relaxed text-on-surface-variant">{step.description}</p>
                  </div>
                  <div className={`relative mt-6 flex items-center gap-1 pt-4 text-label-sm ${step.accent}`}>
                    {step.note}
                    <Icon name={step.noteIcon} className="text-base" />
                  </div>
                </li>
              ))}
            </ol>

            {!user && (
              <div className="mt-12">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-label-md text-on-primary shadow-md transition-all duration-200 hover:bg-surface-tint hover:shadow-lg"
                >
                  Tạo tài khoản sinh viên
                  <Icon name="arrow_forward" className="text-lg" />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ============ CHẤM ĐIỂM THEO RUBRIC ============ */}
        <section id="cham-diem" className="w-full scroll-mt-20 bg-surface py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-12">
            <div className="flex flex-col items-center gap-10 rounded-3xl bg-surface-container p-6 sm:p-12 lg:flex-row">
              <div className="flex-1">
                <span className="rounded-full bg-surface-container-highest px-3.5 py-1 text-label-sm text-primary">
                  CHẤM ĐIỂM THEO RUBRIC
                </span>
                <h2 className="mt-4 text-headline-lg text-on-surface">Điểm số rõ ràng theo từng tiêu chí</h2>
                <p className="mt-3 text-body-md text-on-surface-variant">
                  Mỗi câu trả lời được chấm theo các tiêu chí giảng viên đặt ra. AI đề xuất điểm kèm trích dẫn từ lời
                  nói của sinh viên, giảng viên xem lại rồi mới chốt.
                </p>
                <ul className="mt-6 grid grid-cols-2 gap-4">
                  {SAMPLE_SCORES.map((score) => (
                    <li key={score.label} className="rounded-2xl bg-surface-container-lowest p-3.5 shadow-sm">
                      <div className={`text-headline-sm ${score.color}`}>{score.value}</div>
                      <div className="text-body-sm text-on-surface-variant">{score.label}</div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-body-sm text-on-surface-variant">Số liệu chỉ để minh hoạ.</p>
              </div>

              <div className="flex w-full flex-col items-center justify-center rounded-2xl bg-surface-container-lowest p-6 shadow-sm lg:w-96">
                <div className="mb-2 flex w-full items-center justify-between border-b border-surface-container pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
                    <span className="text-label-sm text-on-surface">Bài thi mẫu</span>
                  </div>
                  <span className="text-label-sm font-bold text-primary">Điểm: 8.9</span>
                </div>

                <svg viewBox="0 0 240 240" className="my-2 h-56 w-56" role="img" aria-label="Biểu đồ minh hoạ điểm theo 4 tiêu chí">
                  <g className="fill-none stroke-surface-container-highest" strokeWidth="1.5">
                    <polygon points="120,30 210,120 120,210 30,120" />
                    <polygon points="120,60 180,120 120,180 60,120" strokeDasharray="3,3" />
                    <polygon points="120,90 150,120 120,150 90,120" />
                  </g>
                  <g className="stroke-outline-variant" strokeWidth="1">
                    <line x1="120" y1="30" x2="120" y2="210" />
                    <line x1="30" y1="120" x2="210" y2="120" />
                  </g>
                  <polygon
                    points="120,37 199,120 120,196 43,120"
                    className="fill-primary-container/25 stroke-primary"
                    strokeWidth="2.5"
                  />
                  <g className="fill-primary-container">
                    <circle cx="120" cy="37" r="4" />
                    <circle cx="199" cy="120" r="4" />
                    <circle cx="120" cy="196" r="4" />
                    <circle cx="43" cy="120" r="4" />
                  </g>
                </svg>

                <div className="flex w-full items-center justify-between pt-2 text-body-sm text-on-surface-variant">
                  <span>Thời lượng: 14 phút</span>
                  <span>Số câu hỏi: 5 câu</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

export default HomePage
