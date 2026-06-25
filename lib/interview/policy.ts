import { type InterviewPolicy } from '@/lib/interview/types'

export const DEFAULT_INTERVIEW_POLICY: InterviewPolicy = {
  durationMode: 'timed',
  targetDurationMinutes: 18,
  allowsResume: true,
  maxAttempts: 1,
  rubricVersion: 'v1',
}

export function formatDurationPolicy(policy: InterviewPolicy) {
  if (policy.durationMode === 'flexible') {
    return 'Flexible duration'
  }

  if (!policy.targetDurationMinutes) {
    return 'Timed interview'
  }

  return `${policy.targetDurationMinutes} min target`
}

export function formatExpiryLabel(expiresAt?: string) {
  if (!expiresAt) {
    return 'No expiry set'
  }

  const parsed = Date.parse(expiresAt)

  if (Number.isNaN(parsed)) {
    return 'Expiry unavailable'
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

export function formatExpiryRelative(
  expiresAt: string | undefined,
  nowMs: number
) {
  if (!expiresAt) {
    return 'No expiry set'
  }

  const parsed = Date.parse(expiresAt)
  if (Number.isNaN(parsed)) {
    return 'Expiry unavailable'
  }

  const deltaMs = parsed - nowMs
  if (deltaMs <= 0) {
    return 'Expired'
  }

  const totalMinutes = Math.floor(deltaMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours >= 24) {
    return formatExpiryLabel(expiresAt)
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`
  }

  return `${Math.max(minutes, 1)}m remaining`
}
