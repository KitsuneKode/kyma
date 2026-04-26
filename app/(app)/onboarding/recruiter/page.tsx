import { OrganizationList } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { personaFromSessionClaims } from '@/lib/auth/clerk-role'

export default async function RecruiterOrgOnboardingPage() {
  const { userId, orgId, sessionClaims } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const persona = personaFromSessionClaims(
    sessionClaims as Record<string, unknown> | null | undefined
  )

  if (persona !== 'recruiter' && persona !== 'both') {
    redirect('/onboarding')
  }

  if (orgId) {
    redirect('/recruiter')
  }

  return (
    <main className="mx-auto flex min-h-[70dvh] w-full max-w-4xl items-center px-6 py-10">
      <section className="w-full rounded-3xl bg-card p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up recruiter organization
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Recruiter access is organization-scoped. Create an organization or
          join one to continue.
        </p>
        <div className="mt-6">
          <OrganizationList
            hidePersonal
            afterCreateOrganizationUrl="/recruiter"
            afterSelectOrganizationUrl="/recruiter"
          />
        </div>
      </section>
    </main>
  )
}
