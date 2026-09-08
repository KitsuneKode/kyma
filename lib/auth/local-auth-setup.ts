import { isDevelopmentDeployment } from '@/lib/env/deployment-mode'

export type AuthSetupSurface = 'local' | 'hosted'

/**
 * Local setup copy (env names, bun commands, /dev) is only for true local
 * development. Vercel preview/production and `next start` stay product-facing.
 */
export function shouldExposeLocalAuthSetup(options: {
  deploymentEnv?: string
  nodeEnv?: string
  vercelEnv?: string
}) {
  if (options.vercelEnv === 'production' || options.vercelEnv === 'preview') {
    return false
  }

  return isDevelopmentDeployment({
    deploymentEnv: options.deploymentEnv,
    nodeEnv: options.nodeEnv,
  })
}

export function resolveAuthSetupSurface(options: {
  deploymentEnv?: string
  nodeEnv?: string
  vercelEnv?: string
}): AuthSetupSurface {
  return shouldExposeLocalAuthSetup(options) ? 'local' : 'hosted'
}
