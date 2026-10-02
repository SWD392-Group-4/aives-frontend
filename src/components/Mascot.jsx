import mascotImg from '../assets/mascot.webp'

/**
 * Linh vật robot AIVES trong khung tròn.
 * Kích thước truyền qua className, ví dụ: <Mascot className="h-56 w-56" />
 */
function Mascot({ className = '', alt = 'Linh vật robot AIVES' }) {
  return (
    <div
      className={`overflow-hidden rounded-full bg-mascot-backdrop ring-4 ring-on-primary/40 ${className}`}
    >
      <img
        src={mascotImg}
        alt={alt}
        width="560"
        height="560"
        className="h-full w-full scale-110 object-cover"
      />
    </div>
  )
}

export default Mascot
