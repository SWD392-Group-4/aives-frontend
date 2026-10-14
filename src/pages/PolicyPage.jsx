import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer.jsx'
import Icon from '../components/Icon.jsx'
import Navbar from '../components/Navbar.jsx'
import { useLanguage } from '../hooks/useLanguage.js'

function PolicyPage({ type }) {
  const { t } = useLanguage()
  const policy = t(`policies.${type}`)
  const otherPolicy = type === 'privacy' ? 'terms' : 'privacy'
  const otherPath = type === 'privacy' ? '/terms-of-service' : '/privacy-policy'

  useEffect(() => {
    document.title = t('policies.pageTitle', { title: policy.title })
    return () => {
      document.title = t('app.title')
    }
  }, [policy.title, t])

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-28 pb-16 sm:px-6 lg:px-8">
        <header className="mb-10">
          <Link to="/" className="inline-flex items-center gap-2 text-label-sm text-primary hover:underline">
            <Icon name="arrow_back" className="text-base" />
            {t('common.home')}
          </Link>
          <div className="mt-7 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
              <Icon name={type === 'privacy' ? 'policy' : 'gavel'} className="text-2xl" />
            </div>
            <div>
              <p className="text-label-sm font-bold tracking-wider text-primary uppercase">AIVES</p>
              <h1 className="mt-1 text-headline-xl-mobile text-on-surface md:text-headline-xl">{policy.title}</h1>
              <p className="mt-3 max-w-3xl text-body-md leading-relaxed text-on-surface-variant">{policy.intro}</p>
            </div>
          </div>
        </header>

        <aside className="mb-8 flex items-start gap-3 rounded-2xl border border-tertiary/20 bg-tertiary-fixed/40 p-4 text-body-sm leading-relaxed text-on-surface">
          <Icon name="info" className="mt-0.5 shrink-0 text-xl text-tertiary" />
          <p>{t('policies.draftNotice')}</p>
        </aside>

        <div className="space-y-5">
          {policy.sections.map((section, index) => (
            <section
              key={section.title}
              id={`policy-section-${index + 1}`}
              className="scroll-mt-24 rounded-3xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm sm:p-7"
            >
              <h2 className="text-headline-sm text-on-surface">{section.title}</h2>
              <div className="mt-4 space-y-3 text-body-md leading-relaxed text-on-surface-variant">
                {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && (
                  <ul className="list-disc space-y-2 pl-6 marker:text-primary">
                    {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 rounded-3xl bg-surface-container p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <p className="text-body-sm text-on-surface-variant">{t('policies.moreInfo')}</p>
          <Link
            to={otherPath}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-label-md text-on-primary transition-colors hover:bg-surface-tint"
          >
            {t(`policies.${otherPolicy}.title`)}
            <Icon name="arrow_forward" className="text-lg" />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default PolicyPage
