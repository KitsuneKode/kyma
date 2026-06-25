import Link from 'next/link'
import type { Id } from '@/convex/_generated/dataModel'

import { api } from '@/convex/_generated/api'
import { TemplateEditForm } from '@/components/admin/template-edit-form'
import { WorkspacePageHeader } from '@/components/workspace/page-header'
import { WorkspaceEmptyState } from '@/components/workspace/empty-state'
import { Button } from '@/components/ui/button'
import {
  hasConvexDeployment,
  serverConvexQuery,
} from '@/lib/convex/server-query'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { requireOrgPermission } from '@/lib/auth/access'

type TemplateEditPageProps = {
  params: Promise<{ id: string }>
}

export default async function TemplateEditPage({
  params,
}: TemplateEditPageProps) {
  await requireOrgPermission('recruiter:templates:write')

  const [{ id }, token] = await Promise.all([
    params,
    getServerConvexAuthToken(),
  ])
  const templateResult =
    hasConvexDeployment() && token
      ? await serverConvexQuery(api.recruiter.templates.getTemplateById, {
          templateId: id as Id<'assessmentTemplates'>,
        })
      : { ok: false as const, kind: 'not_found' as const }
  const template = templateResult.ok ? templateResult.data : null

  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <WorkspacePageHeader
        eyebrow="Template library"
        title={template?.name ?? 'Edit template'}
        description="Update template metadata and interviewer prompts. Saving creates a new rubric version snapshot."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/recruiter/templates" />}
          >
            Back to templates
          </Button>
        }
      />
      {!template ? (
        <WorkspaceEmptyState
          title="Template not found"
          description="This template may have been removed or you may not have access to edit it."
          action={
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/recruiter/templates" />}
            >
              Back to templates
            </Button>
          }
        />
      ) : (
        <TemplateEditForm template={template} />
      )}
    </div>
  )
}
