/**
 * Dodo Payments product → Kyma plan mapping.
 *
 * Configure product IDs via env. Until products are set, checkout stays disabled
 * and plan resolution falls back to org billing state / KYMA_ORG_PLAN_OVERRIDE.
 */

import type { OrgPlanTier } from '@/lib/billing/resolve-plan'

export type BillingInterval = 'month' | 'year'

export type PaidPlanTier = Exclude<OrgPlanTier, 'free'>

export type DodoProductConfig = {
  plan: PaidPlanTier
  interval: BillingInterval
  productId: string
  label: string
}

export const PAID_PLAN_LABELS: Record<PaidPlanTier, string> = {
  pro: 'Pro',
  enterprise: 'Enterprise',
}

export function buildDodoProductCatalog(env: {
  DODO_PAYMENTS_PRODUCT_PRO_MONTHLY?: string
  DODO_PAYMENTS_PRODUCT_PRO_YEARLY?: string
  DODO_PAYMENTS_PRODUCT_ENTERPRISE_MONTHLY?: string
  DODO_PAYMENTS_PRODUCT_ENTERPRISE_YEARLY?: string
}): DodoProductConfig[] {
  const catalog: DodoProductConfig[] = []
  const push = (
    plan: PaidPlanTier,
    interval: BillingInterval,
    productId: string | undefined,
    label: string
  ) => {
    const id = productId?.trim()
    if (!id) return
    catalog.push({ plan, interval, productId: id, label })
  }

  push('pro', 'month', env.DODO_PAYMENTS_PRODUCT_PRO_MONTHLY, 'Pro (monthly)')
  push('pro', 'year', env.DODO_PAYMENTS_PRODUCT_PRO_YEARLY, 'Pro (yearly)')
  push(
    'enterprise',
    'month',
    env.DODO_PAYMENTS_PRODUCT_ENTERPRISE_MONTHLY,
    'Enterprise (monthly)'
  )
  push(
    'enterprise',
    'year',
    env.DODO_PAYMENTS_PRODUCT_ENTERPRISE_YEARLY,
    'Enterprise (yearly)'
  )
  return catalog
}

export function planFromDodoProductId(
  productId: string | null | undefined,
  catalog: DodoProductConfig[]
): OrgPlanTier | null {
  if (!productId?.trim()) return null
  const match = catalog.find((item) => item.productId === productId.trim())
  return match?.plan ?? null
}

export type DodoSubscriptionStatus =
  | 'pending'
  | 'active'
  | 'on_hold'
  | 'cancelled'
  | 'expired'
  | 'failed'

/** Active entitlements only while Dodo reports an active (or renewed) subscription. */
export function planFromSubscriptionStatus(
  status: DodoSubscriptionStatus | string | null | undefined,
  productPlan: OrgPlanTier | null
): OrgPlanTier {
  if (!productPlan || productPlan === 'free') {
    return 'free'
  }
  if (status === 'active') {
    return productPlan
  }
  // on_hold / cancelled / expired / failed / pending → free until recovered
  return 'free'
}

export function isDodoBillingConfigured(env: {
  DODO_PAYMENTS_API_KEY?: string
  DODO_PAYMENTS_WEBHOOK_KEY?: string
}): boolean {
  return Boolean(
    env.DODO_PAYMENTS_API_KEY?.trim() && env.DODO_PAYMENTS_WEBHOOK_KEY?.trim()
  )
}
