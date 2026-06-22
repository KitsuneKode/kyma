import { ConvexError } from 'convex/values'

import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { isDevelopmentMode } from '../../lib/runtime-mode'
import { runtimeEnv } from '../../lib/env/runtime'

const DEV_PROCESSING_KEY = '__dev_preview__'

export function hasTrustedProcessingKey(processingKey?: string) {
  const configured = runtimeEnv.KYMA_PROCESSING_WRITE_KEY?.trim()
  if (!configured) {
    if (!isDevelopmentMode(runtimeEnv.NODE_ENV)) {
      return false
    }
    const normalized = processingKey?.trim() ?? ''
    return normalized === '' || normalized === DEV_PROCESSING_KEY
  }
  return processingKey?.trim() === configured
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
