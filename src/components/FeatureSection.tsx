import { Link } from 'react-router-dom'
import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { EASE_OUT, viewportOnce } from '../lib/motion'

function Badge({ x, y, label, color }: { x: number; y: number; label: string; color: string }) {
  return (
    <g>
      <rect x={x} y={y} width={44} height={30} rx={6} fill={color} />
      <text x={x + 22} y={y + 20} textAnchor="middle" fontFamily="Source Sans 3, sans-serif" fontSize={13} fontWeight={700} fill="#fff">
        {label}
      </text>
    </g>
  )
}

function DocIllustration({ variant }: { variant: number }) {
  return (
    <svg viewBox="0 0 520 420" className="h-auto w-full" aria-hidden>
      <rect x={90} y={40} width={230} height={230} rx={16} fill="#E0E7FF" transform="rotate(-110 205 155)" />
      <rect x={250} y={150} width={180} height={180} rx={16} fill="#F9FAFB" transform="rotate(65 340 240)" />
      {/* document */}
      <rect x={150} y={70} width={220} height={280} rx={6} fill="#fff" stroke="#E8E8E8" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={172} y={96 + i * 18} width={i === 4 ? 120 : 176} height={8} rx={4} fill="#E3E3E8" />
      ))}
      <rect x={172} y={200} width={176} height={80} rx={4} fill="#EEF1F5" />
      <circle cx={200} cy={226} r={11} fill="#D9D9DE" />
      <path d="M180 268 l30 -26 22 16 26 -30 30 40z" fill="#D9D9DE" />
      {[0, 1].map((i) => (
        <rect key={i} x={172} y={298 + i * 16} width={i === 1 ? 110 : 176} height={8} rx={4} fill="#E3E3E8" />
      ))}

      {variant === 0 && (
        <>
          <Badge x={395} y={90} label="DOC" color="#2B8FE3" />
          <path d="M372 110 q30 -18 24 -6" fill="none" stroke="#FF5400" strokeWidth={2.4} strokeLinecap="round" />
          <path d="M394 100 l4 6 -7 1z" fill="#FF5400" />
          <g transform="translate(150,330)" stroke="#0055FF" strokeWidth={2.4} fill="none" strokeLinecap="round">
            <g className="dt-scissor-lift">
              <circle cx={-6} cy={6} r={5} />
              <circle cx={6} cy={6} r={5} />
              <g className="dt-scissor-a">
                <path d="M3 2 L-10 -12" />
              </g>
              <g className="dt-scissor-b">
                <path d="M-3 2 L10 -12" />
              </g>
            </g>
          </g>
          <Badge x={380} y={280} label="PDF" color="#FF5400" />
          <Badge x={410} y={320} label="PPT" color="#FF8E00" />
          <Badge x={350} y={330} label="XLS" color="#00D267" />
        </>
      )}
      {variant === 1 && (
        <>
          <rect x={200} y={230} width={120} height={40} rx={4} fill="#fff" stroke="#0055FF" strokeWidth={1.4} />
          <path d="M212 258 q10 -16 20 0 t20 0 t20 0" fill="none" stroke="#1A1A1A" strokeWidth={2} strokeLinecap="round" />
          <Badge x={390} y={120} label="SIGN" color="#CA41FC" />
          <g transform="translate(360,300)" stroke="#00D267" strokeWidth={2.6} fill="none" strokeLinecap="round">
            <path d="M-10 0 l7 7 14 -14" />
          </g>
        </>
      )}
      {variant === 2 && (
        <>
          <Badge x={395} y={90} label="DOC" color="#2B8FE3" />
          <Badge x={380} y={280} label="PDF" color="#FF5400" />
          <Badge x={410} y={320} label="PPT" color="#FF8E00" />
          <Badge x={350} y={330} label="XLS" color="#00D267" />
          <path d="M372 110 q30 -18 24 -6" fill="none" stroke="#FF5400" strokeWidth={2.4} strokeLinecap="round" />
        </>
      )}
      {variant === 3 && (
        <>
          {[0, 1, 2].map((i) => (
            <rect key={i} x={380} y={100 + i * 60} width={70} height={48} rx={5} fill="#fff" stroke="#E8E8E8" />
          ))}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={390} y={110 + i * 60} width={50} height={5} rx={2.5} fill="#E3E3E8" />
              <rect x={390} y={120 + i * 60} width={36} height={5} rx={2.5} fill="#E3E3E8" />
            </g>
          ))}
          <g transform="translate(150,330)" stroke="#8B48FE" strokeWidth={2.4} fill="none" strokeLinecap="round">
            <rect x={-10} y={-10} width={9} height={9} rx={2} />
            <rect x={2} y={-10} width={9} height={9} rx={2} />
            <rect x={-10} y={2} width={9} height={9} rx={2} />
            <rect x={2} y={2} width={9} height={9} rx={2} />
          </g>
        </>
      )}
    </svg>
  )
}

export interface Feature {
  title: string
  body: string
  linkLabel: string
  linkTo: string
  variant: number
}

export default function FeatureSection({ feature, reverse }: { feature: Feature; reverse?: boolean }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const artY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [28, -28])

  return (
    <div ref={ref} className="container-x grid items-center gap-10 py-14 lg:grid-cols-2">
      <motion.div
        className={reverse ? 'lg:order-2' : ''}
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewportOnce}
        transition={{ duration: 0.65, ease: EASE_OUT }}
      >
        <h3 className="h-display text-4xl leading-tight lg:text-[44px]">{feature.title}</h3>
        <p className="mt-5 max-w-[480px] text-lg leading-relaxed text-ink-soft">{feature.body}</p>
        <Link to={feature.linkTo} className="dt-link-arrow mt-6 inline-flex items-center gap-1 text-base font-semibold text-brand hover:underline">
          {feature.linkLabel} <span aria-hidden>→</span>
        </Link>
      </motion.div>
      <motion.div
        style={{ y: artY }}
        className={`mx-auto w-full max-w-[500px] ${reverse ? 'lg:order-1' : ''}`}
        initial={{ opacity: 0, scale: 0.94, x: reverse ? 26 : -26 }}
        whileInView={{ opacity: 1, scale: 1, x: 0 }}
        viewport={viewportOnce}
        transition={{ duration: 0.8, ease: EASE_OUT }}
      >
        <DocIllustration variant={feature.variant} />
      </motion.div>
    </div>
  )
}

