'use client'

import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { motion } from '@/components/motion/client-motion'
import {
  IconUsers,
  IconFolder,
  IconAlertCircle,
  IconClock,
  IconEye,
  IconArrowRight,
  IconChartBar,
  IconTrendingUp,
} from '@tabler/icons-react'
import { StaticMetricCard } from '@/components/admin/metric-card-static'
import { WorkspacePageHeader } from '@/components/workspace/page-header'
import { api } from '@/convex/_generated/api'
import { pressScaleClass } from '@/lib/motion/presets'
import { useMotionPresets } from '@/lib/motion/use-motion-presets'
import { formatStatusLabel, formatDateTime } from '@/lib/recruiter/format'
import type { DashboardLiveSlice } from '@/lib/recruiter/types'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const SessionTimelineChart = dynamic(
  () =>
    import('@/components/recruiter/recruiter-dashboard-charts').then(
      (module) => module.SessionTimelineChart
    ),
  { ssr: false }
)

const InviteFunnelChart = dynamic(
  () =>
    import('@/components/recruiter/recruiter-dashboard-charts').then(
      (module) => module.InviteFunnelChart
    ),
  { ssr: false }
)

export function RecruiterDashboard({
  sessionsToday,
  reportsPending,
  activeBatches,
  pendingReviews,
}: {
  sessionsToday: number
  reportsPending: number
  activeBatches: number
  pendingReviews: number
}) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 60_000)
    return () => window.clearInterval(intervalId)
  }, [])

  const liveSlice = useQuery(api.recruiter.dashboard.getDashboardLiveSlice, {
    nowMs,
  })
  const summary = useQuery(api.recruiter.dashboard.getDashboardSummary, {
    nowMs,
  })
  const { staggerChildren, listItem, reduceMotion } = useMotionPresets()

  const timelineData = summary?.charts.timeline ?? []
  const funnelData = summary
    ? [
        {
          name: 'Invited',
          value: summary.charts.funnel.invited,
          fill: 'var(--chart-2)',
        },
        {
          name: 'In Progress',
          value: summary.charts.funnel.inProgress,
          fill: 'var(--chart-3)',
        },
        {
          name: 'Completed',
          value: summary.charts.funnel.completed,
          fill: 'var(--chart-1)',
        },
        {
          name: 'Expired',
          value: summary.charts.funnel.expired,
          fill: 'var(--muted)',
        },
      ].filter((d) => d.value > 0)
    : []
  const recData = summary
    ? [
        {
          name: 'Strong Yes',
          value: summary.charts.recommendations.strong_yes,
        },
        { name: 'Yes', value: summary.charts.recommendations.yes },
        { name: 'Mixed', value: summary.charts.recommendations.mixed },
        { name: 'No', value: summary.charts.recommendations.no },
      ].filter((d) => d.value > 0)
    : []

  return (
    <div className="flex w-full flex-col gap-12 py-6">
      <WorkspacePageHeader
        eyebrow="Recruiter operations"
        title="Command center"
        description="Active batches, pending reviews, and sessions that need your attention."
      />

      <motion.section
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
      >
        {[
          {
            label: 'Sessions today',
            value: String(sessionsToday),
            detail: 'Live interview sessions started in the last 24h cycle.',
            icon: 'dashboard' as const,
          },
          {
            label: 'Reports pending',
            value: String(reportsPending),
            detail: 'Sessions processing through the AI assessment pipeline.',
            icon: 'users' as const,
          },
          {
            label: 'Active batches',
            value: String(activeBatches),
            detail: 'Screening batches currently accepting candidate attempts.',
            icon: 'folder' as const,
          },
          {
            label: 'Pending reviews',
            value: String(pendingReviews),
            detail: 'Candidates awaiting final human-verified decision.',
            icon: 'users' as const,
            emphasis: true,
          },
        ].map((metric) => (
          <motion.div key={metric.label} variants={listItem}>
            <StaticMetricCard {...metric} />
          </motion.div>
        ))}
      </motion.section>

      {/* Charts — shadcn ChartContainer + remotion-style spring */}
      <motion.section
        className="grid gap-6 lg:grid-cols-3"
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={listItem} className="lg:col-span-2">
          <Card className="rounded-3xl shadow-[var(--shadow-sm)]">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/10">
                  <IconTrendingUp className="size-4 text-primary/70" />
                </div>
                <CardTitle className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  Sessions — last 14 days
                </CardTitle>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground/60 tabular-nums">
                {timelineData.reduce((sum, d) => sum + d.sessions, 0)} total
              </span>
            </CardHeader>
            <CardContent>
              <div className="h-[180px] w-full">
                {summary === undefined ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground/60">
                    Loading chart…
                  </div>
                ) : timelineData.every((d) => d.sessions === 0) ? (
                  <div className="flex h-full items-center justify-center rounded-2xl bg-muted/30 px-6 py-8 text-center text-sm leading-relaxed text-muted-foreground/70">
                    No sessions in the last 14 days. New interviews will appear
                    here as a daily pulse.
                  </div>
                ) : (
                  <SessionTimelineChart data={timelineData} />
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={listItem}>
          <Card className="rounded-3xl shadow-[var(--shadow-sm)]">
            <CardHeader className="flex-row items-center gap-2.5 space-y-0 pb-3">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/15">
                <IconChartBar className="size-4 text-emerald-600/70 dark:text-emerald-400/70" />
              </div>
              <CardTitle className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Invite funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px] w-full">
                {summary === undefined ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground/60">
                    Loading…
                  </div>
                ) : funnelData.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-2xl bg-muted/30 px-6 py-4 text-center text-sm text-muted-foreground/70">
                    No invites yet. Create a batch to see the funnel.
                  </div>
                ) : (
                  <InviteFunnelChart data={funnelData} />
                )}
              </div>
              {recData.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
                  {recData.map((item) => (
                    <span
                      key={item.name}
                      className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                    >
                      <span className="size-1.5 rounded-full bg-primary/60" />
                      {item.name}: {item.value}
                    </span>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Needs attention — the single focal panel of this view */}
        <motion.div
          variants={listItem}
          initial="hidden"
          animate="visible"
          className="rounded-3xl bg-card p-7 shadow-[var(--shadow-md)] ring-1 ring-amber-500/20"
        >
          <div className="mb-7 flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/15">
              <IconAlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-xs font-semibold tracking-[0.16em] text-amber-700/80 uppercase dark:text-amber-300/80">
              Needs attention
            </h3>
          </div>

          <div className="flex flex-col gap-1">
            <NeedsAttentionRow
              href="/recruiter/candidates?status=manual_review"
              icon={<IconEye className="size-4 text-amber-500/50" />}
              label="Manual review"
              count={
                liveSlice?.needsAttention.manualReviewCandidates.length ?? 0
              }
            />
            <NeedsAttentionRow
              href="/recruiter/screenings"
              icon={<IconClock className="size-4 text-amber-500/50" />}
              label="Invites expiring"
              count={liveSlice?.needsAttention.invitesExpiringSoon.length ?? 0}
            />
            <NeedsAttentionRow
              href="/recruiter/candidates"
              icon={<IconClock className="size-4 text-amber-500/50" />}
              label="Stale sessions"
              count={liveSlice?.needsAttention.staleSessions.length ?? 0}
            />
          </div>
        </motion.div>

        {/* Recent activity — resting elevation, supporting context */}
        <motion.div
          variants={listItem}
          initial="hidden"
          animate="visible"
          className="rounded-3xl bg-card p-7 shadow-[var(--shadow-sm)] ring-1 ring-border/60 lg:col-span-2"
        >
          <h3 className="mb-7 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Recent activity
          </h3>
          <div className="no-scrollbar flex max-h-[300px] flex-col gap-1 overflow-y-auto pr-1">
            {liveSlice?.recentActivity.length ? (
              liveSlice.recentActivity
                .slice(0, 8)
                .map((event, i) => (
                  <ActivityStreamRow
                    key={event.id}
                    event={event}
                    index={i}
                    reduceMotion={reduceMotion}
                  />
                ))
            ) : liveSlice === undefined ? (
              <p className="py-6 text-sm text-muted-foreground">
                Loading recent activity…
              </p>
            ) : (
              <p className="py-6 text-sm text-muted-foreground">
                No recent activity yet. Completed sessions and review actions
                will appear here.
              </p>
            )}
          </div>
        </motion.div>
      </div>

      <motion.section
        className="grid gap-6 md:grid-cols-2"
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={listItem}>
          <QuickActionCard
            href="/recruiter/candidates"
            icon={<IconUsers className="size-6" />}
            title="Candidate Review Queue"
            description="High-fidelity triage of transcript-backed signals and AI assessments."
            cta="Open full queue"
          />
        </motion.div>
        <motion.div variants={listItem}>
          <QuickActionCard
            href="/recruiter/screenings/new"
            icon={<IconFolder className="size-6" />}
            title="Create Screening Batch"
            description="Launch invite-only cohorts with explicit attempt policies and rubrics."
            cta="Launch new batch"
          />
        </motion.div>
      </motion.section>
    </div>
  )
}

function ActivityStreamRow({
  event,
  index,
  reduceMotion,
}: {
  event: DashboardLiveSlice['recentActivity'][number]
  index: number
  reduceMotion: boolean
}) {
  const rowClassName = cn(
    'group -mx-2 flex items-center justify-between gap-6 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/40',
    pressScaleClass
  )
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
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0.15 }
          : { delay: 0.12 + index * 0.05, duration: 0.35 }
      }
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
      className={cn(
        'group -mx-2 flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-amber-500/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500/40',
        pressScaleClass
      )}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground/90">
          {label}
        </span>
      </div>
      <span
        className={cn(
          'font-mono text-lg font-semibold tabular-nums transition-colors',
          count > 0
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-muted-foreground/40'
        )}
      >
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
}: {
  href: string
  icon: ReactNode
  title: string
  description: string
  cta: string
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-3xl bg-card p-8 shadow-[var(--shadow-sm)] ring-1 ring-border/60 transition-[box-shadow,ring-color,transform] duration-200 ease-[var(--ease-out)] hover:shadow-[var(--shadow-md)] hover:ring-border motion-safe:hover:-translate-y-0.5',
        pressScaleClass
      )}
    >
      <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-foreground/[0.04] text-foreground/45 ring-1 ring-border/40 transition-colors duration-200 group-hover:text-foreground/80">
        {icon}
      </div>
      <h2 className="mb-2.5 text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mb-8 max-w-xs text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <Link
        href={href}
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-all duration-200 group-hover:gap-3"
      >
        {cta}
        <IconArrowRight className="size-4" />
      </Link>
    </div>
  )
}
