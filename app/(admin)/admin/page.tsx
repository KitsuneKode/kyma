import Link from 'next/link'
import { fetchQuery } from 'convex/nextjs'
import {
  IconUsers,
  IconFolder,
  IconAlertCircle,
  IconClock,
  IconEye,
} from '@tabler/icons-react'

import { api } from '@/convex/_generated/api'
import { MetricCard } from '@/components/admin/metric-card'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'
import { formatStatusLabel, formatDateTime } from '@/lib/recruiter/format'

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
    if (!candidate.startedAt) return false
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
  const pendingReviews = candidates.filter(
    (c) =>
      c.reportStatus === 'manual_review' || c.latestDecision === 'manual_review'
  ).length

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader
        eyebrow="Overview"
        title="Recruiter Operations Hub"
        description="Monitor interview flow health and jump directly to queue or screening operations."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Sessions today"
          value={String(sessionsToday)}
          detail="Candidate interviews started today."
          delay={0.05}
          icon="dashboard"
        />
        <MetricCard
          label="Reports pending"
          value={String(reportsPending)}
          detail="Sessions awaiting assessment reports."
          delay={0.1}
          icon="users"
        />
        <MetricCard
          label="Active batches"
          value={String(activeBatches)}
          detail="Screening batches accepting attempts."
          delay={0.15}
          icon="folder"
        />
        <MetricCard
          label="Pending reviews"
          value={String(pendingReviews)}
          detail="Candidates needing a human decision."
          delay={0.2}
          icon="users"
        />
      </section>

      {dashboardSummary ? (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-card p-5 ring-1 ring-border/40">
            <div className="flex items-center gap-2">
              <IconAlertCircle className="size-4 text-amber-400" />
              <h3 className="text-sm font-semibold">Needs attention</h3>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <NeedsAttentionRow
                icon={<IconEye className="size-3.5 text-muted-foreground" />}
                label="Manual review"
                count={
                  dashboardSummary.needsAttention.manualReviewCandidates.length
                }
              />
              <NeedsAttentionRow
                icon={<IconClock className="size-3.5 text-muted-foreground" />}
                label="Invites expiring in 24h"
                count={
                  dashboardSummary.needsAttention.invitesExpiringSoon.length
                }
              />
              <NeedsAttentionRow
                icon={<IconClock className="size-3.5 text-muted-foreground" />}
                label="Stale sessions"
                count={dashboardSummary.needsAttention.staleSessions.length}
              />
            </div>
          </div>
          <div className="rounded-2xl bg-card p-5 ring-1 ring-border/40">
            <h3 className="text-sm font-semibold">Recent activity</h3>
            <div className="mt-3 flex flex-col gap-2">
              {dashboardSummary.recentActivity.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="flex items-baseline justify-between gap-3 border-b border-border/20 pb-2 last:border-0"
                >
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {formatStatusLabel(event.type)}
                    </span>{' '}
                    {event.detail}
                  </p>
                  {event.createdAt ? (
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground/60 tabular-nums">
                      {formatDateTime(event.createdAt)}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-card p-6 ring-1 ring-border/40 transition-shadow duration-200 hover:shadow-md">
          <div className="relative z-10">
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <IconUsers className="size-5" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-balance">
              Candidate Queue
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-pretty text-muted-foreground">
              Review recommendations, confidence scores, and detailed AI reports
              for completed interview sessions.
            </p>
          </div>
          <div className="relative z-10 mt-6">
            <Button
              className="rounded-xl px-5"
              render={<Link href="/admin/candidates" />}
              nativeButton={false}
            >
              Open candidate queue
            </Button>
          </div>
        </div>

        <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-card p-6 ring-1 ring-border/40 transition-shadow duration-200 hover:shadow-md">
          <div className="relative z-10">
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <IconFolder className="size-5" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-balance">
              Screening Batches
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-pretty text-muted-foreground">
              Create and manage invite-controlled candidate cohorts and track
              bulk interview completion progress.
            </p>
          </div>
          <div className="relative z-10 mt-6 flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="rounded-xl px-5"
              render={<Link href="/admin/screenings" />}
              nativeButton={false}
            >
              Manage screenings
            </Button>
            <Button
              className="rounded-xl px-5"
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

function NeedsAttentionRow({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode
  label: string
  count: number
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="font-mono text-xs font-semibold tabular-nums">
        {count}
      </span>
    </div>
  )
}
