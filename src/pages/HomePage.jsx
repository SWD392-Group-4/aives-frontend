import { useRef } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer.jsx'
import Icon from '../components/Icon.jsx'
import Mascot from '../components/Mascot.jsx'
import Navbar from '../components/Navbar.jsx'
import { ROLES } from '../constants/roles.js'
import { useAuth } from '../hooks/useAuth.js'
import { useLanguage } from '../hooks/useLanguage.js'

/*
 * Phần chữ của trang nằm trong bản dịch (src/i18n/translations, nhóm `home`).
 * Các mảng dưới đây chỉ giữ icon và màu, xếp cùng thứ tự với mảng chữ tương ứng.
 */
const HERO_BADGE_STYLES = [
  { icon: 'auto_awesome', iconClass: 'text-accent-amber' },
  { icon: 'verified', iconClass: 'text-secondary-fixed' },
  { icon: 'mic', iconClass: 'text-accent-cyan' },
]

const FEATURE_STYLES = [
  { icon: 'record_voice_over', gradient: 'from-track-orange-from to-track-orange-to', glow: 'hover:shadow-track-orange-to/35' },
  { icon: 'menu_book', gradient: 'from-track-blue-from to-track-blue-to', glow: 'hover:shadow-track-blue-to/35' },
  { icon: 'psychology', gradient: 'from-track-green-from to-track-green-to', glow: 'hover:shadow-track-green-to/35' },
  { icon: 'fact_check', gradient: 'from-track-cyan-from to-track-cyan-to', glow: 'hover:shadow-track-cyan-to/35' },
  { icon: 'approval', gradient: 'from-track-indigo-from to-track-indigo-to', glow: 'hover:shadow-track-indigo-to/35' },
  { icon: 'analytics', gradient: 'from-track-amber-from to-track-amber-to', glow: 'hover:shadow-track-amber-to/35' },
]

const STEP_STYLES = [
  { icon: 'edit_note', noteIcon: 'check_circle', iconBox: 'bg-primary-fixed text-primary', accent: 'text-primary' },
  { icon: 'forum', noteIcon: 'mic', iconBox: 'bg-secondary-container text-secondary', accent: 'text-secondary' },
  { icon: 'verified_user', noteIcon: 'task_alt', iconBox: 'bg-tertiary-fixed text-tertiary', accent: 'text-tertiary' },
]

const SAMPLE_SCORES = [
  { value: '9.2 / 10', color: 'text-primary' },
  { value: '8.8 / 10', color: 'text-secondary' },
  { value: '8.5 / 10', color: 'text-tertiary-container' },
  { value: '9.0 / 10', color: 'text-primary' },
]

