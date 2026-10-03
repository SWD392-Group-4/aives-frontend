import mascotImg from '../assets/mascot.webp'
import { useLanguage } from '../hooks/useLanguage.js'

/**
 * Linh vật robot AIVES trong khung tròn.
 * Kích thước truyền qua className, ví dụ: <Mascot className="h-56 w-56" />
 */
function Mascot({ className = '' }) {
  const { t } = useLanguage()

  return (
    <div
      className={`overflow-hidden rounded-full bg-mascot-backdrop ring-4 ring-on-primary/40 ${className}`}
    >
      <img
        src={mascotImg}
        alt={t('brand.mascotAlt')}
        width="560"
        height="560"
        className="h-full w-full scale-110 object-cover"
      />
    </div>
  )
}

export default Mascot
