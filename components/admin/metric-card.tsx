'use client'

import { motion } from 'motion/react'
import { IconLayoutDashboard, IconUsers, IconFolder } from '@tabler/icons-react'

import { cn } from '@/lib/utils'

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
  emphasis = false,
}: {
  label: string
  value: string
  detail?: string
  delay?: number
  icon?: keyof typeof ICON_MAP
  emphasis?: boolean
}) {
  const Icon = icon ? ICON_MAP[icon] : null
  const isZero = value.trim() === '0'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.23, 1, 0.32, 1] }}
      className="metric-card group"
    >
      <div className="flex h-full flex-col gap-7">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            {label}
          </span>
          {Icon ? (
            <div className="flex size-8 items-center justify-center rounded-xl bg-foreground/[0.04] text-muted-foreground/70 ring-1 ring-border/40 transition-colors group-hover:text-foreground/80">
              <Icon className="size-4" />
            </div>
          ) : null}
        </div>

        <div className="mt-auto">
          <p
            className={cn(
              'metric-value',
              isZero
                ? 'text-muted-foreground/45'
                : emphasis
                  ? 'text-amber-600 dark:text-amber-400'
                  : undefined
            )}
          >
            {value}
          </p>
          {detail ? (
            <p className="mt-3 max-w-[14rem] text-xs leading-relaxed text-muted-foreground">
              {detail}
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}
