import type { Transition, Variants } from 'framer-motion'

/** Shared motion tokens so every animation on the site feels like one system. */
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1] // expo-out: fast start, soft landing
export const EASE_SOFT: [number, number, number, number] = [0.33, 1, 0.68, 1]
export const EASE_IN: [number, number, number, number] = [0.7, 0, 0.84, 0]

export const DUR = {
  micro: 0.16,
  fast: 0.26,
  base: 0.45,
  slow: 0.7,
} as const

export const springSoft: Transition = { type: 'spring', stiffness: 240, damping: 28, mass: 0.9 }
export const springPop: Transition = { type: 'spring', stiffness: 380, damping: 24 }

/* ---------------------------------- page --------------------------------- */

export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.994 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.44, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.996,
    transition: { duration: 0.16, ease: EASE_IN },
  },
}

/* -------------------------------- reveals -------------------------------- */

export const fadeUp = (delay = 0, distance = 22): Variants => ({
  hidden: { opacity: 0, y: distance },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT, delay } },
})

export const fadeIn = (delay = 0): Variants => ({
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: EASE_SOFT, delay } },
})

export const riseIn = (delay = 0): Variants => ({
  hidden: { opacity: 0, y: 26, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: EASE_OUT, delay },
  },
})

export const slideIn = (from: 'left' | 'right', delay = 0): Variants => ({
  hidden: { opacity: 0, x: from === 'left' ? -34 : 34 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE_OUT, delay } },
})

export const staggerParent = (staggerChildren = 0.07, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
})

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
}

/** Viewport config for "animate once when it scrolls into view" blocks. */
export const viewportOnce = { once: true, amount: 0.2 } as const
