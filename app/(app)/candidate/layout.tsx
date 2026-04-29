import type { ReactNode } from 'react'
import { connection } from 'next/server'

import { requireCandidatePageAccess } from '@/lib/auth/access'
import { CandidateNav } from '@/components/candidate/candidate-nav'

export default async function CandidateLayout({
  children,
}: {
  children: ReactNode
}) {
  await connection()
  await requireCandidatePageAccess()

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <CandidateNav />
      {children}
    </div>
  )
}
