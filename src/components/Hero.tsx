import { Link } from 'react-router-dom'
import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import HeroIllustration from './HeroIllustration'
import { WordReveal } from './motion/Reveal'
import { EASE_OUT, springSoft } from '../lib/motion'

export default function Hero() {
  const reduce = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] })
  const artY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 56])
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 26])

  const item = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
  }

  return (
    <section ref={sectionRef} className="overflow-hidden">
      <div className="container-x grid items-center gap-10 pt-12 pb-6 lg:grid-cols-[45fr_55fr] lg:pt-16 lg:pb-8">
        <motion.div
          style={{ y: copyY }}
          variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } } }}
          initial="hidden"
          animate="show"
        >
          <motion.span
            variants={item}
            className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3.5 py-1.5 text-[13px] font-bold text-brand"
          >
            100% free · no account needed
          </motion.span>
          <h1 className="h-display mt-4 text-5xl leading-[1.05] sm:text-6xl lg:text-[64px] font-black">
            <WordReveal text="We make PDF easy." delay={0.12} />
          </h1>
          <motion.p variants={item} className="mt-6 max-w-[520px] text-xl leading-relaxed text-ink-soft">
            All the tools you'll need to be more productive with documents — free, unlimited, and with no sign-up.
          </motion.p>
          <motion.div variants={item} className="mt-8 flex flex-wrap gap-4">
            <Link to="/pdf-tools" className="btn-primary btn-lg">
              Start Now — Free
            </Link>
            <Link to="/compress-pdf" className="btn-outline btn-lg">
              Compress a PDF
            </Link>
          </motion.div>
          <motion.p variants={item} className="mt-4 text-[14px] text-ink-muted">
            No login. No registration. No subscription. Just drop a file and go.
          </motion.p>
        </motion.div>

        <motion.div style={{ y: artY }} className="relative mx-auto w-full max-w-[560px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.16 }}
          >
            <motion.div
              animate={reduce ? undefined : { y: [0, -9, 0] }}
              transition={reduce ? undefined : { duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            >
              <HeroIllustration />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
