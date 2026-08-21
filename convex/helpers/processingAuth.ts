import { ConvexError } from 'convex/values'

import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { isProductionDeployment } from '../../lib/env/deployment-mode'
import { convexEnv } from '../../lib/env/convex'

const DEV_PROCESSING_KEY = '__dev_preview__'

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

  // Require an explicit development NODE_ENV — `test` and unset production
  // signals stay fail-closed.
  return (
    env.NODE_ENV === 'development' && !env.KYMA_PROCESSING_WRITE_KEY?.trim()
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
