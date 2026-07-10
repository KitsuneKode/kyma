import 'server-only'

import DodoPayments from 'dodopayments'

import { clientEnv } from '@/lib/env/client'
import { serverEnv } from '@/lib/env/server'
import {
  buildDodoProductCatalog,
  isDodoBillingConfigured,
  type BillingInterval,
  type PaidPlanTier,
} from '@/lib/billing/plans'

export function getDodoEnvironment(): 'test_mode' | 'live_mode' {
  return serverEnv.DODO_PAYMENTS_ENVIRONMENT === 'live_mode'
    ? 'live_mode'
    : 'test_mode'
}

export function getDodoClient() {
  const apiKey = serverEnv.DODO_PAYMENTS_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('DODO_PAYMENTS_API_KEY is not configured.')
  }
  return new DodoPayments({
    bearerToken: apiKey,
    environment: getDodoEnvironment(),
  })
}

export function dodoBillingReady() {
  return isDodoBillingConfigured({
    DODO_PAYMENTS_API_KEY: serverEnv.DODO_PAYMENTS_API_KEY,
    DODO_PAYMENTS_WEBHOOK_KEY: serverEnv.DODO_PAYMENTS_WEBHOOK_KEY,
  })
}

export function getConfiguredDodoCatalog() {
  return buildDodoProductCatalog({
    DODO_PAYMENTS_PRODUCT_PRO_MONTHLY:
      serverEnv.DODO_PAYMENTS_PRODUCT_PRO_MONTHLY,
    DODO_PAYMENTS_PRODUCT_PRO_YEARLY:
      serverEnv.DODO_PAYMENTS_PRODUCT_PRO_YEARLY,
    DODO_PAYMENTS_PRODUCT_ENTERPRISE_MONTHLY:
      serverEnv.DODO_PAYMENTS_PRODUCT_ENTERPRISE_MONTHLY,
    DODO_PAYMENTS_PRODUCT_ENTERPRISE_YEARLY:
      serverEnv.DODO_PAYMENTS_PRODUCT_ENTERPRISE_YEARLY,
  })
}

export function resolveProductIdForCheckout(
  plan: PaidPlanTier,
  interval: BillingInterval
) {
  const match = getConfiguredDodoCatalog().find(
    (item) => item.plan === plan && item.interval === interval
  )
  return match?.productId ?? null
}

export function getDodoReturnUrl() {
  const explicit = serverEnv.DODO_PAYMENTS_RETURN_URL?.trim()
  if (explicit) return explicit
  const appUrl = clientEnv.NEXT_PUBLIC_APP_URL?.trim()
  if (!appUrl) return undefined
  return `${appUrl.replace(/\/$/, '')}/recruiter/settings#billing`
}
