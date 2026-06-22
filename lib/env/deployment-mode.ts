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
