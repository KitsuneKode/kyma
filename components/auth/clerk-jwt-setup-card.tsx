'use client'

import Link from 'next/link'

import { WorkspaceSurface } from '@/components/workspace/surface'
import { Button } from '@/components/ui/button'

export function ClerkJwtSetupCard({
  title = 'Clerk JWT template setup',
  description = 'Clerk signed you in, but recruiter permissions are not in your session token yet. Configure the convex JWT template so Kyma can verify organization access.',
  compact = false,
}: {
  title?: string
  description?: string
  compact?: boolean
}) {
  return (
    <WorkspaceSurface className={compact ? 'space-y-3 p-4' : 'space-y-4 p-6'}>
      <div>
        <h2
          className={
            compact ? 'text-base font-semibold' : 'text-lg font-semibold'
          }
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>
          Open Clerk Dashboard → <strong>JWT templates</strong> and create or
          edit the <code className="text-xs">convex</code> template.
        </li>
        <li>
          Under Sessions → Customize session token, include{' '}
          <code className="text-xs">org_id</code>,{' '}
          <code className="text-xs">org_role</code>, and{' '}
          <code className="text-xs">org_permissions</code>.
        </li>
        <li>
          Run{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            bun run clerk:setup-auth
          </code>{' '}
          locally and paste the generated session-token JSON into Clerk.
        </li>
        <li>
          Select your organization in the header switcher, then sign out and
          sign in once.
        </li>
      </ol>
      <div className="flex flex-wrap gap-3">
        <Button nativeButton={false} render={<Link href="/dev" />}>
          Open dev setup hub
        </Button>
        <Button
          nativeButton={false}
          variant="outline"
          render={
            <a
              href="https://dashboard.clerk.com"
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          Open Clerk Dashboard
        </Button>
      </div>
    </WorkspaceSurface>
  )
}
