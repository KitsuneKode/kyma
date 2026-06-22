import { auth } from '@clerk/nextjs/server'

export type OrgEntitlementFeature =
  | 'recruiter:ai-report-chat'
  | 'recruiter:premium-screening'
  | 'recruiter:advanced-analytics'

/**
 * Central org-level entitlement gate hook.
 * Payments are not enabled yet, so this currently defaults to allow.
 */
export async function requireOrgEntitlement(feature: OrgEntitlementFeature) {
  const { orgId } = await auth()
  if (!orgId) {
    throw new Error('Active organization context is required.')
  }

  void feature
  return { orgId, allowed: true as const }
}
