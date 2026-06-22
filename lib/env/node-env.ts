import { resolveRuntimeMode, type RuntimeMode } from '@/lib/runtime-mode'

/**
 * Narrow adapter for NODE_ENV reads outside t3-env modules (middleware, client
 * diagnostics). Prefer boundary env modules when the runtime allows it.
 */
export function readNodeEnv() {
  return process.env.NODE_ENV
}

export function getRuntimeModeFromNodeEnv(): RuntimeMode {
  return resolveRuntimeMode(readNodeEnv())
}

export function isProductionNodeEnv() {
  return getRuntimeModeFromNodeEnv() === 'production'
}

export function allowDevPreviewRoutes() {
  return !isProductionNodeEnv()
}
