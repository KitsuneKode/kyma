import { serverEnv } from '@/lib/env/server'

/**
 * Server-only model resolution boundary (BYOK placeholder).
 * Do not import from client components. Call only from Route Handlers or jobs.
 */
export function resolveReviewChatModelId(): string | undefined {
  return serverEnv.KYMA_REVIEW_CHAT_MODEL?.trim() || undefined
}
