import { Link } from 'react-router-dom'
import { ROLES } from '../constants/roles.js'
import { useAuth } from '../hooks/useAuth.js'
import { useLanguage } from '../hooks/useLanguage.js'
import Icon from './Icon.jsx'
import Logo from './Logo.jsx'

const CURRENT_YEAR = new Date().getFullYear()

function Footer() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const destination = user?.role === ROLES.STUDENT ? '/exam/join' : '/exam-sessions'
  const destinationLabel = user?.role === ROLES.STUDENT ? t('footer.joinExam') : t('footer.manageSessions')

  return (
    <footer className="w-full bg-inverse-surface text-inverse-on-surface">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-12 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          <section aria-labelledby="footer-brand-heading" className="sm:col-span-2 lg:col-span-1">
            <h2 id="footer-brand-heading" className="sr-only">
              AIVES
            </h2>
            <Logo textClassName="text-inverse-on-surface" />
            <p className="mt-5 max-w-sm text-body-sm leading-relaxed text-inverse-on-surface/75">
              {t('footer.description')}
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-inverse-on-surface/10 px-3 py-1.5 text-label-sm text-inverse-on-surface/85">
              <Icon name="school" className="text-base text-accent-cyan" />
              {t('footer.projectTag')}
            </p>
          </section>

          <nav aria-label={t('footer.explore')}>
            <h2 className="text-label-lg text-inverse-on-surface">{t('footer.explore')}</h2>
            <ul className="mt-5 space-y-3">
              <li>
                <a href="#tinh-nang" className="footer-link">
                  {t('footer.features')}
                </a>
              </li>
              <li>
                <a href="#quy-trinh" className="footer-link">
                  {t('footer.process')}
                </a>
              </li>
              <li>
                <a href="#cham-diem" className="footer-link">
                  {t('footer.grading')}
                </a>
              </li>
            </ul>
          </nav>

          <nav aria-label={t('footer.account')}>
            <h2 className="text-label-lg text-inverse-on-surface">{t('footer.account')}</h2>
            <ul className="mt-5 space-y-3">
              {user ? (
                <>
                  <li>
                    <Link to="/profile" className="footer-link">
                      {t('footer.profile')}
                    </Link>
                  </li>
                  <li>
                    <Link to={destination} className="footer-link">
                      {destinationLabel}
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="footer-link">
                      {t('footer.login')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="footer-link">
                      {t('footer.register')}
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>

          <section aria-labelledby="footer-about-heading">
            <h2 id="footer-about-heading" className="text-label-lg text-inverse-on-surface">
              {t('footer.about')}
            </h2>
            <p className="mt-5 text-body-sm leading-relaxed text-inverse-on-surface/75">
              {t('footer.aboutDescription')}
            </p>
            <p className="mt-4 flex items-start gap-2 text-body-sm leading-relaxed text-inverse-on-surface/75">
              <Icon name="verified_user" className="mt-0.5 shrink-0 text-base text-secondary-fixed" />
              {t('footer.note')}
            </p>
          </section>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-inverse-on-surface/15 pt-6 text-body-sm text-inverse-on-surface/65 sm:flex-row sm:items-center sm:justify-between">
          <p>{t('footer.copyright', { year: CURRENT_YEAR })}</p>
          <Link to="/" className="footer-link inline-flex items-center gap-1.5 self-start sm:self-auto">
            {t('common.home')}
            <Icon name="north" className="text-base" />
          </Link>
        </div>
      </div>
    </footer>
  )
}

export default Footer
