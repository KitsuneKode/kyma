import Link from 'next/link'
import { connection } from 'next/server'

import { api } from '@/convex/_generated/api'
import { WorkspacePageHeader } from '@/components/workspace/page-header'
import { Button } from '@/components/ui/button'
import { ScreeningBatchesTable } from '@/components/recruiter/screening-batches-table'
import { WorkspaceQueryState } from '@/components/workspace/query-state'
import { serverConvexQuery } from '@/lib/convex/server-query'
import { signInPath } from '@/lib/auth/workspace-intent'

export default async function AdminScreeningsPage() {
  await connection()
  const batchesResult = await serverConvexQuery(
    api.recruiter.screenings.listScreeningBatches,
    { nowMs: Date.now() }
  )

  if (!batchesResult.ok) {
    return (
      <div className="flex w-full flex-col gap-8">
        <WorkspacePageHeader
          eyebrow="Screening ops"
          title="Screening Batches"
          description="Manage invite-gated candidate batches and monitor completion progress."
        />
        <WorkspaceQueryState
          status="error"
          emptyTitle=""
          emptyDescription=""
          errorTitle={
            batchesResult.kind === 'auth'
              ? 'Sign in required'
              : 'Unable to load screening batches'
          }
          errorDescription={
            batchesResult.message ??
            'Your session may have expired or your organization access changed.'
          }
          errorAction={
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
  const queryStatus = batches.length === 0 ? 'empty' : 'ready'

  return (
    <div className="flex w-full flex-col gap-8">
      <WorkspacePageHeader
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

      <WorkspaceQueryState
        status={queryStatus}
        emptyTitle="No screening batches yet"
        emptyDescription="Create your first invite-gated batch to start sending candidate links and tracking completion."
        emptyAction={
          <Button
            nativeButton={false}
            render={<Link href="/recruiter/screenings/new" />}
          >
            Create screening
          </Button>
        }
      >
        <section className="space-y-4">
          <ScreeningBatchesTable data={batches} />
        </section>
      </WorkspaceQueryState>
    </div>
  )
}
