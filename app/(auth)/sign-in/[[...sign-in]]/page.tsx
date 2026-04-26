import { SignIn } from '@clerk/nextjs'
import { redirect } from 'next/navigation'

import { getPostSignInPath, getUserAppAccess } from '@/lib/auth/access'
import { hasClerkServerCredentials } from '@/lib/clerk/config'

export default async function SignInPage() {
  if (!hasClerkServerCredentials()) {
    redirect('/')
  }

  const access = await getUserAppAccess()
  if (access.isSignedIn) {
    redirect(getPostSignInPath(access))
  }

  return <SignIn />
}
