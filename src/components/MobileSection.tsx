import { motion, useReducedMotion } from 'framer-motion'
import { EASE_OUT, viewportOnce } from '../lib/motion'

function StoreButton({ store }: { store: 'google' | 'apple' }) {
  return (
    <div
      aria-disabled="true"
      title="Coming soon"
      className="flex cursor-not-allowed select-none items-center gap-3 rounded-lg bg-ink/55 px-4 py-2.5 text-white"
    >
      {store === 'google' ? (
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden className="opacity-75">
          <path fill="#00D267" d="M3.6 1.8 13.5 12 3.6 22.2c-.4-.3-.6-.8-.6-1.4V3.2c0-.6.2-1.1.6-1.4z" />
          <path fill="#FFD200" d="M17.4 8.1 13.5 12l3.9 3.9 3.2-1.8c1-.6 1-1.6 0-2.2l-3.2-1.8z" />
          <path fill="#FF5400" d="M3.6 1.8c.5-.4 1.2-.4 1.9 0l11.9 6.3-3.9 3.9L3.6 1.8z" />
          <path fill="#00C0FF" d="M13.5 12l3.9 3.9L5.5 22.2c-.7.4-1.4.4-1.9 0L13.5 12z" />
        </svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden className="opacity-75">
          <path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9-.7 0-1.9-.9-3.1-.8-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.4-1-2.3-3.6zM14.2 5.6c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.8 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.8-1.3z" />
        </svg>
      )}
      <span className="text-left leading-tight">
        <span className="block text-[10px] uppercase opacity-70">Coming soon to</span>
        <span className="block text-[15px] font-semibold">{store === 'google' ? 'Google Play' : 'App Store'}</span>
      </span>
    </div>
  )
}

function DevicesIllustration() {
  return (
    <svg viewBox="0 0 560 420" className="h-auto w-full" aria-hidden>
      {/* desktop */}
      <rect x={40} y={40} width={420} height={280} rx={10} fill="#fff" stroke="#E8E8E8" />
      <rect x={40} y={40} width={420} height={30} rx={10} fill="#FAFAFA" />
      <circle cx={58} cy={55} r={4} fill="#FF5400" /><circle cx={72} cy={55} r={4} fill="#FFD200" /><circle cx={86} cy={55} r={4} fill="#00D267" />
      {/* sidebar */}
      <rect x={40} y={70} width={110} height={250} fill="#F7F8FA" />
      {['Dashboard', 'Tools', 'All Documents'].map((t, i) => (
        <g key={t}>
          <rect x={54} y={92 + i * 34} width={12} height={12} rx={3} fill={i === 2 ? '#0055FF' : '#D9D9DE'} />
          <rect x={74} y={95 + i * 34} width={60} height={7} rx={3.5} fill={i === 2 ? '#0055FF' : '#D9D9DE'} opacity={i === 2 ? 0.8 : 1} />
        </g>
      ))}
      {/* file rows */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={170} y={92 + i * 52} width={34} height={40} rx={4} fill="#FFE9E0" />
          <text x={187} y={117 + i * 52} textAnchor="middle" fontFamily="Source Sans 3" fontSize={9} fontWeight={700} fill="#FF5400">PDF</text>
          <rect x={216} y={98 + i * 52} width={180} height={8} rx={4} fill="#E3E3E8" />
          <rect x={216} y={114 + i * 52} width={110} height={7} rx={3.5} fill="#EFEFF2" />
        </g>
      ))}
      {/* phone */}
      <rect x={360} y={130} width={150} height={270} rx={20} fill="#1A1A1A" />
      <rect x={368} y={142} width={134} height={246} rx={12} fill="#fff" />
      <rect x={400} y={148} width={70} height={6} rx={3} fill="#E3E3E8" />
      <text x={380} y={178} fontFamily="Source Sans 3" fontSize={14} fontWeight={700} fill="#1A1A1A">Files</text>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={380} y={192 + i * 46} width={26} height={32} rx={4} fill="#FFE9E0" />
          <rect x={414} y={198 + i * 46} width={76} height={7} rx={3.5} fill="#E3E3E8" />
          <rect x={414} y={210 + i * 46} width={50} height={6} rx={3} fill="#EFEFF2" />
        </g>
      ))}
      {/* floating OS icons */}
      <circle cx={330} cy={110} r={20} fill="#fff" stroke="#E8E8E8" />
      <circle cx={330} cy={110} r={7} fill="#1A1A1A" />
      <circle cx={520} cy={90} r={20} fill="#fff" stroke="#E8E8E8" />
      <rect x={512} y={82} width={16} height={16} fill="#00C0FF" />
      <circle cx={300} cy={360} r={20} fill="#fff" stroke="#E8E8E8" />
      <path d="M292 366 a8 8 0 0 1 16 0z" fill="#00D267" />
    </svg>
  )
}

export default function MobileSection() {
  const reduce = useReducedMotion()
  return (
    <section id="mobile" className="bg-brand-lighter">
      <div className="container-x grid items-center gap-10 py-16 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.65, ease: EASE_OUT }}
        >
          <h2 className="h-display text-4xl lg:text-[40px]">Get It on Mobile</h2>
          <p className="mt-4 max-w-[460px] text-lg leading-relaxed text-ink-soft">
            Create PDF scans, organize documents, and share files from all your connected devices with the DocTrim Mobile App—wherever you are.
          </p>
          <div className="mt-7 flex flex-wrap gap-4">
            <StoreButton store="google" />
            <StoreButton store="apple" />
          </div>
          <p className="mt-3 text-[13px] text-ink-muted">
            In development — the apps are not available yet. Every tool works on doctrim.com today.
          </p>
        </motion.div>
        <motion.div
          className="mx-auto w-full max-w-[520px]"
          initial={{ opacity: 0, scale: 0.94, y: 22 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.08 }}
        >
          <motion.div
            animate={reduce ? undefined : { y: [0, -8, 0] }}
            transition={reduce ? undefined : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <DevicesIllustration />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
