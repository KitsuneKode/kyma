export type RuntimeMode = 'development' | 'production'

export function resolveRuntimeMode(nodeEnv: string | undefined): RuntimeMode {
  return nodeEnv === 'production' ? 'production' : 'development'
}

export function isDevelopmentMode(nodeEnv: string | undefined) {
  return resolveRuntimeMode(nodeEnv) === 'development'
}
