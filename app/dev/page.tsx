import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { DevSetupHub } from '@/components/dev/dev-setup-hub'

export const metadata = {
  title: 'Dev setup hub',
  description: 'Local Clerk, Convex, and seed tooling for Kyma development.',
}

export default async function DevSetupPage() {
  await connection()

  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <DevSetupHub />
}
