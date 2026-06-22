import 'server-only'

import { fetchAction } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import { serverEnv } from '@/lib/env/server'

type RateLimitName =
  | 'livekitToken'
  | 'publicSnapshot'
  | 'recruiterChat'
  | 'reportGeneration'

export async function assertServerRateLimit(name: RateLimitName, key: string) {
  const writeKey = serverEnv.KYMA_PROCESSING_WRITE_KEY?.trim()
  if (!writeKey) {
    if (serverEnv.NODE_ENV === 'production') {
      throw new Error('Rate limiting is not configured for production.')
    }
    return
  }

  await fetchAction(api.rateLimiter.checkServerLimit, {
    name,
    key,
    writeKey,
  })
}
