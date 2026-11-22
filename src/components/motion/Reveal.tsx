import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { fadeUp, staggerItem, staggerParent, viewportOnce } from '../../lib/motion'

/**
 * Scroll-in reveal. Fires once, slightly before the block is centred,
 * so sections feel alive without the page ever feeling "animated".
 */
export function Reveal({
  children,
  delay = 0,
  distance = 22,
  className,
  as = 'div',
}: {
  children: ReactNode
  delay?: number
  distance?: number
  className?: string
  as?: 'div' | 'section' | 'li'
}) {
  const Comp = motion[as] as typeof motion.div
  return (
    <Comp
      className={className}
      variants={fadeUp(delay, distance)}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
    >
      {children}
    </Comp>
  )
}

/** Parent for a list/grid: children using <StaggerItem> rise in sequence. */
export function StaggerGroup({
  children,
  className,
  stagger = 0.07,
  delay = 0,
  amount = 0.18,
}: {
  children: ReactNode
  className?: string
  stagger?: number
  delay?: number
  amount?: number
}) {
  return (
    <motion.div
      className={className}
      variants={staggerParent(stagger, delay)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  )
}

/**
 * Masked word-by-word reveal for headings. Each word sits in a clipped box
 * and slides up from below — the classic editorial entrance.
 */
export function WordReveal({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.055,
}: {
  text: string
  className?: string
  wordClassName?: string
  delay?: number
  stagger?: number
}) {
  return (
    <motion.span
      className={className}
      aria-label={text}
      variants={staggerParent(stagger, delay)}
      initial="hidden"
      animate="show"
    >
      {text.split(' ').map((word, i) => (
        <span
          key={`${word}-${i}`}
          aria-hidden
          className="inline-block overflow-hidden align-bottom"
          style={{ paddingBottom: '0.14em', marginBottom: '-0.14em' }}
        >
          <motion.span
            className={`inline-block ${wordClassName ?? ''}`}
            variants={{
              hidden: { y: '115%', opacity: 0 },
              show: { y: '0%', opacity: 1, transition: { duration: 0.72, ease: [0.16, 1, 0.3, 1] } },
            }}
          >
            {word}
          </motion.span>
          {i < text.split(' ').length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </motion.span>
  )
}
