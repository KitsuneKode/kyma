'use client'

import { motion } from 'motion/react'
import type React from 'react'

export function MetricCard({
  label,
  value,
  detail,
  delay = 0,
  icon: Icon,
}: {
  label: string
  value: string
  detail?: string
  delay?: number
  icon?: React.ElementType<{ className?: string }>
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.23, 1, 0.32, 1] }}
      className="group relative overflow-hidden rounded-3xl bg-card p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] ring-1 ring-border/50 transition-all hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.15)]"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
        {Icon && (
          <div className="rounded-xl bg-primary/5 p-2 text-primary/70 transition-colors group-hover:text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-5xl font-bold tracking-tighter text-foreground tabular-nums">
          {value}
        </p>
      </div>
      {detail ? (
        <div className="mt-4 border-t border-border/40 pt-4">
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
            {detail}
          </p>
        </div>
      ) : null}
    </motion.div>
  )
}
