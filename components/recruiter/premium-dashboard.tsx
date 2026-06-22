'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { motion } from '@/components/motion/client-motion'
import {
  IconUsers,
  IconFolder,
  IconAlertCircle,
  IconClock,
  IconEye,
  IconArrowRight,
} from '@tabler/icons-react'

import { BillboardMetric } from '@/components/admin/billboard-metric'
import { WorkspacePageHeader } from '@/components/workspace/page-header'
import { formatStatusLabel, formatDateTime } from '@/lib/recruiter/format'
import type { DashboardSummary } from '@/lib/recruiter/types'

export function PremiumRecruiterDashboard({
  sessionsToday,
  reportsPending,
  activeBatches,
  pendingReviews,
  dashboardSummary,
}: {
  sessionsToday: number
  reportsPending: number
  activeBatches: number
  pendingReviews: number
  dashboardSummary: DashboardSummary | null
}) {
  return (
    <div className="flex w-full flex-col gap-12 py-6">
      <WorkspacePageHeader
        eyebrow="Recruiter operations"
        title="Command center"
        description="Active batches, pending reviews, and sessions that need your attention."
      />

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <BillboardMetric
          label="Sessions today"
          value={String(sessionsToday)}
          detail="Live interview sessions started in the last 24h cycle."
          delay={0.1}
          icon="dashboard"
        />
        <BillboardMetric
          label="Reports pending"
          value={String(reportsPending)}
          detail="Sessions processing through the AI assessment pipeline."
          delay={0.15}
          icon="users"
        />
        <BillboardMetric
          label="Active batches"
          value={String(activeBatches)}
          detail="Screening batches currently accepting candidate attempts."
          delay={0.2}
          icon="folder"
        />
        <BillboardMetric
          label="Pending reviews"
          value={String(pendingReviews)}
          detail="Candidates awaiting final human-verified decision."
          delay={0.25}
          icon="users"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Needs Attention - Obsidian System Alert Style */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="rounded-[2rem] border border-amber-500/10 bg-amber-500/[0.03] p-8 shadow-[var(--shadow-md)] ring-1 ring-amber-500/5"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-amber-500/10">
              <IconAlertCircle className="size-4 text-amber-500" />
            </div>
            <h3 className="text-sm font-bold tracking-widest text-amber-500/80 uppercase">
              Needs attention
            </h3>
          </div>

          <div className="flex flex-col gap-6">
            <NeedsAttentionRow
              href="/recruiter/candidates?status=manual_review"
              icon={<IconEye className="size-4 text-amber-500/50" />}
              label="Manual review"
              count={
                dashboardSummary?.needsAttention.manualReviewCandidates
                  .length ?? 0
              }
            />
            <NeedsAttentionRow
              href="/recruiter/screenings"
              icon={<IconClock className="size-4 text-amber-500/50" />}
              label="Invites expiring"
              count={
                dashboardSummary?.needsAttention.invitesExpiringSoon.length ?? 0
              }
            />
            <NeedsAttentionRow
              href="/recruiter/candidates"
              icon={<IconClock className="size-4 text-amber-500/50" />}
              label="Stale sessions"
              count={dashboardSummary?.needsAttention.staleSessions.length ?? 0}
            />
          </div>
        </motion.div>

        {/* Recent Activity - Obsidian Timeline Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="rounded-[2rem] border border-border/40 bg-card p-8 shadow-2xl ring-1 ring-border/50 lg:col-span-2"
        >
          <h3 className="mb-8 text-sm font-bold tracking-widest text-muted-foreground uppercase">
            Recent activity stream
          </h3>
          <div className="no-scrollbar flex max-h-[300px] flex-col gap-4 overflow-y-auto pr-4">
            {dashboardSummary?.recentActivity.length ? (
              dashboardSummary.recentActivity
                .slice(0, 8)
                .map((event, i) => (
                  <ActivityStreamRow key={event.id} event={event} index={i} />
                ))
            ) : (
              <p className="py-6 text-sm text-muted-foreground">
                No recent activity yet. Completed sessions and review actions
                will appear here.
              </p>
            )}
          </div>
        </motion.div>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <QuickActionCard
          href="/recruiter/candidates"
          icon={<IconUsers className="size-6" />}
          title="Candidate Review Queue"
          description="High-fidelity triage of transcript-backed signals and AI assessments."
          cta="Open full queue"
          delay={0.7}
        />
        <QuickActionCard
          href="/recruiter/screenings/new"
          icon={<IconFolder className="size-6" />}
          title="Create Screening Batch"
          description="Launch invite-only cohorts with explicit attempt policies and rubrics."
          cta="Launch new batch"
          delay={0.8}
        />
      </section>
    </div>
  )
}

function ActivityStreamRow({
  event,
  index,
}: {
  event: DashboardSummary['recentActivity'][number]
  index: number
}) {
  const rowClassName =
    'group flex items-center justify-between gap-6 rounded-xl border-b border-border/30 px-2 py-3 transition-colors last:border-0 hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
  const reviewHref = event.sessionId
    ? `/recruiter/candidates/${event.sessionId}`
    : null

  const content = (
    <>
      <div className="flex min-w-0 items-center gap-4">
        <div className="size-1.5 shrink-0 rounded-full bg-primary/40 transition-colors group-hover:bg-primary" />
        <p className="truncate text-sm text-muted-foreground transition-colors group-hover:text-foreground/90">
          <span className="font-semibold text-foreground/90">
            {formatStatusLabel(event.type)}
          </span>{' '}
          {event.detail}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {event.createdAt ? (
          <span className="font-mono text-[10px] text-foreground/30 tabular-nums transition-colors group-hover:text-foreground/50">
            {formatDateTime(event.createdAt)}
          </span>
        ) : null}
        {reviewHref ? (
          <IconArrowRight className="size-3.5 text-foreground/20 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
        ) : null}
      </div>
    </>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 + index * 0.05 }}
    >
      {reviewHref ? (
        <Link
          href={reviewHref}
          className={rowClassName}
          aria-label={`Open review for ${event.detail}`}
        >
          {content}
        </Link>
      ) : (
        <div className={rowClassName}>{content}</div>
      )}
    </motion.div>
  )
}

function NeedsAttentionRow({
  href,
  icon,
  label,
  count,
}: {
  href: string
  icon: ReactNode
  label: string
  count: number
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-xl px-2 py-1 transition-colors hover:bg-amber-500/5"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground/90">
          {label}
        </span>
      </div>
      <span className="font-mono text-lg font-bold text-foreground/90 tabular-nums transition-colors group-hover:text-amber-500">
        {count}
      </span>
    </Link>
  )
}

function QuickActionCard({
  href,
  icon,
  title,
  description,
  cta,
  delay,
}: {
  href: string
  icon: ReactNode
  title: string
  description: string
  cta: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="group relative overflow-hidden rounded-[2rem] bg-card p-10 shadow-2xl ring-1 ring-border/50 transition-all duration-300 hover:ring-border"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,hsla(0,0%,20%,0.1)_0,transparent_50%)]" />
      <div className="relative z-10">
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-foreground/5 text-foreground/40 transition-all duration-300 group-hover:scale-110 group-hover:bg-foreground/10 group-hover:text-foreground">
          {icon}
        </div>
        <h2 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mb-10 max-w-xs text-sm leading-relaxed text-muted-foreground transition-colors group-hover:text-foreground/70">
          {description}
        </p>
        <Link
          href={href}
          className="inline-flex items-center gap-2 text-sm font-bold tracking-widest text-primary uppercase transition-all group-hover:gap-4"
        >
          {cta}
          <IconArrowRight className="size-4" />
        </Link>
      </div>
    </motion.div>
  )
}
