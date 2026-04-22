export type RuntimeMode = 'development' | 'production'

export function resolveRuntimeMode(
  nodeEnv: string | undefined = process.env.NODE_ENV
): RuntimeMode {
  return nodeEnv === 'production' ? 'production' : 'development'
}

export function isDevelopmentMode(
  nodeEnv: string | undefined = process.env.NODE_ENV
) {
  return resolveRuntimeMode(nodeEnv) === 'development'
}
