import Link from 'next/link'
import { fetchQuery } from 'convex/nextjs'
import { IconUsers, IconFolder } from '@tabler/icons-react'

import { api } from '@/convex/_generated/api'
import { MetricCard } from '@/components/admin/metric-card'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'

export default async function AdminPage() {
  const token = await getServerConvexAuthToken()
  const [candidates, batches, dashboardSummary] =
    clientEnv.NEXT_PUBLIC_CONVEX_URL
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
          fetchQuery(
            api.admin.getDashboardSummary,
            {},
            { token: token ?? undefined }
          ).catch(() => null),
        ])
      : [[], [], null]

  const sessionsToday = candidates.filter((candidate) => {
    if (!candidate.startedAt) {
      return false
    }
    const started = new Date(candidate.startedAt)
    const now = new Date()
    return started.toDateString() === now.toDateString()
  }).length
  const reportsPending =
    dashboardSummary?.counts.pendingReviews ??
    candidates.filter((candidate) => candidate.reportStatus !== 'completed')
      .length
  const activeBatches =
    dashboardSummary?.counts.activeSessions ??
    batches.filter((batch) => batch.status === 'active').length

  return (
    <div className="flex w-full flex-col gap-10">
      <PageHeader
        eyebrow="Overview"
        title="Recruiter Operations Hub"
        description="Monitor interview flow health and jump directly to queue or screening operations."
      />

      <section className="grid gap-6 md:grid-cols-3">
        <MetricCard
          label="Sessions today"
          value={String(sessionsToday)}
          detail="Candidate interviews started today."
          delay={0.1}
          icon="dashboard"
        />
        <MetricCard
          label="Reports pending"
          value={String(reportsPending)}
          detail="Sessions waiting for completed assessment reports."
          delay={0.2}
          icon="users"
        />
        <MetricCard
          label="Active batches"
          value={String(activeBatches)}
          detail="Screening batches currently accepting attempts."
          delay={0.3}
          icon="folder"
        />
      </section>

      {dashboardSummary ? (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-5">
            <h3 className="font-semibold">Needs attention</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Manual review:{' '}
              {dashboardSummary.needsAttention.manualReviewCandidates.length}
            </p>
            <p className="text-sm text-muted-foreground">
              Invites expiring in 24h:{' '}
              {dashboardSummary.needsAttention.invitesExpiringSoon.length}
            </p>
            <p className="text-sm text-muted-foreground">
              Stale sessions:{' '}
              {dashboardSummary.needsAttention.staleSessions.length}
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <h3 className="font-semibold">Recent activity</h3>
            <div className="mt-2 space-y-2">
              {dashboardSummary.recentActivity.map((event) => (
                <p
                  key={`${event.id}`}
                  className="text-sm text-muted-foreground"
                >
                  {event.type}: {event.detail}
                </p>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-4 grid gap-6 md:grid-cols-2">
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-card p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] ring-1 ring-border/50 transition-all hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.15)]">
          <div className="relative z-10">
            <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <IconUsers className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-balance">
              Candidate Queue
            </h2>
            <p className="mt-3 max-w-sm text-base leading-relaxed text-pretty text-muted-foreground">
              Review recommendations, confidence scores, and detailed AI reports
              for completed interview sessions.
            </p>
          </div>
          <div className="relative z-10 mt-10">
            <Button
              className="rounded-xl px-6 transition-all active:scale-[0.96]"
              render={<Link href="/admin/candidates" />}
              nativeButton={false}
            >
              Open candidate queue
            </Button>
          </div>
        </div>

        <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-card p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] ring-1 ring-border/50 transition-all hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.15)]">
          <div className="relative z-10">
            <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <IconFolder className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-balance">
              Screening Batches
            </h2>
            <p className="mt-3 max-w-sm text-base leading-relaxed text-pretty text-muted-foreground">
              Create and manage invite-controlled candidate cohorts and track
              bulk interview completion progress.
            </p>
          </div>
          <div className="relative z-10 mt-10 flex flex-wrap gap-4">
            <Button
              variant="outline"
              className="rounded-xl px-6 ring-1 ring-border transition-all active:scale-[0.96]"
              render={<Link href="/admin/screenings" />}
              nativeButton={false}
            >
              Manage screenings
            </Button>
            <Button
              className="rounded-xl px-6 transition-all active:scale-[0.96]"
              render={<Link href="/admin/screenings/new" />}
              nativeButton={false}
            >
              Create batch
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
