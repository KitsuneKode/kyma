import type { ReactNode } from 'react'

import { requireOrgPermission } from '@/lib/auth/access'

export default async function RecruiterSettingsLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireOrgPermission('recruiter:settings:write')

  return <>{children}</>
}
