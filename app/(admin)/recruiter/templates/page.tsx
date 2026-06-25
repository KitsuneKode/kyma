import Link from 'next/link'

import { api } from '@/convex/_generated/api'
import { TemplatesTable } from '@/components/recruiter/templates-table'
import { WorkspacePageHeader } from '@/components/workspace/page-header'
import { Button } from '@/components/ui/button'
import { WorkspaceQueryState } from '@/components/workspace/query-state'
import {
  hasConvexDeployment,
  serverConvexMutation,
  serverConvexQuery,
} from '@/lib/convex/server-query'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { signInPath } from '@/lib/auth/workspace-intent'

type TemplatesLoadResult =
  | { ok: true; templates: Awaited<ReturnType<typeof loadTemplates>> }
  | { ok: false; error: string; auth?: boolean }

async function loadTemplates() {
  const [bootstrapResult, templatesResult] = await Promise.all([
    serverConvexMutation(api.recruiter.templates.bootstrapOrgTemplates, {}),
    serverConvexQuery(api.recruiter.templates.listActiveTemplates, {}),
  ])

  if (!bootstrapResult.ok) {
    throw new Error(
      bootstrapResult.message ?? 'Unable to bootstrap organization templates.'
    )
  }

  if (!templatesResult.ok) {
    throw new Error(
      templatesResult.message ?? 'Unable to load screening templates.'
    )
  }

  return templatesResult.data
}

export default async function TemplatesPage() {
  const token = await getServerConvexAuthToken()
  let result: TemplatesLoadResult = { ok: true, templates: [] }

  if (hasConvexDeployment() && token) {
    try {
      const templates = await loadTemplates()
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
      auth: true,
    }
  }

  const templates = result.ok ? result.templates : []
  const queryStatus = !result.ok
    ? 'error'
    : templates.length === 0
      ? 'empty'
      : 'ready'

  return (
    <div className="flex w-full flex-col gap-8">
      <WorkspacePageHeader
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

      <WorkspaceQueryState
        status={queryStatus}
        emptyTitle="No templates yet"
        emptyDescription="Create your first screening template or duplicate one from a job-family starter."
        emptyAction={
          <Button
            nativeButton={false}
            render={<Link href="/recruiter/templates/new" />}
          >
            Create template
          </Button>
        }
        errorTitle={
          result.ok
            ? 'Unable to load templates'
            : result.auth
              ? 'Sign in required'
              : 'Templates unavailable'
        }
        errorDescription={result.ok ? '' : result.error}
        errorAction={
          result.ok ? undefined : result.auth ? (
            <Button
              nativeButton={false}
              render={<Link href={signInPath('recruiter')} />}
            >
              Sign in again
            </Button>
          ) : (
            <Button
              nativeButton={false}
              render={<Link href="/recruiter/setup" />}
            >
              Review organization setup
            </Button>
          )
        }
      >
        <TemplatesTable data={templates} />
      </WorkspaceQueryState>
    </div>
  )
}
