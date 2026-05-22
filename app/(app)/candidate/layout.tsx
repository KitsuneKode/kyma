import type { ReactNode } from 'react'
import { connection } from 'next/server'

import { WorkspacePromptBanner } from '@/components/auth/workspace-prompt-banner'
import { CandidateNav } from '@/components/candidate/candidate-nav'
import { requireCandidatePageAccess } from '@/lib/auth/access'
export default async function CandidateLayout({
  children,
}: {
  children: ReactNode
}) {
  await connection()
  const access = await requireCandidatePageAccess()

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <CandidateNav />
      {access.preferredWorkspace === 'unassigned' ? (
        <WorkspacePromptBanner variant="candidate-default" />
      ) : null}
      {children}
    </div>
  )
}
