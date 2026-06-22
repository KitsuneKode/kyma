import Link from 'next/link'

import { api } from '@/convex/_generated/api'
import { MetricCard } from '@/components/admin/metric-card'
import { PageHeader } from '@/components/admin/page-header'
import { WorkspaceEmptyState } from '@/components/workspace/empty-state'
import { Button } from '@/components/ui/button'
import { CandidateReviewQueue } from '@/components/recruiter/candidate-review-queue'
import { serverConvexQuery } from '@/lib/convex/server-query'
import { signInPath } from '@/lib/auth/workspace-intent'

const QUEUE_PAGE_SIZE = 25

export default async function AdminCandidatesPage() {
  const [candidatesResult, statsResult] = await Promise.all([
    serverConvexQuery(api.recruiter.candidates.listReviewCandidates, {
      paginationOpts: { numItems: QUEUE_PAGE_SIZE, cursor: null },
    }),
    serverConvexQuery(api.recruiter.candidates.getCandidateQueueStats, {}),
  ])

  if (!candidatesResult.ok) {
    return (
      <div className="flex w-full flex-col gap-8">
        <WorkspaceEmptyState
          eyebrow="Recruiter workspace"
          title={
            candidatesResult.kind === 'auth'
              ? 'Sign in required'
              : 'Unable to load candidates'
          }
          description={
            candidatesResult.message ??
            'Your session may have expired or your organization access changed.'
          }
          action={
            candidatesResult.kind === 'auth' ? (
              <Button
                nativeButton={false}
                render={<Link href={signInPath('recruiter')} />}
              >
                Sign in again
              </Button>
            ) : (
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href="/recruiter" />}
              >
                Back to recruiter
              </Button>
            )
          }
        />
      </div>
    )
  }

  const initialCandidates = candidatesResult.data.page
  const stats = statsResult.ok ? statsResult.data : null

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

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Sessions"
          value={String(stats?.totalSessions ?? 0)}
          detail="Total sessions captured so far."
        />
        <MetricCard
          label="Reports Ready"
          value={String(stats?.reportsReady ?? 0)}
          detail="Completed assessment reports."
        />
        <MetricCard
          label="Manual Review"
          value={String(stats?.manualReview ?? 0)}
          detail="Candidates needing a human call."
        />
        <MetricCard
          label="Strong Signals"
          value={String(stats?.strongSignals ?? 0)}
          detail="Candidates currently standing out."
        />
      </section>

      <section className="space-y-4">
        <CandidateReviewQueue initialCandidates={initialCandidates} />
      </section>
    </div>
  )
}
