import { redirect } from 'next/navigation'

import { hasClerkServerCredentials } from '@/lib/clerk/config'

export default function OnboardingPage() {
  if (!hasClerkServerCredentials()) {
    redirect('/sign-in')
  }

  redirect('/auth/continue')
}
