import Link from 'next/link'

import { ScreeningCreationForm } from '@/components/admin/screening-creation-form'
import { Button } from '@/components/ui/button'

export default function NewScreeningPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Screening Ops
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Create screening batch
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              This is the first real admin creation flow. It creates invite
              links for an allowed list of candidates instead of leaving access
              open.
            </p>
          </div>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/admin/screenings" />}
          >
            Back to screenings
          </Button>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <ScreeningCreationForm />
      </section>
    </main>
  )
}
