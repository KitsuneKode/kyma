import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kyma Write-Up',
  description: 'Product and engineering write-up for Kyma.',
}

async function readWriteUp() {
  const filePath = path.join(process.cwd(), 'WRITE_UP.md')
  return fs.readFile(filePath, 'utf-8')
}

export default async function WriteUpPage() {
  const content = await readWriteUp()

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <section className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">
        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Kyma
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Write-Up</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Live version of the repository&apos;s `WRITE_UP.md`.
        </p>
      </section>

      <article className="mt-6 rounded-2xl border bg-card p-6 shadow-sm md:p-8">
        <pre className="overflow-x-auto text-sm leading-7 whitespace-pre-wrap">
          {content}
        </pre>
      </article>
    </main>
  )
}