function HomePage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const railRef = useRef(null)

  const scrollRail = (direction) => {
    railRef.current?.scrollBy({ left: direction * 300, behavior: 'smooth' })
  }

  const badges = t('home.badges')
  const facts = t('home.facts')
  const features = t('home.features')
  const steps = t('home.steps')
  const criteria = t('home.gradingCriteria')

  return (
    <>
      <Navbar showHomeSections />

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
              {HERO_BADGE_STYLES.map((badge, index) => (
                <li
                  key={badge.icon}
                  className="inline-flex items-center gap-1.5 rounded-full bg-on-primary/15 px-3.5 py-1.5 text-label-sm shadow-sm backdrop-blur-md"
                >
                  <Icon name={badge.icon} filled className={`text-base ${badge.iconClass}`} />
                  {badges[index]}
                </li>
              ))}
            </ul>

            <h1 className="max-w-4xl text-display-hero-mobile text-balance drop-shadow-sm md:text-display-hero">
              {t('home.title')}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-body-md text-on-primary/85 md:text-body-lg">
              {t('home.subtitle')}
            </p>

            <div className="relative mt-10 flex items-center justify-center">
              <div
                aria-hidden="true"
                className="absolute inset-0 animate-pulse rounded-full bg-linear-to-tr from-accent-cyan/40 via-on-primary/30 to-accent-amber/30 blur-2xl"
              />
              <Mascot className="relative z-10 h-44 w-44 shadow-2xl sm:h-56 sm:w-56 md:h-64 md:w-64" />
            </div>

            {user ? (
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <p className="inline-flex items-center gap-2 rounded-full bg-on-primary/15 px-6 py-3 text-label-lg backdrop-blur-md">
                  <Icon name="waving_hand" filled className="text-xl text-accent-amber" />
                  {t('home.greeting', { name: user.fullName })}
                </p>
                <Link
                  to={user.role === ROLES.STUDENT ? '/exam/join' : '/exam-sessions'}
                  className="group inline-flex items-center justify-center rounded-full bg-surface-container-lowest px-7 py-3 text-label-lg text-primary-container shadow-xl shadow-on-primary/40 transition-all duration-200 hover:scale-105"
                >
                  {user.role === ROLES.STUDENT ? t('home.ctaJoinExam') : t('home.ctaManageSessions')}
                  <Icon name="arrow_forward" className="ml-2 text-xl transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            ) : (
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  to="/register"
                  className="group inline-flex items-center justify-center rounded-full bg-surface-container-lowest px-10 py-4 text-label-lg tracking-wide text-primary-container shadow-xl shadow-on-primary/40 transition-all duration-200 hover:scale-105"
                >
                  {t('home.ctaStart')}
                  <Icon name="arrow_forward" className="ml-2 text-xl transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-full bg-on-primary/10 px-7 py-4 text-label-md backdrop-blur-md transition-colors hover:bg-on-primary/20"
                >
                  <Icon name="login" className="mr-2 text-xl" />
                  {t('home.ctaHaveAccount')}
                </Link>
              </div>
            )}

            <dl className="mt-12 flex w-full max-w-4xl flex-wrap items-center justify-around gap-6 border-t border-on-primary/15 pt-8">
              {facts.map((fact) => (
                <div key={fact.value} className="flex items-center gap-3">
                  <dt className="order-2 text-left text-body-sm leading-tight text-on-primary/75">
                    {fact.lines[0]}
                    <br />
                    {fact.lines[1]}
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
                  {t('home.featuresBadge')}
                </div>
                <h2 className="text-headline-xl-mobile text-balance text-on-surface md:text-headline-xl">
                  {t('home.featuresTitle')}
                </h2>
              </div>
              <p className="max-w-md text-body-md text-on-surface-variant lg:pb-1">{t('home.featuresIntro')}</p>
            </div>

            <div className="relative w-full">
              <button
                type="button"
                onClick={() => scrollRail(-1)}
                aria-label={t('home.prevCard')}
                className="absolute top-1/2 -left-2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface-container-lowest shadow-lg transition hover:bg-surface-container-low sm:flex lg:-left-5"
              >
                <Icon name="chevron_left" className="text-2xl text-primary" />
              </button>
              <button
                type="button"
                onClick={() => scrollRail(1)}
                aria-label={t('home.nextCard')}
                className="absolute top-1/2 -right-2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface-container-lowest shadow-lg transition hover:bg-surface-container-low sm:flex lg:-right-5"
              >
                <Icon name="chevron_right" className="text-2xl text-primary" />
              </button>

              <ul
                ref={railRef}
                className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pt-2 pb-8 md:gap-5"
              >
                {FEATURE_STYLES.map((style, index) => (
                  <li
                    key={style.icon}
                    className={`flex min-h-[340px] w-[260px] flex-none snap-start flex-col justify-between rounded-3xl bg-linear-to-b p-6 text-on-primary transition-all duration-300 hover:-translate-y-2 hover:shadow-xl sm:w-[280px] sm:p-7 ${style.gradient} ${style.glow}`}
                  >
                    <div>
                      <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-2xl bg-on-primary/20 backdrop-blur-sm">
                        <Icon name={style.icon} className="text-2xl" />
                      </div>
                      <h3 className="mb-3 text-headline-md tracking-tight">{features[index].title}</h3>
                      <p className="text-body-sm leading-relaxed text-on-primary/90">{features[index].description}</p>
                    </div>
                    <div className="pt-6 text-label-sm tracking-wider text-on-primary/80 uppercase">
                      {features[index].tag}
                    </div>
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
                {t('home.stepsBadge')}
              </span>
              <h2 className="text-headline-xl-mobile text-balance text-on-surface md:text-headline-xl">
                {t('home.stepsTitle')}
              </h2>
              <p className="mt-3 text-body-md text-on-surface-variant">{t('home.stepsIntro')}</p>
            </div>

            <ol className="grid grid-cols-1 gap-6 text-left md:grid-cols-3 lg:gap-8">
              {STEP_STYLES.map((style, index) => (
                <li
                  key={style.icon}
                  className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-surface-container-lowest p-8 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div
                    aria-hidden="true"
                    className="absolute -right-4 -bottom-4 text-7xl font-extrabold text-surface-container-high opacity-40 select-none"
                  >
                    0{index + 1}
                  </div>
                  <div className="relative">
                    <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl ${style.iconBox}`}>
                      <Icon name={style.icon} className="text-2xl" />
                    </div>
                    <div className={`mb-1 text-label-sm font-bold tracking-wider uppercase ${style.accent}`}>
                      {t('home.stepLabel', { number: `0${index + 1}` })}
                    </div>
                    <h3 className="mb-3 text-headline-sm text-on-surface">{steps[index].title}</h3>
                    <p className="text-body-sm leading-relaxed text-on-surface-variant">{steps[index].description}</p>
                  </div>
                  <div className={`relative mt-6 flex items-center gap-1 pt-4 text-label-sm ${style.accent}`}>
                    {steps[index].note}
                    <Icon name={style.noteIcon} className="text-base" />
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
                  {t('home.stepsCta')}
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
                  {t('home.gradingBadge')}
                </span>
                <h2 className="mt-4 text-headline-lg text-on-surface">{t('home.gradingTitle')}</h2>
                <p className="mt-3 text-body-md text-on-surface-variant">{t('home.gradingIntro')}</p>
                <ul className="mt-6 grid grid-cols-2 gap-4">
                  {SAMPLE_SCORES.map((score, index) => (
                    <li key={criteria[index]} className="rounded-2xl bg-surface-container-lowest p-3.5 shadow-sm">
                      <div className={`text-headline-sm ${score.color}`}>{score.value}</div>
                      <div className="text-body-sm text-on-surface-variant">{criteria[index]}</div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-body-sm text-on-surface-variant">{t('home.gradingSampleNote')}</p>
              </div>

              <div className="flex w-full flex-col items-center justify-center rounded-2xl bg-surface-container-lowest p-6 shadow-sm lg:w-96">
                <div className="mb-2 flex w-full items-center justify-between border-b border-surface-container pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
                    <span className="text-label-sm text-on-surface">{t('home.sampleExam')}</span>
                  </div>
                  <span className="text-label-sm font-bold text-primary">{t('home.sampleScore', { score: '8.9' })}</span>
                </div>

                <svg viewBox="0 0 240 240" className="my-2 h-56 w-56" role="img" aria-label={t('home.sampleChartLabel')}>
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
                  <span>{t('home.sampleDuration')}</span>
                  <span>{t('home.sampleQuestions')}</span>
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
