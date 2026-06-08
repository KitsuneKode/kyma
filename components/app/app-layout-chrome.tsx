'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Show, UserButton } from '@clerk/nextjs'

import { WorkspaceSwitcher } from '@/components/auth/workspace-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { signInPath } from '@/lib/auth/workspace-intent'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PreferredWorkspace } from '@/lib/auth/clerk-role'

export function AppLayoutChrome({
  children,
  clerkEnabled,
  isSignedIn,
  preferredWorkspace,
  canAccessRecruiter,
}: {
  children: ReactNode
  clerkEnabled: boolean
  isSignedIn: boolean
  preferredWorkspace: PreferredWorkspace | null
  canAccessRecruiter: boolean
}) {
  const pathname = usePathname()
  const isCandidateWorkspace = pathname?.startsWith('/candidate')

  if (isCandidateWorkspace) {
    return <>{children}</>
  }

  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link className="font-semibold" href="/">
              Kyma
            </Link>
            {isSignedIn ? (
              <WorkspaceSwitcher
                preferredWorkspace={preferredWorkspace}
                canAccessRecruiter={canAccessRecruiter}
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
