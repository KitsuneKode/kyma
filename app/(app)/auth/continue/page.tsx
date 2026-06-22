import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import {
  resolveWorkspaceForContinue,
  shouldPersistWorkspaceForContinue,
} from '@/lib/auth/continue-workspace'
import {
  preferredWorkspaceFromSessionClaims,
  resolveRecruiterAccess,
} from '@/lib/auth/clerk-role'
import {
  getPreferredWorkspaceFromClerk,
  getRedirectPathAfterWorkspaceChoice,
  setPreferredWorkspaceHint,
} from '@/lib/auth/workspace'
import {
  parseRedirectUrl,
  parseWorkspaceIntent,
} from '@/lib/auth/workspace-intent'
import { hasClerkServerCredentials } from '@/lib/clerk/config'

type PageProps = {
  searchParams: Promise<{
    workspace?: string | string[]
    redirect_url?: string | string[]
  }>
}

export default async function AuthContinuePage({ searchParams }: PageProps) {
  if (!hasClerkServerCredentials()) {
    redirect('/sign-in')
  }

  const { userId, orgId, has, sessionClaims } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const params = await searchParams
  const explicitIntent = parseWorkspaceIntent(params.workspace)
  const redirectUrl = parseRedirectUrl(params.redirect_url)
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

  const { canAccessRecruiter } = resolveRecruiterAccess({ orgId, has })

  if (redirectUrl) {
    redirect(redirectUrl)
  }

  redirect(
    getRedirectPathAfterWorkspaceChoice({
      workspace,
      orgId: orgId ?? null,
      canAccessRecruiter,
    })
  )
}
