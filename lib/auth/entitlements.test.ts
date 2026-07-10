import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, serverEnvMock, fetchQueryMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  serverEnvMock: {
    KYMA_ORG_PLAN_OVERRIDE: undefined as string | undefined,
  },
  fetchQueryMock: vi.fn(),
}))

vi.mock('@clerk/nextjs/server', () => ({
  auth: (...args: unknown[]) => authMock(...args),
}))

vi.mock('@/lib/env/server', () => ({
  serverEnv: serverEnvMock,
}))

vi.mock('convex/nextjs', () => ({
  fetchQuery: (...args: unknown[]) => fetchQueryMock(...args),
}))

vi.mock('@/lib/clerk/server-token', () => ({
  getServerConvexAuthToken: vi.fn(async () => 'test-token'),
}))

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

  it('uses billing snapshot when override is unset', () => {
    expect(resolveOrgPlan(undefined, { plan: 'pro', status: 'active' })).toBe(
      'pro'
    )
    expect(resolveOrgPlan(undefined, { plan: 'pro', status: 'on_hold' })).toBe(
      'free'
    )
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
    expect(orgPlanAllowsFeature('free', 'recruiter:byok')).toBe(false)
  })

  it('allows premium screening and BYOK on pro and enterprise', () => {
    expect(orgPlanAllowsFeature('pro', 'recruiter:premium-screening')).toBe(
      true
    )
    expect(orgPlanAllowsFeature('pro', 'recruiter:byok')).toBe(true)
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
    authMock.mockReset()
    fetchQueryMock.mockReset()
    serverEnvMock.KYMA_ORG_PLAN_OVERRIDE = undefined
    fetchQueryMock.mockResolvedValue({ plan: 'free', status: undefined })
  })

  it('requires an active organization', async () => {
    authMock.mockResolvedValue({ orgId: null })

    await expect(
      requireOrgEntitlement('recruiter:ai-report-chat')
    ).rejects.toThrow('Active organization context is required.')
  })

  it('allows report chat on the default free plan', async () => {
    authMock.mockResolvedValue({ orgId: 'org_123' })

    await expect(
      requireOrgEntitlement('recruiter:ai-report-chat')
    ).resolves.toEqual({
      orgId: 'org_123',
      allowed: true,
      plan: 'free',
    })
  })

  it('denies premium screening on free', async () => {
    authMock.mockResolvedValue({ orgId: 'org_123' })

    await expect(
      requireOrgEntitlement('recruiter:premium-screening')
    ).rejects.toBeInstanceOf(OrgEntitlementDeniedError)
  })

  it('allows premium screening when plan override is pro', async () => {
    serverEnvMock.KYMA_ORG_PLAN_OVERRIDE = 'pro'
    authMock.mockResolvedValue({ orgId: 'org_456' })

    await expect(
      requireOrgEntitlement('recruiter:premium-screening')
    ).resolves.toEqual({
      orgId: 'org_456',
      allowed: true,
      plan: 'pro',
    })
  })

  it('allows BYOK when Dodo billing reports active pro', async () => {
    authMock.mockResolvedValue({ orgId: 'org_789' })
    fetchQueryMock.mockResolvedValue({ plan: 'pro', status: 'active' })

    await expect(requireOrgEntitlement('recruiter:byok')).resolves.toEqual({
      orgId: 'org_789',
      allowed: true,
      plan: 'pro',
    })
  })
})
