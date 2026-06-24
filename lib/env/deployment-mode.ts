import { resolveRuntimeMode, type RuntimeMode } from '@/lib/runtime-mode'

export function resolveDeploymentMode(options: {
  deploymentEnv?: string
  nodeEnv?: string
}): RuntimeMode {
  return resolveRuntimeMode(options.deploymentEnv ?? options.nodeEnv)
}

export function isProductionDeployment(options: {
  deploymentEnv?: string
  nodeEnv?: string
}) {
  return resolveDeploymentMode(options) === 'production'
}

export function isDevelopmentDeployment(options: {
  deploymentEnv?: string
  nodeEnv?: string
}) {
  return !isProductionDeployment(options)
}

/** Maps Convex env field names onto the generic deployment helper. */
export function isConvexDevelopmentMode(env: {
  KYMA_DEPLOYMENT_ENV?: string
  NODE_ENV?: string
}) {
  return isDevelopmentDeployment({
    deploymentEnv: env.KYMA_DEPLOYMENT_ENV,
    nodeEnv: env.NODE_ENV,
  })
}
