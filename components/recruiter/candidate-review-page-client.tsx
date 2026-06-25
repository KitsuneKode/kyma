'use client'

import type { Preloaded } from 'convex/react'
import Link from 'next/link'
import { usePreloadedQuery } from 'convex/react'

import { api } from '@/convex/_generated/api'
import { StaticMetricCard } from '@/components/admin/metric-card-static'
import { PageHeader } from '@/components/admin/page-header'
import { RecruiterAccessState } from '@/components/recruiter/recruiter-access-state'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CandidateReviewQueue } from '@/components/recruiter/candidate-review-queue'
import type { ReviewCandidate } from '@/components/recruiter/candidate-review-queue'
import type { CandidateQueueFilters } from '@/lib/recruiter/candidate-queue-filters'

type QueueStats = {
  totalSessions: number
  reportsReady: number
  manualReview: number
  strongSignals: number
}

type CandidateReviewPageClientProps = {
  preloadedCandidates: Preloaded<
    typeof api.recruiter.candidates.listReviewCandidates
  >
  initialCandidates: ReviewCandidate[]
  filters: CandidateQueueFilters
  stats: QueueStats | null
  statsFailed: boolean
  statsErrorMessage?: string
}

export function CandidateReviewPageClient({
  preloadedCandidates,
  initialCandidates,
  filters,
  stats,
  statsFailed,
  statsErrorMessage,
}: CandidateReviewPageClientProps) {
  const candidatesResult = usePreloadedQuery(preloadedCandidates)
  const hydratedCandidates =
    candidatesResult.page.length > 0 ? candidatesResult.page : initialCandidates

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader
        eyebrow="Recruiter workspace"
        title="Candidate review queue"
        description="Triage completed interviews, confirm recommendation quality, and open full candidate reviews."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/recruiter" />}
          >
            Back to recruiter
          </Button>
        }
      />

      {statsFailed ? (
        <Alert variant="destructive">
          <AlertTitle>Queue stats unavailable</AlertTitle>
          <AlertDescription>
            {statsErrorMessage ??
              'Summary counts could not be loaded. The candidate table below is still available.'}
          </AlertDescription>
        </Alert>
      ) : (
        <section className="grid gap-4 md:grid-cols-4">
          <StaticMetricCard
            label="Sessions"
            value={String(stats?.totalSessions ?? 0)}
            detail="Total sessions captured so far."
          />
          <StaticMetricCard
            label="Reports Ready"
            value={String(stats?.reportsReady ?? 0)}
            detail="Completed assessment reports."
          />
          <StaticMetricCard
            label="Manual Review"
            value={String(stats?.manualReview ?? 0)}
            detail="Candidates needing a human call."
          />
          <StaticMetricCard
            label="Strong Signals"
            value={String(stats?.strongSignals ?? 0)}
            detail="Candidates currently standing out."
          />
        </section>
      )}

      <section className="space-y-4">
        <CandidateReviewQueue
          key={`${filters.status}-${filters.recommendation}`}
          initialCandidates={hydratedCandidates}
        />
      </section>
    </div>
  )
}

export function CandidateReviewAccessFallback({
  kind,
  message,
}: {
  kind: 'auth' | 'forbidden' | 'not_found' | 'unknown'
  message?: string
}) {
  return (
    <div className="flex w-full flex-col gap-8">
      <RecruiterAccessState
        kind={kind}
        context="candidates"
        message={message}
      />
    </div>
  )
}
