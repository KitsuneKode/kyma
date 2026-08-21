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

/**
 * True only when BOTH deployment signals explicitly say development.
 *
 * `lib/env/shared.ts` declares NODE_ENV with `.default('development')`, so the
 * validated shims report `'development'` on a deployment where the variable was
 * never set. Guards that gate destructive or trust-granting behaviour must use
 * this raw reader, where unset stays unset, rather than the shim.
 */
export function isExplicitDevelopmentEnv(deploymentEnv?: string) {
  return readNodeEnv() === 'development' && deploymentEnv === 'development'
}

export function allowDevPreviewRoutes() {
  return !isProductionNodeEnv()
}
