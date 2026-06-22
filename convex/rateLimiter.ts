import { MINUTE, RateLimiter } from '@convex-dev/rate-limiter'
import { ConvexError, v } from 'convex/values'

import { components } from './_generated/api'
import { action } from './_generated/server'
import { hasTrustedProcessingKey } from './helpers/processingAuth'

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  livekitToken: { kind: 'fixed window', period: MINUTE, rate: 5 },
  publicSnapshot: {
    kind: 'token bucket',
    period: MINUTE,
    rate: 30,
    capacity: 50,
  },
  recruiterChat: {
    kind: 'token bucket',
    period: MINUTE,
    rate: 10,
    capacity: 20,
  },
  reportGeneration: { kind: 'fixed window', period: MINUTE, rate: 3 },
})

const rateLimitNameValidator = v.union(
  v.literal('livekitToken'),
  v.literal('publicSnapshot'),
  v.literal('recruiterChat'),
  v.literal('reportGeneration')
)

/** Server-only rate limit check — requires KYMA_PROCESSING_WRITE_KEY. */
export const checkServerLimit = action({
  args: {
    name: rateLimitNameValidator,
    key: v.string(),
    writeKey: v.string(),
  },
  returns: v.object({ ok: v.literal(true) }),
  handler: async (ctx, args) => {
    if (!hasTrustedProcessingKey(args.writeKey)) {
      throw new ConvexError('Unauthorized rate limit check.')
    }
    await rateLimiter.limit(ctx, args.name, { key: args.key, throws: true })
    return { ok: true as const }
  },
})
