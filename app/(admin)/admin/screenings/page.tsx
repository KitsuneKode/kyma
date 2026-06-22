import Link from 'next/link'
import { fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import { AdminStatePanel } from '@/components/admin/admin-state-panel'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { ScreeningBatchesTable } from '@/components/recruiter/screening-batches-table'
import { WorkspaceEmptyState } from '@/components/workspace/empty-state'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'
import { runConvexFetch } from '@/lib/convex/server-fetch'
import { signInPath } from '@/lib/auth/workspace-intent'

export default async function AdminScreeningsPage() {
  const token = await getServerConvexAuthToken()
  const batchesResult = clientEnv.NEXT_PUBLIC_CONVEX_URL
    ? await runConvexFetch(() =>
        fetchQuery(
          api.admin.listScreeningBatches,
          {},
          {
            token: token ?? undefined,
          }
        )
      )
    : { ok: true as const, data: [] }

  if (!batchesResult.ok) {
    return (
      <div className="flex w-full flex-col gap-8">
        <WorkspaceEmptyState
          eyebrow="Screening ops"
          title={
            batchesResult.kind === 'auth'
              ? 'Sign in required'
              : 'Unable to load screenings'
          }
          description={
            batchesResult.message ??
            'Your session may have expired or your organization access changed.'
          }
          action={
            batchesResult.kind === 'auth' ? (
              <Button
                nativeButton={false}
                render={<Link href={signInPath('recruiter')} />}
              >
                Sign in again
              </Button>
            ) : (
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href="/recruiter" />}
              >
                Back to recruiter
              </Button>
            )
          }
        />
      </div>
    )
  }

  const batches = batchesResult.data

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
