'use client'

import { motion } from 'motion/react'

import { StaticMetricCard } from '@/components/admin/metric-card-static'

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
  icon?: 'dashboard' | 'users' | 'folder'
  emphasis?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.23, 1, 0.32, 1] }}
    >
      <StaticMetricCard
        label={label}
        value={value}
        detail={detail}
        icon={icon}
        emphasis={emphasis}
      />
    </motion.div>
  )
}
