import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { personaFromSessionClaims } from '@/lib/auth/clerk-role'
import { Button } from '@/components/ui/button'

async function choosePersona(formData: FormData) {
  'use server'

  const selectedPersona = formData.get('persona')
  if (
    selectedPersona !== 'candidate' &&
    selectedPersona !== 'recruiter' &&
    selectedPersona !== 'both'
  ) {
    return
  }

  const { userId, sessionClaims } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const currentPersona = personaFromSessionClaims(
    sessionClaims as Record<string, unknown> | null | undefined
  )

  const client = await clerkClient()
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { persona: selectedPersona },
  })

  if (selectedPersona === 'recruiter' || selectedPersona === 'both') {
    redirect('/onboarding/recruiter')
  }

  if (currentPersona === 'recruiter') {
    redirect('/recruiter')
  }
  redirect('/candidate')
}

export default async function OnboardingPage() {
  const { userId, sessionClaims } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const persona = personaFromSessionClaims(
    sessionClaims as Record<string, unknown> | null | undefined
  )
  if (persona === 'recruiter') {
    const { orgId } = await auth()
    if (orgId) {
      redirect('/recruiter')
    }
    redirect('/onboarding/recruiter')
  }
  if (persona === 'candidate') {
    redirect('/candidate')
  }
  if (persona === 'both') {
    const { orgId } = await auth()
    if (orgId) {
      redirect('/recruiter')
    }
    redirect('/onboarding/recruiter')
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
          <form action={choosePersona} className="rounded-2xl border p-5">
            <h2 className="font-medium">Candidate flow</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Join interviews, track outcomes, and continue your personal
              screening journey.
            </p>
            <input name="persona" type="hidden" value="candidate" />
            <Button type="submit" className="mt-4 w-full">
              Continue as candidate
            </Button>
          </form>

          <form action={choosePersona} className="rounded-2xl border p-5">
            <h2 className="font-medium">Recruiter flow</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage screenings, review candidates, and run recruiting
              operations.
            </p>
            <input name="persona" type="hidden" value="recruiter" />
            <Button type="submit" className="mt-4 w-full">
              Continue as recruiter
            </Button>
          </form>

          <form
            action={choosePersona}
            className="rounded-2xl border p-5 md:col-span-2"
          >
            <h2 className="font-medium">Both contexts</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Keep one login for both candidate and recruiter workflows.
            </p>
            <input name="persona" type="hidden" value="both" />
            <Button type="submit" className="mt-4 w-full">
              Continue with both
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}
