import Link from 'next/link'
import { fetchMutation, fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import { AdminStatePanel } from '@/components/admin/admin-state-panel'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'

type TemplatesLoadResult =
  | { ok: true; templates: Awaited<ReturnType<typeof loadTemplates>> }
  | { ok: false; error: string }

async function loadTemplates(token: string) {
  await fetchMutation(
    api.admin.bootstrapOrgTemplates,
    {},
    { token: token ?? undefined }
  )
  return await fetchQuery(
    api.admin.listActiveTemplates,
    {},
    { token: token ?? undefined }
  )
}

export default async function TemplatesPage() {
  const token = await getServerConvexAuthToken()
  let result: TemplatesLoadResult = { ok: true, templates: [] }

  if (clientEnv.NEXT_PUBLIC_CONVEX_URL && token) {
    try {
      const templates = await loadTemplates(token)
      result = { ok: true, templates }
    } catch (error) {
      result = {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to load screening templates.',
      }
    }
  } else if (!token) {
    result = {
      ok: false,
      error:
        'Sign in with an active organization and ensure the Convex JWT template is configured.',
    }
  }

  const templates = result.ok ? result.templates : []

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader
        eyebrow="Template library"
        title="Screening Templates"
        description="Define rubric-backed interview templates for your organization. Each screening batch links to one active template."
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
              render={<Link href="/recruiter/templates/new" />}
            >
              Create template
            </Button>
          </>
        }
      />

      {!result.ok ? (
        <AdminStatePanel
          title="Templates unavailable"
          description={result.error}
          action={
            <Button
              nativeButton={false}
              render={<Link href="/recruiter/setup" />}
            >
              Review organization setup
            </Button>
          }
        />
      ) : null}

      {result.ok && templates.length === 0 ? (
        <AdminStatePanel
          title="No templates yet"
          description="Create your first screening template or use the default bootstrap template after refreshing this page."
          action={
            <Button
              nativeButton={false}
              render={<Link href="/recruiter/templates/new" />}
            >
              Create template
            </Button>
          }
        />
      ) : null}

      {result.ok && templates.length > 0 ? (
        <section className="grid gap-4">
          {templates.map((template) => (
            <Link
              key={`${template.id}`}
              className="block rounded-2xl bg-card p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)] transition-colors hover:bg-muted/20"
              href={`/recruiter/templates/${template.id}/edit`}
            >
              <p className="font-medium">{template.name}</p>
              <p className="text-sm text-muted-foreground">
                {template.role} · {template.rubricVersion}
                {template.targetDurationMinutes
                  ? ` · ${template.targetDurationMinutes} min`
                  : ''}
              </p>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  )
}
