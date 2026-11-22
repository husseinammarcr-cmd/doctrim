import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { pageVariants } from '../../lib/motion'

/** Scroll reset / hash jump, run once the new page has actually mounted. */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

/**
 * Cross-page motion: the old page fades away, then the new one rises in.
 * `mode="wait"` means the two never overlap, so long pages never jump.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="hidden"
        animate="show"
        exit="exit"
        style={{ willChange: 'transform, opacity' }}
      >
        <ScrollToTop />
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
