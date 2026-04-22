import Link from 'next/link'
import { fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { ScreeningBatchesTable } from '@/components/recruiter/screening-batches-table'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { publicEnv } from '@/lib/env/public'

export default async function AdminScreeningsPage() {
  const token = await getServerConvexAuthToken()
  const batches = publicEnv.NEXT_PUBLIC_CONVEX_URL
    ? await fetchQuery(
        api.admin.listScreeningBatches,
        {},
        {
          token: token ?? undefined,
        }
      ).catch(() => [])
    : []

  return (
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <PageHeader
        eyebrow="Screening ops"
        title="Screening batches"
        description="Manage invite-gated candidate batches and monitor completion progress."
        actions={
          <>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/admin" />}
            >
              Back to admin
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/admin/screenings/new" />}
            >
              Create screening
            </Button>
          </>
        }
      />

      <section className="space-y-4">
        <ScreeningBatchesTable data={batches} />
        {batches.length === 0 ? (
          <div className="rounded-xl bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">
              No screening batches are available. Create a batch to generate
              controlled invite links.
            </p>
            <div className="mt-3">
              <Button
                nativeButton={false}
                render={<Link href="/admin/screenings/new" />}
              >
                Create screening batch
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}
