import { redirect } from 'next/navigation'

import { AuthSetupRequired } from '@/components/auth/auth-setup-required'
import { ClerkAuthPanel } from '@/components/auth/clerk-auth-panel'
import { getPostSignInPath, getUserAppAccess } from '@/lib/auth/access'
import { hasClerkServerCredentials } from '@/lib/clerk/config'
import { getClerkSetupStatus } from '@/lib/clerk/setup-status'
import {
  parseRedirectUrl,
  parseWorkspaceIntent,
  postAuthRedirectPath,
} from '@/lib/auth/workspace-intent'

type PageProps = {
  searchParams: Promise<{
    workspace?: string | string[]
    redirect_url?: string | string[]
  }>
}

export default async function SignUpPage({ searchParams }: PageProps) {
  if (!hasClerkServerCredentials()) {
    const setup = getClerkSetupStatus()
    return (
      <AuthSetupRequired
        missing={setup.missing}
        derivedIssuerDomain={setup.derivedIssuerDomain}
      />
    )
  }

  const params = await searchParams
  const intent = parseWorkspaceIntent(params.workspace)
  const redirectUrl = parseRedirectUrl(params.redirect_url)

  const access = await getUserAppAccess()
  if (access.isSignedIn) {
    if (intent || redirectUrl) {
      redirect(postAuthRedirectPath(intent, redirectUrl))
    }
    redirect(getPostSignInPath(access))
  }

  return (
    <ClerkAuthPanel mode="sign-up" intent={intent} redirectUrl={redirectUrl} />
  )
}
