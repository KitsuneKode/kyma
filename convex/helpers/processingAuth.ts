import { ConvexError } from 'convex/values'

import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { isDevelopmentMode } from '../../lib/runtime-mode'
import { runtimeEnv } from '../../lib/env/runtime'

export function hasTrustedProcessingKey(processingKey?: string) {
  const configured = runtimeEnv.KYMA_PROCESSING_WRITE_KEY?.trim()
  if (configured) {
    return processingKey?.trim() === configured
  }
  return isDevelopmentMode(runtimeEnv.NODE_ENV)
}

export async function resolveOrgIdForPipelineWrite(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<'interviewSessions'>,
  processingKey?: string
) {
  if (!hasTrustedProcessingKey(processingKey)) {
    throw new ConvexError('Invalid processing key for pipeline write.')
  }

  const session = await ctx.db.get(sessionId)
  const orgId = session?.orgId?.trim()
  if (!orgId) {
    throw new ConvexError('Interview session not found for processing.')
  }

  return orgId
}
