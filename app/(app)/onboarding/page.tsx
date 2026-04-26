import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { roleFromSessionClaims } from '@/lib/auth/clerk-role'

async function chooseRole(formData: FormData) {
  'use server'

  const selectedRole = formData.get('role')
  if (selectedRole !== 'candidate' && selectedRole !== 'recruiter') {
    return
  }

  const { userId, sessionClaims } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const currentRole = roleFromSessionClaims(
    sessionClaims as Record<string, unknown> | null | undefined
  )

  // Do not let onboarding downgrade privileged accounts.
  if (currentRole === 'admin') {
    redirect('/recruiter')
  }

  const client = await clerkClient()
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { role: selectedRole },
  })

  redirect(selectedRole === 'recruiter' ? '/recruiter' : '/candidate')
}

export default async function OnboardingPage() {
  const { userId, sessionClaims } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const role = roleFromSessionClaims(
    sessionClaims as Record<string, unknown> | null | undefined
  )
  if (role === 'admin' || role === 'recruiter') {
    redirect('/recruiter')
  }
  if (role === 'candidate') {
    redirect('/candidate')
  }

  return (
    <main className="mx-auto flex min-h-[60dvh] w-full max-w-3xl items-center px-6 py-10">
      <section className="w-full animate-in rounded-3xl bg-card p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)] duration-300 fade-in-0 zoom-in-95">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome to Kyma
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick your starting workspace. You can still use one login identity for
          both candidate and recruiter journeys.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <form action={chooseRole} className="rounded-2xl border p-5">
            <h2 className="font-medium">Candidate flow</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Join interviews, track outcomes, and continue your personal
              screening journey.
            </p>
            <input name="role" type="hidden" value="candidate" />
            <button
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
              type="submit"
            >
              Continue as candidate
            </button>
          </form>

          <form action={chooseRole} className="rounded-2xl border p-5">
            <h2 className="font-medium">Recruiter flow</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage screenings, review candidates, and run recruiting
              operations.
            </p>
            <input name="role" type="hidden" value="recruiter" />
            <button
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
              type="submit"
            >
              Continue as recruiter
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
