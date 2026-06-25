import Link from 'next/link'
import type { Id } from '@/convex/_generated/dataModel'

import { api } from '@/convex/_generated/api'
import { MetricCard } from '@/components/admin/metric-card'
import { Button } from '@/components/ui/button'
import { ScreeningCandidatesTable } from '@/components/recruiter/screening-candidates-table'
import { ExtendBatchExpiryDialog } from '@/components/recruiter/extend-batch-expiry-dialog'
import { WorkspacePageHeader } from '@/components/workspace/page-header'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { WorkspaceQueryState } from '@/components/workspace/query-state'
import { StatusBadge } from '@/components/workspace/status-badge'
import { formatDateTime, formatStatusLabel } from '@/lib/recruiter/format'
import { isCompletedPipelineStatus } from '@/lib/candidate/status-filters'
import {
  hasConvexDeployment,
  serverConvexQuery,
} from '@/lib/convex/server-query'

type ScreeningDetailPageProps = {
  params: Promise<{
    batchId: string
  }>
}

export default async function ScreeningDetailPage({
  params,
}: ScreeningDetailPageProps) {
  const { batchId } = await params
  const detailResult = hasConvexDeployment()
    ? await serverConvexQuery(
        api.recruiter.screenings.getScreeningBatchDetail,
        {
          batchId: batchId as Id<'screeningBatches'>,
          nowMs: Date.now(),
        }
      )
    : { ok: false as const, kind: 'not_found' as const }
  const detail = detailResult.ok ? detailResult.data : null

  if (!detail) {
    return (
      <div className="flex w-full flex-col gap-8">
        <WorkspacePageHeader
          eyebrow="Screening ops"
          title="Screening batch"
          description="Review candidate eligibility, invite status, and attempt usage for this batch."
        />
        <WorkspaceQueryState
          status="empty"
          emptyTitle="Screening batch not found"
          emptyDescription="The batch may not exist yet, or Convex is unavailable in this environment."
          emptyAction={
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

  const completedCandidates = detail.candidates.filter((candidate) =>
    isCompletedPipelineStatus(String(candidate.status ?? ''))
  ).length
  const totalCandidates = detail.candidates.length
  const completionPercent =
    totalCandidates === 0
      ? 0
      : Math.round((completedCandidates / totalCandidates) * 100)
  const batchStatus = String(detail.batch.status ?? '')

  return (
    <div className="flex w-full flex-col gap-8">
      <WorkspacePageHeader
        eyebrow="Screening ops"
        title={detail.batch.name}
        description="Review candidate eligibility, invite status, and attempt usage for this batch."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExtendBatchExpiryDialog
              batchId={detail.batch.id as Id<'screeningBatches'>}
              currentExpiry={detail.batch.expiresAt}
            />
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/recruiter/screenings" />}
            >
              Back to screenings
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Status"
          value={formatStatusLabel(batchStatus)}
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
          label="Duration"
          value={
            detail.batch.targetDurationMinutes
              ? `${detail.batch.targetDurationMinutes} min`
              : 'Template default'
          }
          detail={
            detail.batch.allowsResume === false
              ? 'Single-pass (no resume)'
              : 'Resume allowed'
          }
        />
        <MetricCard
          label="Job family"
          value={formatStatusLabel(detail.batch.jobFamily ?? 'general')}
          detail="Assessment template family"
        />
        <MetricCard
          label="Expiry"
          value={formatDateTime(detail.batch.expiresAt)}
          detail="Invite expiration"
        />
      </section>

      <WorkspaceSurface className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Candidate completion
          </p>
          <StatusBadge status={batchStatus} />
        </div>
        <div className="h-2 rounded-full bg-muted/40">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground tabular-nums">
          {completedCandidates} / {totalCandidates} completed
        </p>
      </WorkspaceSurface>

      {detail.candidates.length === 0 ? (
        <WorkspaceQueryState
          status="empty"
          emptyTitle="No candidates assigned yet"
          emptyDescription="Add candidates to this batch to generate invite links and start tracking attempt usage."
          emptyAction={
            <Button
              nativeButton={false}
              render={<Link href="/recruiter/screenings" />}
            >
              Back to screenings
            </Button>
          }
        />
      ) : (
        <section className="space-y-4">
          <ScreeningCandidatesTable data={detail.candidates} />
        </section>
      )}
    </div>
  )
}
