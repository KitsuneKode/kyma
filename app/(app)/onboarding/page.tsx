import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { AuthDebugBanner } from '@/components/auth/auth-debug-banner'
import { WorkspaceOnboardingForm } from '@/components/auth/workspace-onboarding-form'
import {
  hasLegacyBothPersona,
  preferredWorkspaceFromSessionClaims,
  RECRUITER_PERMISSION_MAP,
} from '@/lib/auth/clerk-role'
import { resolveAppRoute } from '@/lib/auth/routing'

export default async function OnboardingPage() {
  const { userId, sessionClaims, orgId, has } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const sessionClaimsRecord = sessionClaims as
    | Record<string, unknown>
    | null
    | undefined
  const preferredWorkspace =
    preferredWorkspaceFromSessionClaims(sessionClaimsRecord)
  const hasLegacyBoth = hasLegacyBothPersona(sessionClaimsRecord)
  const canAccessRecruiter = Boolean(
    orgId &&
    (has?.({ role: 'org:admin' }) ||
      has?.({ permission: RECRUITER_PERMISSION_MAP['recruiter:access'] }))
  )

  const redirectTarget = resolveAppRoute({
    pathname: '/onboarding',
    isSignedIn: true,
    preferredWorkspace,
    hasLegacyBoth,
    orgId: orgId ?? null,
    canAccessRecruiter,
  })
  if (redirectTarget && redirectTarget !== '/onboarding') {
    redirect(redirectTarget)
  }

  return (
    <main className="mx-auto flex min-h-[60dvh] w-full max-w-3xl items-center px-6 py-10">
      <section className="w-full animate-in rounded-3xl bg-card p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)] duration-300 fade-in-0 zoom-in-95">
        <AuthDebugBanner />
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome to Kyma
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose where to start, or use dedicated entry points next time:{' '}
          <span className="text-foreground">/sign-in/candidate</span> and{' '}
          <span className="text-foreground">/sign-in/recruiter</span>.
        </p>

        <WorkspaceOnboardingForm className="mt-6" />
      </section>
    </main>
  )
}
