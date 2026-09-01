import { ConvexError } from 'convex/values'

import { isExplicitDevelopmentEnv } from '../lib/env/node-env'

/**
 * The tables dev seeding owns, and the guard that gates every destructive
 * operation on them. Both live here because they were previously duplicated
 * across `devSeed.ts` and `devSeedMutations.ts`, which let the two drift: the
 * mutation copy still carried a NODE_ENV-only check long after the action copy
 * was hardened, and a newly added table (`orgUsageRollups`) was rejected by one
 * list while being cleared by the other.
 *
 * Add every new table here so a dev reset does not silently leave stale rows.
 */
export const SEED_TABLES = [
  'orgUsageRollups',
  'reportChatMessages',
  'recruiterNotes',
  'reviewDecisions',
  'dimensionEvidence',
  'assessmentReports',
  'recordingArtifacts',
  'transcriptSegments',
  'sessionEvents',
  'interviewSessions',
  'visualObservations',
  'candidateReadinessRuns',
  'candidatePreferences',
  'candidateEligibility',
  'candidateInvites',
  'screeningBatches',
  'assessmentTemplateVersions',
  'assessmentTemplates',
  'orgMemberships',
  'organizations',
  'users',
  'workspaceSettings',
  'auditEvents',
] as const

/**
 * Tables that are safe to clear per-org when seeding for an active workspace.
 * Excludes cross-org tables (users, readiness runs, preferences) whose rows
 * cannot be attributed to a single org without a join and whose global wipe
 * would destroy other workspaces on a shared dev deployment.
 */
export const SEED_ORG_TABLES = [
  'orgUsageRollups',
  'reportChatMessages',
  'recruiterNotes',
  'reviewDecisions',
  'dimensionEvidence',
  'assessmentReports',
  'recordingArtifacts',
  'sessionEvents',
  'interviewSessions',
  'visualObservations',
  'candidateEligibility',
  'candidateInvites',
  'screeningBatches',
  'assessmentTemplateVersions',
  'assessmentTemplates',
  'workspaceSettings',
  'auditEvents',
  'organizations',
  'orgMemberships',
] as const

export const CLERK_ORG_ID_SEED_TABLES = [
  'organizations',
  'orgMemberships',
] as const

export const ORG_ID_SEED_TABLES = SEED_ORG_TABLES.filter(
  (table) => !(CLERK_ORG_ID_SEED_TABLES as readonly string[]).includes(table)
)

/**
 * Dev seeding must be impossible on any deployment that has not explicitly
 * opted in to development.
 *
 * Verified against a live Convex deployment: the Convex runtime pins the raw
 * NODE_ENV value to `'production'` and ignores `convex env set NODE_ENV`, so
 * NODE_ENV cannot express "dev deployment" here at all.
 * `KYMA_DEPLOYMENT_ENV=development` is the deliberate opt-in, and an unset
 * value fails closed - which is the state a production deployment is in by
 * default.
 *
 * Operational note: removing the variable does not immediately reach warm Node
 * action containers, which cache the validated env at module load. Revoking
 * dev access takes effect once containers cycle.
 */
export function assertDevSeedAllowed(env: {
  KYMA_DEPLOYMENT_ENV?: string
  NODE_ENV?: string
}) {
  if (!isExplicitDevelopmentEnv(env.KYMA_DEPLOYMENT_ENV)) {
    throw new ConvexError(
      'Dev seed/reset is blocked outside an explicit development deployment.'
    )
  }
}
