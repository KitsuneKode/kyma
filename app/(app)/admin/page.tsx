import Link from 'next/link'
import { fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import { MetricCard } from '@/components/admin/metric-card'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { publicEnv } from '@/lib/env/public'

export default async function AdminPage() {
  const token = await getServerConvexAuthToken()
  const [candidates, batches] = publicEnv.NEXT_PUBLIC_CONVEX_URL
    ? await Promise.all([
        fetchQuery(
          api.recruiter.listReviewCandidates,
          {},
          { token: token ?? undefined }
        ).catch(() => []),
        fetchQuery(
          api.admin.listScreeningBatches,
          {},
          { token: token ?? undefined }
        ).catch(() => []),
      ])
    : [[], []]

  const sessionsToday = candidates.filter((candidate) => {
    if (!candidate.startedAt) {
      return false
    }
    const started = new Date(candidate.startedAt)
    const now = new Date()
    return started.toDateString() === now.toDateString()
  }).length
  const reportsPending = candidates.filter(
    (candidate) => candidate.reportStatus !== 'completed'
  ).length
  const activeBatches = batches.filter(
    (batch) => batch.status === 'active'
  ).length

  return (
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <PageHeader
        eyebrow="Admin workspace"
        title="Recruiter operations hub"
        description="Monitor interview flow health and jump directly to queue or screening operations."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Sessions today"
          value={String(sessionsToday)}
          detail="Candidate interviews started today."
        />
        <MetricCard
          label="Reports pending"
          value={String(reportsPending)}
          detail="Sessions waiting for completed assessment reports."
        />
        <MetricCard
          label="Active batches"
          value={String(activeBatches)}
          detail="Screening batches currently accepting attempts."
        />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-balance">
            Candidate queue
          </h2>
          <p className="mt-2 text-sm text-pretty text-muted-foreground">
            Review recommendations, confidence, and report state for completed
            interview sessions.
          </p>
          <div className="mt-4">
            <Button
              nativeButton={false}
              render={<Link href="/admin/candidates" />}
            >
              Open candidate queue
            </Button>
          </div>
        </div>

        <div className="rounded-xl bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-balance">
            Screening batches
          </h2>
          <p className="mt-2 text-sm text-pretty text-muted-foreground">
            Create and manage invite-controlled candidate cohorts and track
            completion progress.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/admin/screenings" />}
            >
              Open screenings
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/admin/screenings/new" />}
            >
              Create screening batch
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
