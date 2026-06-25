'use client'

import { useReducedMotion } from '@/components/motion/client-motion'
import { fadeUp, staggerChildren } from '@/lib/motion/presets'
import type { Variants } from '@/components/motion/client-motion'

export function useMotionPresets() {
  const reduceMotion = useReducedMotion()

  const fadeUpVariant: Variants = reduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.15 } },
      }
    : fadeUp

  const staggerVariant: Variants = reduceMotion
    ? { hidden: {}, visible: {} }
    : staggerChildren

  const listItemVariant: Variants = reduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.15 } },
      }
    : {
        hidden: { opacity: 0, y: 10 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] },
        },
      }

  return {
    reduceMotion: Boolean(reduceMotion),
    fadeUp: fadeUpVariant,
    staggerChildren: staggerVariant,
    listItem: listItemVariant,
  }
}
