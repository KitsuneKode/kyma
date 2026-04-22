import Link from 'next/link'
import { fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import { MetricCard } from '@/components/admin/metric-card'
import { PageHeader } from '@/components/admin/page-header'
import { AdminStatePanel } from '@/components/admin/admin-state-panel'
import { Button } from '@/components/ui/button'
import { CandidatesTable } from '@/components/recruiter/candidates-table'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'

export default async function AdminCandidatesPage() {
  const token = await getServerConvexAuthToken()
  const candidates = clientEnv.NEXT_PUBLIC_CONVEX_URL
    ? await fetchQuery(
        api.recruiter.listReviewCandidates,
        {},
        {
          token: token ?? undefined,
        }
      ).catch(() => [])
    : []

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
            render={<Link href="/admin" />}
          >
            Back to admin
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
        {candidates.length === 0 ? (
          <AdminStatePanel
            title="No interviews ready for review"
            description="Run a demo interview or create a screening batch to start filling the recruiter queue with evidence-backed reports."
            action={
              <Button
                nativeButton={false}
                render={<Link href="/admin/screenings/new" />}
              >
                Create screening batch
              </Button>
            }
          />
        ) : null}
      </section>
    </div>
  )
}
