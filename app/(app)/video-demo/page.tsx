import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Kyma Video Demo',
  description: 'Kyma product demo and walkthrough links.',
}

export default function VideoDemoPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <section className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Kyma
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Video Demo
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Demo video is being finalized. Use the write-up and script links below
          for full context in the meantime.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/write-up"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Open Write-Up
          </Link>
        </div>
      </section>
    </main>
  )
}
