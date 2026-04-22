import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-5xl items-center justify-center px-6 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm md:p-8">
        {children}
      </section>
    </main>
  )
}
