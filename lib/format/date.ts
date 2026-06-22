import { differenceInSeconds, format, formatDistanceToNow } from 'date-fns'

/**
 * Display-only date helpers built on date-fns. Do not use these inside Convex
 * queries: any wall-clock dependency breaks query caching/reactivity.
 */

function parse(value?: string | number | Date | null): Date | null {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateTime(value?: string | null): string {
  if (!value) return 'Not available'
  const date = parse(value)
  if (!date) return value
  return format(date, 'd MMM yyyy, h:mm a')
}

export function formatRelative(value?: string | null): string {
  if (!value) return 'Not available'
  const date = parse(value)
  if (!date) return value
  return formatDistanceToNow(date, { addSuffix: true })
}

export function formatDurationMinutes(
  startedAt?: string | null,
  endedAt?: string | null
): number | null {
  const start = parse(startedAt)
  const end = parse(endedAt)
  if (!start || !end) return null
  return Math.max(1, Math.round(differenceInSeconds(end, start) / 60))
}

/** Sort key helper; invalid/absent values sort last in descending order. */
export function timestampOf(value?: string | null): number {
  return parse(value)?.getTime() ?? 0
}
