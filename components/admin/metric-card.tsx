'use client'

import { motion } from 'motion/react'

import { IconLayoutDashboard, IconUsers, IconFolder } from '@tabler/icons-react'

const ICON_MAP = {
  dashboard: IconLayoutDashboard,
  users: IconUsers,
  folder: IconFolder,
}

export function MetricCard({
  label,
  value,
  detail,
  delay = 0,
  icon,
}: {
  label: string
  value: string
  detail?: string
  delay?: number
  icon?: keyof typeof ICON_MAP
}) {
  const Icon = icon ? ICON_MAP[icon] : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.23, 1, 0.32, 1] }}
      className="group relative overflow-hidden rounded-2xl bg-card p-5 ring-1 ring-border/40 transition-shadow duration-200 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
        {Icon && (
          <div className="rounded-lg bg-primary/5 p-1.5 text-primary/60 transition-colors group-hover:text-primary">
            <Icon className="size-4" />
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-3xl font-bold tracking-tighter text-foreground tabular-nums">
          {value}
        </p>
      </div>
      {detail ? (
        <div className="mt-3 border-t border-border/30 pt-3">
          <p className="text-xs leading-relaxed text-pretty text-muted-foreground">
            {detail}
          </p>
        </div>
      ) : null}
    </motion.div>
  )
}
