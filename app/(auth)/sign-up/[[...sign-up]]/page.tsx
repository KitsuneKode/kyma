import { SignUp } from '@clerk/nextjs'
import { redirect } from 'next/navigation'

import { getPostSignInPath, getUserAppAccess } from '@/lib/auth/access'
import { hasClerkServerCredentials } from '@/lib/clerk/config'

export default async function SignUpPage() {
  if (!hasClerkServerCredentials()) {
    redirect('/')
  }

  const access = await getUserAppAccess()
  if (access.isSignedIn) {
    redirect(getPostSignInPath(access))
  }

  return <SignUp />
}
