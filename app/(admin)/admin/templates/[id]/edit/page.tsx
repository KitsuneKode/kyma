import { fetchQuery } from 'convex/nextjs'
import type { Id } from '@/convex/_generated/dataModel'

import { api } from '@/convex/_generated/api'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'

type TemplateEditPageProps = {
  params: Promise<{ id: string }>
}

export default async function TemplateEditPage({
  params,
}: TemplateEditPageProps) {
  const { id } = await params
  const token = await getServerConvexAuthToken()
  const template =
    clientEnv.NEXT_PUBLIC_CONVEX_URL && token
      ? await fetchQuery(
          api.admin.getTemplateById,
          { templateId: id as Id<'assessmentTemplates'> },
          { token: token ?? undefined }
        ).catch(() => null)
      : null
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Edit template</h1>
      {!template ? (
        <p className="text-sm text-muted-foreground">Template not found.</p>
      ) : (
        <div className="space-y-3 rounded-2xl bg-card p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
          <p className="font-medium">{template.name}</p>
          <p className="text-sm text-muted-foreground">
            Rubric version: {template.rubricVersion}
          </p>
          <p className="text-sm text-muted-foreground">
            Use Convex mutation `admin.updateAssessmentTemplate` to save edits.
          </p>
        </div>
      )}
    </section>
  )
}
