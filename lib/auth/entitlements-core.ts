/**
 * Pure org-plan entitlement helpers shared by Next and Convex.
 * Keep this module free of Clerk/Next imports.
 */

export const ORG_PLAN_TIERS = ['free', 'pro', 'enterprise'] as const

export type OrgPlanTier = (typeof ORG_PLAN_TIERS)[number]

export type OrgEntitlementFeature =
  | 'recruiter:ai-report-chat'
  | 'recruiter:premium-screening'
  | 'recruiter:advanced-analytics'

/** Features available on each plan. Higher tiers include lower-tier features. */
export const FEATURE_ALLOWED_PLANS: Record<
  OrgEntitlementFeature,
  readonly OrgPlanTier[]
> = {
  // Keep report chat on free so the current recruiter product path stays usable
  // before billing ships.
  'recruiter:ai-report-chat': ['free', 'pro', 'enterprise'],
  'recruiter:premium-screening': ['pro', 'enterprise'],
  'recruiter:advanced-analytics': ['enterprise'],
} as const

export const DEFAULT_ORG_PLAN: OrgPlanTier = 'free'

export function isOrgPlanTier(value: string): value is OrgPlanTier {
  return (ORG_PLAN_TIERS as readonly string[]).includes(value)
}

/**
 * Resolve the effective org plan.
 * Prefer an explicit override (env / future billing lookup); otherwise default free.
 */
export function resolveOrgPlan(
  override: string | undefined | null = undefined
): OrgPlanTier {
  if (typeof override === 'string' && isOrgPlanTier(override)) {
    return override
  }
  return DEFAULT_ORG_PLAN
}

export function orgPlanAllowsFeature(
  plan: OrgPlanTier,
  feature: OrgEntitlementFeature
): boolean {
  return FEATURE_ALLOWED_PLANS[feature].includes(plan)
}

export class OrgEntitlementDeniedError extends Error {
  readonly feature: OrgEntitlementFeature
  readonly plan: OrgPlanTier

  constructor(feature: OrgEntitlementFeature, plan: OrgPlanTier) {
    super(
      `Organization plan "${plan}" does not include entitlement "${feature}".`
    )
    this.name = 'OrgEntitlementDeniedError'
    this.feature = feature
    this.plan = plan
  }
}

export function assertOrgPlanAllowsFeature(
  feature: OrgEntitlementFeature,
  planOverride?: string | null
) {
  const plan = resolveOrgPlan(planOverride)
  if (!orgPlanAllowsFeature(plan, feature)) {
    throw new OrgEntitlementDeniedError(feature, plan)
  }
  return plan
}
