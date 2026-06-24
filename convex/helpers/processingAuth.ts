import { ConvexError } from 'convex/values'

import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { isConvexDevelopmentMode } from '../../lib/env/deployment-mode'
import { convexEnv } from '../../lib/env/convex'

const DEV_PROCESSING_KEY = '__dev_preview__'

function allowsLocalProcessingKeyFallback() {
  return (
    convexEnv.NODE_ENV === 'development' &&
    isConvexDevelopmentMode(convexEnv) &&
    !convexEnv.KYMA_PROCESSING_WRITE_KEY?.trim()
  )
}

export function hasTrustedProcessingKey(processingKey?: string) {
  const configured = convexEnv.KYMA_PROCESSING_WRITE_KEY?.trim()
  if (!configured) {
    if (!allowsLocalProcessingKeyFallback()) {
      return false
    }
    const normalized = processingKey?.trim() ?? ''
    return normalized === '' || normalized === DEV_PROCESSING_KEY
  }
  return processingKey?.trim() === configured
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
