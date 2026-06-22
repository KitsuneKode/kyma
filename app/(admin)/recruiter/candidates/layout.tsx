import type { ReactNode } from 'react'

import { requireOrgPermission } from '@/lib/auth/access'

export default async function RecruiterCandidatesLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireOrgPermission('recruiter:candidates:read')

  return <>{children}</>
}
