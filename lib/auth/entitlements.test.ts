import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/env/server', () => ({
  serverEnv: {
    KYMA_ORG_PLAN_OVERRIDE: undefined as string | undefined,
  },
}))

import { auth } from '@clerk/nextjs/server'
import { serverEnv } from '@/lib/env/server'

import {
  DEFAULT_ORG_PLAN,
  FEATURE_ALLOWED_PLANS,
  OrgEntitlementDeniedError,
  orgPlanAllowsFeature,
  requireOrgEntitlement,
  resolveOrgPlan,
} from '@/lib/auth/entitlements'

describe('resolveOrgPlan', () => {
  it('defaults to free when override is missing or invalid', () => {
    expect(resolveOrgPlan()).toBe(DEFAULT_ORG_PLAN)
    expect(resolveOrgPlan(undefined)).toBe('free')
    expect(resolveOrgPlan(null)).toBe('free')
    expect(resolveOrgPlan('')).toBe('free')
    expect(resolveOrgPlan('starter')).toBe('free')
  })

  it('accepts free, pro, and enterprise overrides', () => {
    expect(resolveOrgPlan('free')).toBe('free')
    expect(resolveOrgPlan('pro')).toBe('pro')
    expect(resolveOrgPlan('enterprise')).toBe('enterprise')
  })
})

describe('orgPlanAllowsFeature', () => {
  it('allows report chat on free (current product path)', () => {
    expect(orgPlanAllowsFeature('free', 'recruiter:ai-report-chat')).toBe(true)
    expect(FEATURE_ALLOWED_PLANS['recruiter:ai-report-chat']).toContain('free')
  })

  it('denies premium features on free', () => {
    expect(orgPlanAllowsFeature('free', 'recruiter:premium-screening')).toBe(
      false
    )
    expect(orgPlanAllowsFeature('free', 'recruiter:advanced-analytics')).toBe(
      false
    )
  })

  it('allows premium screening on pro and enterprise', () => {
    expect(orgPlanAllowsFeature('pro', 'recruiter:premium-screening')).toBe(
      true
    )
    expect(
      orgPlanAllowsFeature('enterprise', 'recruiter:premium-screening')
    ).toBe(true)
    expect(orgPlanAllowsFeature('pro', 'recruiter:advanced-analytics')).toBe(
      false
    )
    expect(
      orgPlanAllowsFeature('enterprise', 'recruiter:advanced-analytics')
    ).toBe(true)
  })
})

describe('requireOrgEntitlement', () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset()
    serverEnv.KYMA_ORG_PLAN_OVERRIDE = undefined
  })

  it('requires an active organization', async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as Awaited<
      ReturnType<typeof auth>
    >)

    await expect(
      requireOrgEntitlement('recruiter:ai-report-chat')
    ).rejects.toThrow('Active organization context is required.')
  })

  it('allows report chat on the default free plan', async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: 'org_123' } as Awaited<
      ReturnType<typeof auth>
    >)

    await expect(
      requireOrgEntitlement('recruiter:ai-report-chat')
    ).resolves.toEqual({
      orgId: 'org_123',
      allowed: true,
      plan: 'free',
    })
  })

  it('denies premium screening on free', async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: 'org_123' } as Awaited<
      ReturnType<typeof auth>
    >)

    await expect(
      requireOrgEntitlement('recruiter:premium-screening')
    ).rejects.toBeInstanceOf(OrgEntitlementDeniedError)
  })

  it('allows premium screening when plan override is pro', async () => {
    serverEnv.KYMA_ORG_PLAN_OVERRIDE = 'pro'
    vi.mocked(auth).mockResolvedValue({ orgId: 'org_456' } as Awaited<
      ReturnType<typeof auth>
    >)

    await expect(
      requireOrgEntitlement('recruiter:premium-screening')
    ).resolves.toEqual({
      orgId: 'org_456',
      allowed: true,
      plan: 'pro',
    })
  })
})
