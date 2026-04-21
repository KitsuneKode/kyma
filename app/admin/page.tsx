import Link from "next/link"

import { Button } from "@/components/ui/button"

const nowTasks = [
  "Candidate review queue",
  "Session lifecycle persistence",
  "Live transcript storage",
  "Report and evidence schema",
]

const futureTasks = [
  "Screening creation",
  "Candidate eligibility gating",
  "Replay and recording review",
  "Grounded recruiter AI chat",
]

export default function AdminPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Admin Workspace
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Build Queue</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          The recruiter side is now moving from placeholder shell into a real
          review workflow. This page is the handoff point into the actual admin
          surfaces we are building next.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link href="/admin/candidates" />}>
            Open Candidate Queue
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/admin/screenings" />}
          >
            Open Screenings
          </Button>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold">Current Focus</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {nowTasks.map((task) => (
              <li key={task} className="rounded-lg border px-4 py-3">
                {task}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold">Future Scope</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {futureTasks.map((task) => (
              <li key={task} className="rounded-lg border px-4 py-3">
                {task}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  )
}
