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
 * True only when the deployment has EXPLICITLY opted in to development.
 *
 * Two facts force this shape, both verified against a live Convex deployment:
 *
 * 1. `lib/env/shared.ts` declares NODE_ENV with `.default('development')`, so
 *    the validated env shims report `'development'` on a deployment where the
 *    variable was never set. A guard reading the shim passes in production.
 * 2. The Convex runtime pins `process.env.NODE_ENV` to `'production'` and
 *    ignores `convex env set NODE_ENV`. NODE_ENV therefore cannot express
 *    "this is a dev deployment" on the backend at all.
 *
 * `KYMA_DEPLOYMENT_ENV` is the only signal an operator actually controls on
 * Convex, so it is authoritative: it must be explicitly `'development'`.
 * Unset fails closed, `'production'` fails closed, and a real production
 * deployment has no reason to ever carry the development value.
 */
export function isExplicitDevelopmentEnv(deploymentEnv?: string) {
  if (deploymentEnv !== 'development') {
    return false
  }

  // On Convex, NODE_ENV is pinned and carries no information, so the explicit
  // opt-in above is the whole signal. Everywhere NODE_ENV IS meaningful
  // (Next.js server, scripts, the agent worker) it must also agree: only an
  // unset or explicitly development value qualifies, so `test` and
  // `production` both fail closed.
  if (isConvexRuntime()) {
    return true
  }

  const nodeEnv = readNodeEnv()
  return nodeEnv === undefined || nodeEnv === 'development'
}

/**
 * Convex pins NODE_ENV to `'production'` in every deployment, dev included, so
 * NODE_ENV cannot be used to distinguish environments there.
 */
function isConvexRuntime() {
  return (
    typeof process !== 'undefined' && Boolean(process.env?.CONVEX_CLOUD_URL)
  )
}

export function allowDevPreviewRoutes() {
  return !isProductionNodeEnv()
}
