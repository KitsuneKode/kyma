import { redirect } from 'next/navigation'

import { AuthSetupRequired } from '@/components/auth/auth-setup-required'
import { ClerkAuthPanel } from '@/components/auth/clerk-auth-panel'
import { getUserAppAccess } from '@/lib/auth/access'
import type { WorkspaceIntent } from '@/lib/auth/workspace-intent'
import {
  parseRedirectUrl,
  postAuthRedirectPath,
} from '@/lib/auth/workspace-intent'
import { hasClerkServerCredentials } from '@/lib/clerk/config'
import { getClerkSetupStatus } from '@/lib/clerk/setup-status'

type AuthMode = 'sign-in' | 'sign-up'

type IntentAuthSearchParams = {
  redirect_url?: string | string[]
}

export async function renderIntentAuthPage(
  mode: AuthMode,
  intent: WorkspaceIntent,
  searchParams?: IntentAuthSearchParams
) {
  if (!hasClerkServerCredentials()) {
    const setup = getClerkSetupStatus()
    return (
      <AuthSetupRequired
        missing={setup.missing}
        derivedIssuerDomain={setup.derivedIssuerDomain}
      />
    )
  }

  const redirectUrl = parseRedirectUrl(searchParams?.redirect_url)

  const access = await getUserAppAccess()
  if (access.isSignedIn) {
    redirect(postAuthRedirectPath(intent, redirectUrl))
  }

  return (
    <ClerkAuthPanel mode={mode} intent={intent} redirectUrl={redirectUrl} />
  )
}
