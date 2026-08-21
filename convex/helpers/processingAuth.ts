import { ConvexError } from 'convex/values'

import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { isProductionDeployment } from '../../lib/env/deployment-mode'
import { convexEnv } from '../../lib/env/convex'

const DEV_PROCESSING_KEY = '__dev_preview__'

/**
 * Reads NODE_ENV from the raw process environment, NOT from the validated env
 * shim.
 *
 * `lib/env/shared.ts` declares `NODE_ENV` with `.default('development')`, so
 * `convexEnv.NODE_ENV` is the string `'development'` on a deployment where the
 * variable was never set. Every "is this explicitly development?" check that
 * reads the shim therefore passes in production. Guards that gate destructive
 * or trust-granting behaviour must consult the raw value, where unset stays
 * unset.
 */
export function rawNodeEnv(): string | undefined {
  return typeof process === 'undefined' ? undefined : process.env?.NODE_ENV
}

/**
 * True only when BOTH deployment signals explicitly say development. Absence of
 * a production signal is not evidence of development.
 */
export function isExplicitDevelopmentDeployment(env: ProcessingAuthEnv) {
  return (
    rawNodeEnv() === 'development' && env.KYMA_DEPLOYMENT_ENV === 'development'
  )
}

type ProcessingAuthEnv = {
  NODE_ENV?: string
  KYMA_DEPLOYMENT_ENV?: string
  KYMA_PROCESSING_WRITE_KEY?: string
}

/**
 * Local/dev empty-key bypass is allowed only when the deployment is clearly
 * development. Production and any non-dev Convex deployment must never trust
 * a missing `KYMA_PROCESSING_WRITE_KEY` (including empty caller keys).
 */
export function allowsLocalProcessingKeyFallback(env: ProcessingAuthEnv) {
  if (
    isProductionDeployment({
      deploymentEnv: env.KYMA_DEPLOYMENT_ENV,
      nodeEnv: env.NODE_ENV,
    })
  ) {
    return false
  }

  // Both signals must explicitly say development. Reading the validated shim
  // here would accept an unset NODE_ENV as `'development'` and trust an empty
  // key on a production deployment.
  return (
    isExplicitDevelopmentDeployment(env) &&
    !env.KYMA_PROCESSING_WRITE_KEY?.trim()
  )
}

/**
 * Length-independent comparison so a shared secret cannot be recovered by
 * timing a byte-by-byte prefix match.
 */
export function secretsMatch(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }

  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return mismatch === 0
}

export function hasTrustedProcessingKeyForEnv(
  env: ProcessingAuthEnv,
  processingKey?: string
) {
  const configured = env.KYMA_PROCESSING_WRITE_KEY?.trim()
  if (!configured) {
    if (!allowsLocalProcessingKeyFallback(env)) {
      return false
    }
    const normalized = processingKey?.trim() ?? ''
    return normalized === '' || normalized === DEV_PROCESSING_KEY
  }
  return secretsMatch(processingKey?.trim() ?? '', configured)
}

export function hasTrustedProcessingKey(processingKey?: string) {
  return hasTrustedProcessingKeyForEnv(convexEnv, processingKey)
}

/**
 * Resolves a session's org scope for a trusted write whose caller has already
 * been authenticated (e.g. inside a `pipelineMutation`). Does not re-check the
 * processing key — use {@link resolveOrgIdForPipelineWrite} when the key still
 * needs validating (dual-gate read paths).
 */
export async function requireSessionOrgId(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<'interviewSessions'>
) {
  const session = await ctx.db.get(sessionId)
  const orgId = session?.orgId?.trim()
  if (!orgId) {
    throw new ConvexError('Interview session not found for processing.')
  }

  return orgId
}

export async function resolveOrgIdForPipelineWrite(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<'interviewSessions'>,
  processingKey?: string
) {
  if (!hasTrustedProcessingKey(processingKey)) {
    throw new ConvexError('Invalid processing key for pipeline write.')
  }

  return await requireSessionOrgId(ctx, sessionId)
}

/**
 * Fail-closed guard for secret-bearing webhook endpoints (Clerk, Dodo).
 *
 * These are internet-reachable and grant billing and identity writes, so they
 * require a CONFIGURED key in every deployment mode - the local empty-key
 * convenience that `hasTrustedProcessingKey` allows must never apply to them.
 */
export function hasConfiguredWebhookKey(writeKey?: string) {
  const configured = convexEnv.KYMA_PROCESSING_WRITE_KEY?.trim()
  if (!configured) {
    return false
  }
  return secretsMatch(writeKey?.trim() ?? '', configured)
}
