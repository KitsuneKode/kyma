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

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a] p-6">
      <div className="w-full max-w-md rounded-3xl bg-card/95 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_20px_60px_rgba(0,0,0,0.45)]">
        <SignIn />
      </div>
    </main>
  )
}
