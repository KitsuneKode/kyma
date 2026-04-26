import Link from 'next/link'
import { fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import { AdminStatePanel } from '@/components/admin/admin-state-panel'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { ScreeningBatchesTable } from '@/components/recruiter/screening-batches-table'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'

export default async function AdminScreeningsPage() {
  const token = await getServerConvexAuthToken()
  const batches = clientEnv.NEXT_PUBLIC_CONVEX_URL
    ? await fetchQuery(
        api.admin.listScreeningBatches,
        {},
        {
          token: token ?? undefined,
        }
      ).catch(() => [])
    : []

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
