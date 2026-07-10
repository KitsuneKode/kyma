import { describe, expect, it } from 'vitest'

import {
  buildDodoProductCatalog,
  planFromDodoProductId,
  planFromSubscriptionStatus,
} from '@/lib/billing/plans'
import {
  billingPlanFromSubscriptionEvent,
  resolveEffectiveOrgPlan,
} from '@/lib/billing/resolve-plan'

const catalog = buildDodoProductCatalog({
  DODO_PAYMENTS_PRODUCT_PRO_MONTHLY: 'prod_pro_m',
  DODO_PAYMENTS_PRODUCT_ENTERPRISE_YEARLY: 'prod_ent_y',
})

describe('dodo product catalog', () => {
  it('only includes configured product ids', () => {
    expect(catalog).toHaveLength(2)
    expect(planFromDodoProductId('prod_pro_m', catalog)).toBe('pro')
    expect(planFromDodoProductId('prod_ent_y', catalog)).toBe('enterprise')
    expect(planFromDodoProductId('unknown', catalog)).toBeNull()
  })
})

describe('planFromSubscriptionStatus', () => {
  it('grants paid plan only while active', () => {
    expect(planFromSubscriptionStatus('active', 'pro')).toBe('pro')
    expect(planFromSubscriptionStatus('on_hold', 'pro')).toBe('free')
    expect(planFromSubscriptionStatus('cancelled', 'enterprise')).toBe('free')
    expect(planFromSubscriptionStatus('active', null)).toBe('free')
  })
})

describe('resolveEffectiveOrgPlan', () => {
  it('prefers env override over billing snapshot', () => {
    expect(
      resolveEffectiveOrgPlan({
        override: 'enterprise',
        billing: { plan: 'pro', status: 'active' },
      })
    ).toBe('enterprise')
  })

  it('uses billing plan when active', () => {
    expect(
      resolveEffectiveOrgPlan({
        billing: { plan: 'pro', status: 'active' },
      })
    ).toBe('pro')
  })

  it('defaults to free', () => {
    expect(resolveEffectiveOrgPlan({})).toBe('free')
  })
})

describe('billingPlanFromSubscriptionEvent', () => {
  it('maps product + status to effective plan', () => {
    expect(
      billingPlanFromSubscriptionEvent({
        status: 'active',
        productId: 'prod_pro_m',
        catalog,
      })
    ).toBe('pro')
    expect(
      billingPlanFromSubscriptionEvent({
        status: 'expired',
        productId: 'prod_pro_m',
        catalog,
      })
    ).toBe('free')
  })
})
