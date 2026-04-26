import Link from 'next/link'
import { fetchQuery } from 'convex/nextjs'

import type { Id } from '@/convex/_generated/dataModel'
import { api } from '@/convex/_generated/api'
import { AdminStatePanel } from '@/components/admin/admin-state-panel'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { ScreeningCandidatesTable } from '@/components/recruiter/screening-candidates-table'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { formatDateTime, formatStatusLabel } from '@/lib/recruiter/format'
import { MetricCard } from '@/components/admin/metric-card'
import { clientEnv } from '@/lib/env/client'

type ScreeningDetailPageProps = {
  params: Promise<{
    batchId: string
  }>
}

export default async function ScreeningDetailPage({
  params,
}: ScreeningDetailPageProps) {
  const { batchId } = await params
  const token = await getServerConvexAuthToken()
  const detail = clientEnv.NEXT_PUBLIC_CONVEX_URL
    ? await fetchQuery(
        api.admin.getScreeningBatchDetail,
        {
          batchId: batchId as Id<'screeningBatches'>,
        },
        {
          token: token ?? undefined,
        }
      ).catch(() => null)
    : null

  if (!detail) {
    return (
      <div className="flex w-full flex-col gap-8">
        <AdminStatePanel
          eyebrow="Screening ops"
          title="Screening batch not found"
          description="The batch may not exist yet, or Convex is unavailable in this environment."
          action={
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/recruiter/screenings" />}
            >
              Back to screenings
            </Button>
          }
        />
      </div>
    )
  }

  const completedCandidates = detail.candidates.filter((candidate) => {
    const normalizedStatus = String(candidate.status ?? '').toLowerCase()
    return ['completed', 'submitted', 'reviewed'].includes(normalizedStatus)
  }).length
  const totalCandidates = detail.candidates.length
  const completionPercent =
    totalCandidates === 0
      ? 0
      : Math.round((completedCandidates / totalCandidates) * 100)
  const batchStatus = String(detail.batch.status ?? '').toLowerCase()
  const statusToneClass =
    batchStatus === 'active'
      ? 'bg-emerald-500/15 text-emerald-400'
      : batchStatus === 'paused'
        ? 'bg-amber-500/15 text-amber-400'
        : 'bg-muted/30 text-muted-foreground'

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader
        eyebrow="Screening ops"
        title={detail.batch.name}
        description="Review candidate eligibility, invite status, and attempt usage for this batch."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/recruiter/screenings" />}
          >
            Back to screenings
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Status"
          value={formatStatusLabel(detail.batch.status)}
          detail={`${completionPercent}% completion`}
        />
        <MetricCard
          label="Template"
          value={detail.batch.templateName}
          detail="Current assessment template"
        />
        <MetricCard
          label="Attempts"
          value={String(detail.batch.allowedAttempts)}
          detail="Allowed attempts per candidate"
        />
        <MetricCard
          label="Expiry"
          value={formatDateTime(detail.batch.expiresAt)}
          detail="Invite expiration"
        />
      </section>

      <section className="rounded-2xl bg-card p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Candidate completion
          </p>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusToneClass}`}
          >
            {formatStatusLabel(detail.batch.status)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted/40">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground tabular-nums">
          {completedCandidates} / {totalCandidates} completed
        </p>
      </section>

      <section className="space-y-4">
        <ScreeningCandidatesTable data={detail.candidates} />
        {detail.candidates.length === 0 ? (
          <AdminStatePanel
            title="No candidates assigned yet"
            description="Add candidates to this batch to generate invite links and start tracking attempt usage."
            action={
              <Button
                nativeButton={false}
                render={<Link href="/recruiter/screenings" />}
              >
                Create or edit screening
              </Button>
            }
          />
        ) : null}
      </section>
    </div>
  )
}
