import Link from 'next/link'
import type { ReactNode } from 'react'
import { connection } from 'next/server'
import { Show, UserButton } from '@clerk/nextjs'

import { WorkspaceSwitcher } from '@/components/auth/workspace-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { getUserAppAccess } from '@/lib/auth/access'
import { signInPath } from '@/lib/auth/workspace-intent'
import { hasClerkServerCredentials } from '@/lib/clerk/config'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
    <>
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link className="font-semibold" href="/">
              Kyma
            </Link>
            {access?.isSignedIn ? (
              <WorkspaceSwitcher
                preferredWorkspace={preferredWorkspace}
                canAccessRecruiter={access.canAccessRecruiter}
              />
            ) : null}
            <Link
              className="text-muted-foreground transition-colors hover:text-foreground"
              href="/interviews/demo-invite"
            >
              Demo interview
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {clerkEnabled ? (
              <>
                <Show when="signed-out">
                  <Link
                    href={signInPath('candidate')}
                    className={cn(
                      buttonVariants({ variant: 'ghost', size: 'sm' })
                    )}
                  >
                    Candidate sign in
                  </Link>
                  <Link
                    href={signInPath('recruiter')}
                    className={cn(buttonVariants({ size: 'sm' }))}
                  >
                    Recruiter sign in
                  </Link>
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                Clerk disabled for local public-flow testing
              </span>
            )}
          </div>
        </div>
      </header>
      {children}
    </>
  )
}
