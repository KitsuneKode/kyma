'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { IconArrowLeft } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { ReviewActions } from '@/components/recruiter/review-actions'
import { StatusBadge } from '@/components/workspace/status-badge'
import {
  formatConfidenceLabel,
  formatDateTime,
  formatRecommendationLabel,
  formatStatusLabel,
} from '@/lib/recruiter/format'
import { formatDurationMinutes } from '@/lib/format/date'
import { formatScoringSourceLabel } from '@/lib/ui/score-format'
import { cn } from '@/lib/utils'

type MetricPill = { label: string; value: string }

function formatSessionDuration(
  startedAt?: string | null,
  endedAt?: string | null
) {
  if (!startedAt) return 'Session timing not available'

  const startLabel = formatDateTime(startedAt)
  const endLabel = endedAt ? formatDateTime(endedAt) : 'In progress'

  if (!endedAt) {
    return `Started ${startLabel} · ${endLabel}`
  }

  const durationMin = formatDurationMinutes(startedAt, endedAt)

  return durationMin
    ? `Started ${startLabel} · Ended ${endLabel} · ${durationMin} min`
    : `Started ${startLabel} · Ended ${endLabel}`
}

export function ReviewCommandHeader({
  candidateName,
  templateName,
  templateRole,
  recommendation,
  confidence,
  reportStatus,
  sessionState,
  reportId,
  sessionId,
  metrics,
  backHref,
  readOnly = false,
  released = false,
  startedAt,
  endedAt,
  hardGateTriggered = false,
  scoringSource,
  scoringModelId,
  className,
}: {
  candidateName?: string
  templateName?: string
  templateRole?: string
  recommendation?: string | null
  confidence?: string | null
  reportStatus?: string | null
  sessionState?: string | null
  reportId?: string
  sessionId: string
  metrics?: MetricPill[]
  backHref?: string
  readOnly?: boolean
  released?: boolean
  startedAt?: string | null
  endedAt?: string | null
  hardGateTriggered?: boolean
  scoringSource?: 'llm' | 'deterministic' | null
  scoringModelId?: string | null
  className?: string
}) {
  const eyebrow = [templateName, templateRole].filter(Boolean).join(' · ')

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      style={{ ['--review-header-height' as string]: '5.5rem' }}
      className={cn(
        'sticky top-0 z-20 rounded-3xl bg-card/95 px-5 py-4 shadow-[var(--shadow-md)] ring-1 ring-border/50 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {backHref ? (
              <Button
                nativeButton={false}
                variant="ghost"
                size="icon-sm"
                render={<Link href={backHref} />}
                className="mt-0.5 shrink-0 active:scale-[0.96]"
              >
                <IconArrowLeft className="size-4" />
              </Button>
            ) : null}
            <div className="min-w-0">
              {eyebrow ? (
                <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {eyebrow}
                </p>
              ) : null}
              {candidateName ? (
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-balance">
                  {candidateName}
                </h1>
              ) : null}
              <p className="mt-1 text-sm text-muted-foreground">
                {formatSessionDuration(startedAt, endedAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {readOnly ? (
              <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                Read-only preview
              </span>
            ) : (
              <ReviewActions
                reportId={reportId}
                sessionId={sessionId}
                released={released}
                compact
              />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={recommendation ?? 'pending'}
              label={formatRecommendationLabel(recommendation)}
            />
            <StatusBadge
              status={confidence ?? 'pending'}
              label={`${formatConfidenceLabel(confidence)} confidence`}
            />
            <StatusBadge
              status={reportStatus ?? 'pending'}
              label={formatStatusLabel(reportStatus ?? 'pending')}
            />
            <StatusBadge
              status={sessionState ?? 'pending'}
              label={formatStatusLabel(sessionState ?? 'unknown')}
            />
            <StatusBadge
              status={released ? 'released' : 'pending'}
              label={released ? 'Released' : 'Not released'}
            />
            {hardGateTriggered ? (
              <StatusBadge status="failed" label="Hard gate triggered" />
            ) : null}
            {scoringSource ? (
              <StatusBadge
                status={scoringSource === 'llm' ? 'completed' : 'manual_review'}
                label={formatScoringSourceLabel(scoringSource, scoringModelId)}
              />
            ) : null}
          </div>

          {metrics?.length ? (
            <div className="hidden items-center gap-2 md:flex">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl bg-muted/40 px-3 py-1.5 text-center ring-1 ring-border/40"
                >
                  <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                    {metric.label}
                  </p>
                  <p className="font-mono text-sm font-semibold tabular-nums">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </motion.header>
  )
}

/** @deprecated Use ReviewCommandHeader */
export const DecisionBar = ReviewCommandHeader
