import type { ReactNode } from 'react'

import { requireRecruiterPageAccess } from '@/lib/auth/access'

export default async function RecruiterSettingsLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireRecruiterPageAccess()

  return <>{children}</>
}
