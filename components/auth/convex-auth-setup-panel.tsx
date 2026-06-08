'use client'

import Link from 'next/link'

import { WorkspaceSurface } from '@/components/workspace/surface'
import { Button } from '@/components/ui/button'

export function ConvexAuthSetupPanel({
  title = 'Convex auth is not ready',
  description = 'Clerk signed you in, but Convex has not received a valid JWT yet. This usually means the Clerk "convex" JWT template is missing or your session needs a refresh.',
}: {
  title?: string
  description?: string
}) {
  return (
    <WorkspaceSurface className="space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>
          Run{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            bun run clerk:setup-auth
          </code>{' '}
          and complete the printed session-token JSON step in Clerk Dashboard.
        </li>
        <li>
          Confirm JWT template <strong>convex</strong> includes{' '}
          <code className="text-xs">org_id</code>,{' '}
          <code className="text-xs">org_role</code>, and{' '}
          <code className="text-xs">org_permissions</code>.
        </li>
        <li>Select an organization in the header switcher.</li>
        <li>Sign out and sign in once, then reload this page.</li>
      </ol>
      <div className="flex flex-wrap gap-3">
        <Button nativeButton={false} render={<Link href="/dev" />}>
          Open dev setup hub
        </Button>
        <Button
          nativeButton={false}
          variant="outline"
          render={<Link href="/onboarding/recruiter" />}
        >
          Recruiter onboarding
        </Button>
      </div>
    </WorkspaceSurface>
  )
}
