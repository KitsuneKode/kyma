import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { DevSetupHub } from '@/components/dev/dev-setup-hub'
import { isProductionDeployment } from '@/lib/env/deployment-mode'
import { serverEnv } from '@/lib/env/server'

export const metadata = {
  title: 'Dev setup hub',
  description: 'Local Clerk, Convex, and seed tooling for Kyma development.',
}

export default async function DevSetupPage() {
  await connection()

  if (
    isProductionDeployment({
      deploymentEnv: serverEnv.KYMA_DEPLOYMENT_ENV,
      nodeEnv: serverEnv.NODE_ENV,
    })
  ) {
    notFound()
  }

  return <DevSetupHub />
}
