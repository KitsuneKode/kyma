import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import {
  resolveWorkspaceForContinue,
  shouldPersistWorkspaceForContinue,
} from '@/lib/auth/continue-workspace'
import {
  preferredWorkspaceFromSessionClaims,
  RECRUITER_PERMISSION_MAP,
} from '@/lib/auth/clerk-role'
import {
  getPreferredWorkspaceFromClerk,
  getRedirectPathAfterWorkspaceChoice,
  setPreferredWorkspaceHint,
  setWorkspaceRoutingCookie,
} from '@/lib/auth/workspace'
import { parseWorkspaceIntent } from '@/lib/auth/workspace-intent'

type PageProps = {
  searchParams: Promise<{ workspace?: string | string[] }>
}

export default async function AuthContinuePage({ searchParams }: PageProps) {
  const { userId, orgId, has, sessionClaims } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const params = await searchParams
  const explicitIntent = parseWorkspaceIntent(params.workspace)
  const sessionWorkspace = preferredWorkspaceFromSessionClaims(
    sessionClaims as Record<string, unknown> | null | undefined
  )
  const existing =
    sessionWorkspace ?? (await getPreferredWorkspaceFromClerk(userId))
  const workspace = resolveWorkspaceForContinue({ explicitIntent, existing })

  if (
    shouldPersistWorkspaceForContinue({ explicitIntent, existing, workspace })
  ) {
    await setPreferredWorkspaceHint(userId, workspace, { existing })
  }

  await setWorkspaceRoutingCookie(workspace)

  const canAccessRecruiter = Boolean(
    orgId &&
    (has?.({ role: 'org:admin' }) ||
      has?.({ permission: RECRUITER_PERMISSION_MAP['recruiter:access'] }))
  )

  redirect(
    getRedirectPathAfterWorkspaceChoice({
      workspace,
      orgId: orgId ?? null,
      canAccessRecruiter,
    })
  )
}
