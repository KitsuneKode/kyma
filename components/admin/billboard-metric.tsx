'use client'

import { motion } from 'motion/react'
import {
  IconLayoutDashboard,
  IconUsers,
  IconFolder,
  IconTrendingUp,
} from '@tabler/icons-react'

const ICON_MAP = {
  dashboard: IconLayoutDashboard,
  users: IconUsers,
  folder: IconFolder,
}

function Sparkline({ color = 'var(--primary)' }: { color?: string }) {
  return (
    <div className="absolute inset-0 -z-10 opacity-10">
      <svg
        className="h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 40"
      >
        <motion.path
          d="M 0 35 Q 10 30 20 35 T 40 25 T 60 30 T 80 15 T 100 20"
          fill="none"
          stroke={color}
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  )
}

export function BillboardMetric({
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
      initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
      className="billboard-metric group"
    >
      <Sparkline color={icon === 'users' ? 'var(--primary)' : '#60a5fa'} />

      <div className="flex h-full flex-col justify-between gap-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">
              {label}
            </span>
            <IconTrendingUp className="size-3 animate-pulse text-primary/50" />
          </div>
          {Icon && (
            <div className="rounded-full bg-white/5 p-2 text-white/40 transition-colors group-hover:bg-white/10 group-hover:text-white">
              <Icon className="size-4" />
            </div>
          )}
        </div>

        <div>
          <p className="billboard-value">{value}</p>
          {detail ? (
            <p className="mt-2 max-w-[12rem] text-xs leading-relaxed font-medium text-white/30">
              {detail}
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}
