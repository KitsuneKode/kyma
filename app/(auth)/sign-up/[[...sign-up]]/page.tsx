import { redirect } from 'next/navigation'

import { ClerkAuthPanel } from '@/components/auth/clerk-auth-panel'
import { getPostSignInPath, getUserAppAccess } from '@/lib/auth/access'
import { hasClerkServerCredentials } from '@/lib/clerk/config'
import {
  authContinuePath,
  parseWorkspaceIntent,
} from '@/lib/auth/workspace-intent'

type PageProps = {
  searchParams: Promise<{ workspace?: string | string[] }>
}

export default async function SignUpPage({ searchParams }: PageProps) {
  if (!hasClerkServerCredentials()) {
    redirect('/')
  }

  const params = await searchParams
  const intent = parseWorkspaceIntent(params.workspace)

  const access = await getUserAppAccess()
  if (access.isSignedIn) {
    if (access.preferredWorkspace === 'unassigned' && intent) {
      redirect(authContinuePath(intent))
    }
    redirect(getPostSignInPath(access))
  }

  return <ClerkAuthPanel mode="sign-up" intent={intent} />
}
