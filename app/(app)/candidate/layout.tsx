import Link from 'next/link'
import type { ReactNode } from 'react'
import { connection } from 'next/server'

import { requireCandidatePageAccess } from '@/lib/auth/access'

export default async function CandidateLayout({
  children,
}: {
  children: ReactNode
}) {
  await connection()
  await requireCandidatePageAccess()

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <nav className="mb-6 flex flex-wrap gap-4 text-sm">
        <Link href="/candidate">Overview</Link>
        <Link href="/candidate/interviews">Interviews</Link>
        <Link href="/candidate/readiness">Readiness</Link>
        <Link href="/candidate/profile">Profile</Link>
      </nav>
      {children}
    </div>
  )
}
