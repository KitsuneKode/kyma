'use client'

import type { ReactNode } from 'react'

import { motion } from '@/components/motion/client-motion'
import { useMotionPresets } from '@/lib/motion/use-motion-presets'

type TimelineSection = {
  key: string
  markerClassName: string
  title: string
  titleClassName?: string
  children: ReactNode
}

export function CandidatePortalTimeline({
  sections,
}: {
  sections: TimelineSection[]
}) {
  const { staggerChildren, listItem, reduceMotion } = useMotionPresets()

  return (
    <motion.div
      className="relative space-y-16 before:absolute before:inset-y-0 before:left-[19px] before:w-[2px] before:bg-border/30"
      variants={staggerChildren}
      initial="hidden"
      animate="visible"
    >
      {sections.map((section) => (
        <motion.section
          key={section.key}
          className="relative"
          variants={listItem}
        >
          <div className="absolute top-1 left-0 flex size-10 items-center justify-center rounded-full bg-background ring-4 ring-background">
            <div className={section.markerClassName} />
          </div>
          <div className="pl-16">
            <h2
              className={
                section.titleClassName ??
                'text-xs font-bold tracking-widest text-muted-foreground uppercase'
              }
            >
              {section.title}
            </h2>
            <motion.div
              className="mt-6 flex flex-col gap-4"
              variants={staggerChildren}
              initial={reduceMotion ? false : 'hidden'}
              animate="visible"
            >
              {section.children}
            </motion.div>
          </div>
        </motion.section>
      ))}
    </motion.div>
  )
}
