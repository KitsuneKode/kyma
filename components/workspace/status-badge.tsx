import { cn } from '@/lib/utils'
import {
  formatRecommendationLabel,
  formatStatusLabel,
} from '@/lib/recruiter/format'

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase()
  if (
    normalized === 'no' ||
    normalized.includes('fail') ||
    normalized.includes('expired') ||
    normalized.includes('reject')
  ) {
    return 'bg-red-500/15 text-red-700 dark:text-red-300'
  }
  if (
    normalized === 'mixed' ||
    normalized.includes('pending') ||
    normalized.includes('processing') ||
    normalized.includes('manual_review') ||
    normalized.includes('interrupted') ||
    normalized.includes('hold')
  ) {
    return 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
  }
  if (normalized.includes('released') || normalized.includes('advance')) {
    return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
  }
  return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
}

function displayLabel(status: string) {
  if (['strong_yes', 'yes', 'mixed', 'no'].includes(status)) {
    return formatRecommendationLabel(status)
  }
  return formatStatusLabel(status)
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string
  label?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums',
        statusBadgeClass(status),
        className
      )}
    >
      {label ?? displayLabel(status)}
    </span>
  )
}
