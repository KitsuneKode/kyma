import type { ReactNode } from 'react'
import { connection } from 'next/server'

export default async function AuthLayout({
  children,
}: {
  children: ReactNode
}) {
  await connection()

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#0a0a0a] p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(232,255,71,0.08),transparent_40%)]"
      />
      <section className="relative z-10 w-full max-w-md">{children}</section>
    </main>
  )
}
