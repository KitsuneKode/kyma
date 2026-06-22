import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { RecruiterOrgOnboarding } from '@/components/auth/recruiter-org-onboarding'
import {
  preferredWorkspaceFromSessionClaims,
  resolveRecruiterAccess,
} from '@/lib/auth/clerk-role'
import { resolveAppRoute } from '@/lib/auth/routing'

export default async function RecruiterSetupPage() {
  const { userId, orgId, sessionClaims, has } = await auth()
  if (!userId) {
    redirect('/sign-in/recruiter')
  }

  const sessionClaimsRecord = sessionClaims as
    | Record<string, unknown>
    | null
    | undefined
  const preferredWorkspace =
    preferredWorkspaceFromSessionClaims(sessionClaimsRecord)
  const { canAccessRecruiter } = resolveRecruiterAccess({ orgId, has })

  const redirectTarget = resolveAppRoute({
    pathname: '/recruiter/setup',
    isSignedIn: true,
    preferredWorkspace,
    orgId: orgId ?? null,
    canAccessRecruiter,
  })
  if (redirectTarget && redirectTarget !== '/recruiter/setup') {
    redirect(redirectTarget)
  }

  return (
    <main className="mx-auto flex min-h-[70dvh] w-full max-w-4xl items-center px-6 py-10">
      <section className="w-full rounded-3xl bg-card p-8 shadow-[var(--shadow-md)] ring-1 ring-border/40">
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up your organization
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create an organization or join an existing one to start screening
          candidates.
        </p>
        <div className="mt-6">
          <RecruiterOrgOnboarding />
        </div>
      </section>
    </main>
  )
}
