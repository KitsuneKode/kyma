import Link from 'next/link'

import { api } from '@/convex/_generated/api'
import { WorkspacePageHeader } from '@/components/workspace/page-header'
import { ScreeningCreationForm } from '@/components/admin/screening-creation-form'
import { Button } from '@/components/ui/button'
import { AdminSurface } from '@/components/admin/admin-surface'
import { requireOrgPermission } from '@/lib/auth/access'
import {
  hasConvexDeployment,
  serverConvexMutation,
  serverConvexQuery,
} from '@/lib/convex/server-query'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'

async function loadInitialTemplates() {
  const [bootstrapResult, templatesResult] = await Promise.all([
    serverConvexMutation(api.recruiter.templates.bootstrapOrgTemplates, {}),
    serverConvexQuery(api.recruiter.templates.listActiveTemplates, {}),
  ])

  if (!bootstrapResult.ok || !templatesResult.ok) {
    return []
  }

  return templatesResult.data
}

export default async function NewScreeningPage() {
  await requireOrgPermission('recruiter:screenings:write')

  const token = await getServerConvexAuthToken()
  const initialTemplates =
    hasConvexDeployment() && token ? await loadInitialTemplates() : []

  return (
    <div className="flex w-full flex-col gap-6">
      <WorkspacePageHeader
        eyebrow="Screening ops"
        title="Create Screening"
        description="Create invite-controlled candidate cohorts with explicit access limits, expiration, and policy overrides."
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

      <AdminSurface>
        <ScreeningCreationForm initialTemplates={initialTemplates} />
      </AdminSurface>
    </div>
  )
}
