'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { IconArrowLeft } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { ReviewActions } from '@/components/recruiter/review-actions'
import {
  formatConfidenceLabel,
  formatRecommendationLabel,
} from '@/lib/recruiter/format'

type MetricPill = { label: string; value: string }

export function DecisionBar({
  candidateName,
  recommendation,
  confidence,
  reportId,
  sessionId,
  metrics,
  backHref,
}: {
  candidateName?: string
  recommendation?: string | null
  confidence?: string | null
  reportId?: string
  sessionId: string
  metrics?: MetricPill[]
  backHref?: string
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className="sticky top-0 z-20 rounded-2xl bg-card/95 px-5 py-4 shadow-md ring-1 ring-border/40 backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {backHref ? (
            <Button
              nativeButton={false}
              variant="ghost"
              size="icon-sm"
              render={<Link href={backHref} />}
            >
              <IconArrowLeft className="size-4" />
            </Button>
          ) : null}
          <div>
            {candidateName ? (
              <h1 className="text-lg font-semibold tracking-tight">
                {candidateName}
              </h1>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {formatRecommendationLabel(recommendation)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatConfidenceLabel(confidence)} confidence
              </span>
            </div>
          </div>
        </div>

        {metrics?.length ? (
          <div className="hidden items-center gap-3 lg:flex">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-lg bg-muted/40 px-3 py-1.5 text-center"
              >
                <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                  {m.label}
                </p>
                <p className="text-sm font-semibold tabular-nums">{m.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        <ReviewActions reportId={reportId} sessionId={sessionId} compact />
      </div>
    </motion.section>
  )
}
