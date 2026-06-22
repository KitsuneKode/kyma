import { DevSetupHub } from '@/components/dev/dev-setup-hub'
import { getClerkSetupStatus } from '@/lib/clerk/setup-status'
import { isProductionDeployment } from '@/lib/env/deployment-mode'
import { serverEnv } from '@/lib/env/server'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

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

  const setupStatus = getClerkSetupStatus()

  return <DevSetupHub setupStatus={setupStatus} />
}
