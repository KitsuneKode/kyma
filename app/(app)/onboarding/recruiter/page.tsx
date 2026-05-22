import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { AuthDebugBanner } from '@/components/auth/auth-debug-banner'
import { RecruiterOrgOnboarding } from '@/components/auth/recruiter-org-onboarding'
import {
  hasLegacyBothPersona,
  preferredWorkspaceFromSessionClaims,
  RECRUITER_PERMISSION_MAP,
} from '@/lib/auth/clerk-role'
import { resolveAppRoute } from '@/lib/auth/routing'

type PageProps = {
  searchParams: Promise<{ setup?: string | string[] }>
}

export default async function RecruiterOrgOnboardingPage({
  searchParams,
}: PageProps) {
  const { userId, orgId, sessionClaims, has } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const params = await searchParams
  const setupHint = Array.isArray(params.setup) ? params.setup[0] : params.setup

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
  const showJwtSetupHint =
    setupHint === 'jwt' || Boolean(orgId && !canAccessRecruiter)

  const redirectTarget = resolveAppRoute({
    pathname: '/onboarding/recruiter',
    isSignedIn: true,
    preferredWorkspace,
    hasLegacyBoth,
    orgId: orgId ?? null,
    canAccessRecruiter,
  })
  if (redirectTarget && redirectTarget !== '/onboarding/recruiter') {
    redirect(redirectTarget)
  }

  return (
    <main className="mx-auto flex min-h-[70dvh] w-full max-w-4xl items-center px-6 py-10">
      <section className="w-full rounded-3xl bg-card p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
        <AuthDebugBanner />
        {showJwtSetupHint ? (
          <aside className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
            <p className="font-medium">
              Organization selected, but recruiter access is not in your session
              yet
            </p>
            <p className="mt-1 text-muted-foreground">
              In Clerk Dashboard → Sessions → Customize session token, include{' '}
              <code className="text-xs">org_id</code>,{' '}
              <code className="text-xs">org_role</code>, and{' '}
              <code className="text-xs">org_permissions</code> (see{' '}
              <code className="text-xs">
                .docs/auth-org-rbac-cutover-checklist.md
              </code>
              ). Then sign out and sign in again, or run{' '}
              <code className="text-xs">bun run clerk:setup-auth</code>.
            </p>
          </aside>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up recruiter organization
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Recruiter access is organization-scoped. Create an organization or
          join one to continue.
        </p>
        <div className="mt-6">
          <RecruiterOrgOnboarding />
        </div>
      </section>
    </main>
  )
}
