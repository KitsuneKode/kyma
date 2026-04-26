import Link from 'next/link'
import type { ReactNode } from 'react'
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'

import { ThemeToggle } from '@/components/theme-toggle'
import { hasClerkServerCredentials } from '@/lib/clerk/config'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const clerkEnabled = hasClerkServerCredentials()
  const authState = clerkEnabled ? await auth() : null
  const role = (
    authState?.sessionClaims?.metadata as { role?: string } | undefined
  )?.role

  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-4 text-sm">
            <Link className="font-semibold" href="/">
              Kyma
            </Link>
            {role === 'admin' || role === 'recruiter' ? (
              <Link
                className="text-muted-foreground transition-colors hover:text-foreground"
                href="/admin"
              >
                Admin
              </Link>
            ) : null}
            <Link
              className="text-muted-foreground transition-colors hover:text-foreground"
              href="/interviews/demo-invite"
            >
              Candidate Flow
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {clerkEnabled ? (
              <>
                <Show when="signed-out">
                  <SignInButton />
                  <SignUpButton />
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
