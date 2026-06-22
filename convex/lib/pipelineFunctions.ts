import {
  customMutation,
  customQuery,
} from 'convex-helpers/server/customFunctions'
import { ConvexError, v } from 'convex/values'

import { mutation, query } from '../_generated/server'
import { hasTrustedProcessingKey } from '../helpers/processingAuth'

/**
 * Single trusted-pipeline auth gate. Wraps `query`/`mutation` so that
 * server-origin callers (the LiveKit agent, the post-interview processing
 * pipeline, worker heartbeats, webhook ingestion) authenticate with the
 * shared processing key in exactly one place.
 *
 * The `processingKey` arg is consumed by the wrapper and stripped before the
 * handler runs, so handlers never see — or re-check — the key. An invalid or
 * missing key fails loudly with a `ConvexError` rather than silently no-oping,
 * which keeps misconfiguration observable instead of dropping writes.
 */
const pipelineAuth = {
  args: { processingKey: v.optional(v.string()) },
  input: async (
    _ctx: unknown,
    { processingKey }: { processingKey?: string }
  ) => {
    if (!hasTrustedProcessingKey(processingKey)) {
      throw new ConvexError('Invalid processing key for pipeline call.')
    }
    return { ctx: {}, args: {} }
  },
}

export const pipelineMutation = customMutation(mutation, pipelineAuth)

export const pipelineQuery = customQuery(query, pipelineAuth)
