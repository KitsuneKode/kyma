import Link from 'next/link'
import { fetchQuery } from 'convex/nextjs'

import type { Id } from '@/convex/_generated/dataModel'
import { api } from '@/convex/_generated/api'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { ScreeningCandidatesTable } from '@/components/recruiter/screening-candidates-table'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { formatDateTime, formatStatusLabel } from '@/lib/recruiter/format'
import { MetricCard } from '@/components/admin/metric-card'
import { publicEnv } from '@/lib/env/public'

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
  const detail = publicEnv.NEXT_PUBLIC_CONVEX_URL
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
      <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <section className="rounded-xl border bg-card p-8 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight">
            Screening batch not found
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The batch may not exist yet, or Convex is unavailable in this
            environment.
          </p>
          <div className="mt-6">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/admin/screenings" />}
            >
              Back to screenings
            </Button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <PageHeader
        eyebrow="Screening ops"
        title={detail.batch.name}
        description="Review candidate eligibility, invite status, and attempt usage for this batch."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/admin/screenings" />}
          >
            Back to screenings
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Status"
          value={formatStatusLabel(detail.batch.status)}
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

      <section className="space-y-4">
        <ScreeningCandidatesTable data={detail.candidates} />
        {detail.candidates.length === 0 ? (
          <div className="rounded-xl bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">
              No candidates are assigned to this batch yet. Add candidates to
              generate invite links.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  )
}
