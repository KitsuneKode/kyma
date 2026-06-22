import Link from 'next/link'
import { fetchQuery } from 'convex/nextjs'
import type { Id } from '@/convex/_generated/dataModel'

import { api } from '@/convex/_generated/api'
import { TemplateEditForm } from '@/components/admin/template-edit-form'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'

type TemplateEditPageProps = {
  params: Promise<{ id: string }>
}

export default async function TemplateEditPage({
  params,
}: TemplateEditPageProps) {
  const [{ id }, token] = await Promise.all([
    params,
    getServerConvexAuthToken(),
  ])
  const template =
    clientEnv.NEXT_PUBLIC_CONVEX_URL && token
      ? await fetchQuery(
          api.admin.getTemplateById,
          { templateId: id as Id<'assessmentTemplates'> },
          { token: token ?? undefined }
        ).catch(() => null)
      : null

  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <PageHeader
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
        <p className="text-sm text-muted-foreground">Template not found.</p>
      ) : (
        <TemplateEditForm template={template} />
      )}
    </div>
  )
}
