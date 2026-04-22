'use client'

import { useReducedMotion } from 'motion/react'
import { motionPresets } from './presets'

const reducedPreset = {
  initial: {},
  animate: {},
  transition: { duration: 0 },
} as const

export function useMotionPreset(preset: keyof typeof motionPresets) {
  const reduced = useReducedMotion()
  return reduced ? reducedPreset : motionPresets[preset]
}
