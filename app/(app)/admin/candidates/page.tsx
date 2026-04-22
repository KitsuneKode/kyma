import Link from 'next/link'
import { fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import { MetricCard } from '@/components/admin/metric-card'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { CandidatesTable } from '@/components/recruiter/candidates-table'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { publicEnv } from '@/lib/env/public'

export default async function AdminCandidatesPage() {
  const token = await getServerConvexAuthToken()
  const candidates = publicEnv.NEXT_PUBLIC_CONVEX_URL
    ? await fetchQuery(
        api.recruiter.listReviewCandidates,
        {},
        {
          token: token ?? undefined,
        }
      ).catch(() => [])
    : []

  return (
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-7xl flex-col gap-6 px-6 py-10">
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
          <div className="rounded-xl bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">
              No interviews are ready for review yet. Run a demo interview to
              create a candidate report.
            </p>
            <div className="mt-3">
              <Button
                nativeButton={false}
                render={<Link href="/admin/screenings/new" />}
              >
                Create screening batch
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}
