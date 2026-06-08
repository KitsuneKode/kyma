import { redirect } from 'next/navigation'

import { ClerkAuthPanel } from '@/components/auth/clerk-auth-panel'
import { getUserAppAccess } from '@/lib/auth/access'
import type { WorkspaceIntent } from '@/lib/auth/workspace-intent'
import { authContinuePath } from '@/lib/auth/workspace-intent'
import { hasClerkServerCredentials } from '@/lib/clerk/config'

type AuthMode = 'sign-in' | 'sign-up'

export async function renderIntentAuthPage(
  mode: AuthMode,
  intent: WorkspaceIntent
) {
  if (!hasClerkServerCredentials()) {
    redirect('/')
  }

  const access = await getUserAppAccess()
  if (access.isSignedIn) {
    redirect(authContinuePath(intent))
  }

  return <ClerkAuthPanel mode={mode} intent={intent} />
}
