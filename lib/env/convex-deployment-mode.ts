import { isProductionDeployment } from '@/lib/env/deployment-mode'

type ConvexDeploymentEnv = {
  KYMA_DEPLOYMENT_ENV?: string
  NODE_ENV?: string
}

export function isConvexDevelopmentMode(env: ConvexDeploymentEnv) {
  return !isProductionDeployment({
    deploymentEnv: env.KYMA_DEPLOYMENT_ENV,
    nodeEnv: env.NODE_ENV,
  })
}
