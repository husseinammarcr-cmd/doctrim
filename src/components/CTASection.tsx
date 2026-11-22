import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Reveal } from './motion/Reveal'

export default function CTASection() {
  const reduce = useReducedMotion()
  return (
    <section className="relative overflow-hidden bg-white">
      {/* soft drifting glow behind the CTA — decorative only */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/10 blur-[120px]"
        animate={reduce ? undefined : { scale: [1, 1.12, 1], opacity: [0.55, 0.85, 0.55] }}
        transition={reduce ? undefined : { duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />
      <Reveal>
        <div className="container-x py-16 text-center">
          <h2 className="h-display text-4xl lg:text-[40px]">Free PDF Tools, No Strings Attached</h2>
          <p className="mx-auto mt-3 max-w-[600px] text-lg text-ink-soft">
            No account to create, no card to enter, no subscription to cancel. Pick a tool and finish your document in
            seconds.
          </p>
          <Link to="/pdf-tools" className="btn-primary btn-lg mt-7">
            Browse All Free Tools
          </Link>
        </div>
      </Reveal>
    </section>
  )
}
