import { MINUTE, RateLimiter } from '@convex-dev/rate-limiter'
import { v } from 'convex/values'

import { components } from './_generated/api'
import { action } from './_generated/server'

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

export const checkLimit = action({
  args: {
    name: v.union(
      v.literal('livekitToken'),
      v.literal('publicSnapshot'),
      v.literal('recruiterChat'),
      v.literal('reportGeneration')
    ),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, args.name, { key: args.key, throws: true })
    return { ok: true }
  },
})
