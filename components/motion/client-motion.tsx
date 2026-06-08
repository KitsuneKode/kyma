'use client'

/**
 * Central motion entry for client components.
 * Import from here so bundlers can tree-shake unused motion features.
 */
export {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react'

export type { Variants } from 'motion/react'
