import Link from 'next/link'

import { api } from '@/convex/_generated/api'
import { AdminStatePanel } from '@/components/admin/admin-state-panel'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { ScreeningBatchesTable } from '@/components/recruiter/screening-batches-table'
import { serverConvexQuery } from '@/lib/convex/server-query'

export default async function AdminScreeningsPage() {
  const batchesResult = await serverConvexQuery(
    api.recruiter.screenings.listScreeningBatches,
    {}
  )
  const batches = batchesResult.ok ? batchesResult.data : []

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader
        eyebrow="Screening ops"
        title="Screening Batches"
        description="Manage invite-gated candidate batches and monitor completion progress."
        actions={
          <>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/recruiter" />}
            >
              Back to recruiter
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/recruiter/screenings/new" />}
            >
              Create Screening
            </Button>
          </>
        }
      />

      <section className="space-y-4">
        <ScreeningBatchesTable data={batches} />
        {batches.length === 0 ? (
          <AdminStatePanel
            title="No screening batches yet"
            description="Create the first invite-controlled batch to generate candidate links, track attempts, and keep access tightly scoped."
            action={
              <Button
                nativeButton={false}
                render={<Link href="/recruiter/screenings/new" />}
              >
                Create Screening
              </Button>
            }
          />
        ) : null}
      </section>
    </div>
  )
}
