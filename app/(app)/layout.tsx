import type { ReactNode } from 'react'
import { connection } from 'next/server'

import { AppLayoutChrome } from '@/components/app/app-layout-chrome'
import { getUserAppAccess } from '@/lib/auth/access'
import { hasClerkServerCredentials } from '@/lib/clerk/config'

export default async function AppLayout({ children }: { children: ReactNode }) {
  await connection()
  const clerkEnabled = hasClerkServerCredentials()
  const access = clerkEnabled ? await getUserAppAccess() : null
  const preferredWorkspace =
    access?.isSignedIn &&
    access.preferredWorkspace !== 'anonymous' &&
    access.preferredWorkspace !== 'unassigned'
      ? access.preferredWorkspace
      : null

  return (
    <AppLayoutChrome
      clerkEnabled={clerkEnabled}
      isSignedIn={access?.isSignedIn ?? false}
      preferredWorkspace={preferredWorkspace}
      canAccessRecruiter={access?.canAccessRecruiter ?? false}
    >
      {children}
    </AppLayoutChrome>
  )
}
