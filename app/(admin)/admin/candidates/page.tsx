import Link from 'next/link'
import { fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import { MetricCard } from '@/components/admin/metric-card'
import { PageHeader } from '@/components/admin/page-header'
import { WorkspaceEmptyState } from '@/components/workspace/empty-state'
import { Button } from '@/components/ui/button'
import { CandidatesTable } from '@/components/recruiter/candidates-table'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'
import { runConvexFetch } from '@/lib/convex/server-fetch'
import { signInPath } from '@/lib/auth/workspace-intent'

export default async function AdminCandidatesPage() {
  const token = await getServerConvexAuthToken()
  const candidatesResult = clientEnv.NEXT_PUBLIC_CONVEX_URL
    ? await runConvexFetch(() =>
        fetchQuery(
          api.recruiter.listReviewCandidates,
          {},
          {
            token: token ?? undefined,
          }
        )
      )
    : { ok: true as const, data: [] }

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

  const candidates = candidatesResult.data

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
          value={String(candidates.length)}
          detail="Total sessions captured so far."
        />
        <MetricCard
          label="Reports Ready"
          value={String(
            candidates.filter(
              (candidate) => candidate.reportStatus === 'completed'
            ).length
          )}
          detail="Completed assessment reports."
        />
        <MetricCard
          label="Manual Review"
          value={String(
            candidates.filter(
              (candidate) =>
                candidate.reportStatus === 'manual_review' ||
                candidate.latestDecision === 'manual_review'
            ).length
          )}
          detail="Candidates needing a human call."
        />
        <MetricCard
          label="Strong Signals"
          value={String(
            candidates.filter(
              (candidate) => candidate.recommendation === 'strong_yes'
            ).length
          )}
          detail="Candidates currently standing out."
        />
      </section>

      <section className="space-y-4">
        <CandidatesTable data={candidates} />
      </section>
    </div>
  )
}
