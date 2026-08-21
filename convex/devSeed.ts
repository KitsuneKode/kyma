'use node'

import { ConvexError, v } from 'convex/values'

import { internal } from './_generated/api'
import { action, internalAction } from './_generated/server'
import { clerkIdFromIdentity } from './helpers/clerkIdentity'
import { getOrgContextFromIdentity } from './helpers/orgContext'
import { isConvexDevelopmentMode } from '../lib/env/deployment-mode'
import { convexEnv } from '../lib/env/convex'

const RESET_CONFIRMATION = 'RESET_DEV_ONLY'
const SEED_CONFIRMATION = 'SEED_DEV_ONLY'

const SEED_TABLES = [
  'reportChatMessages',
  'recruiterNotes',
  'reviewDecisions',
  'dimensionEvidence',
  'assessmentReports',
  'recordingArtifacts',
  'transcriptSegments',
  'sessionEvents',
  'interviewSessions',
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
 * Dev seeding must be impossible on any deployment that is not explicitly
 * development. `NODE_ENV` defaults to `development` when unset, so an unset
 * value is treated as untrusted rather than as a development signal - the
 * previous NODE_ENV-only check passed on a real production Convex deployment.
 */
export function assertDevSeedAllowed(env: {
  KYMA_DEPLOYMENT_ENV?: string
  NODE_ENV?: string
}) {
  const explicitlyDevelopment =
    env.NODE_ENV === 'development' && isConvexDevelopmentMode(env)

  if (!explicitlyDevelopment) {
    throw new ConvexError(
      'Dev seed/reset is blocked outside an explicit development deployment.'
    )
  }
}

export const resetDevData = internalAction({
  args: {
    confirm: v.string(),
  },
  handler: async (ctx, args): Promise<{ ok: true; deleted: number }> => {
    assertDevSeedAllowed(convexEnv)
    if (args.confirm !== RESET_CONFIRMATION) {
      throw new ConvexError(
        `Confirmation mismatch. Pass "${RESET_CONFIRMATION}" to reset dev data.`
      )
    }

    let deleted = 0
    for (const table of SEED_TABLES) {
      while (true) {
        const result = await ctx.runMutation(
          internal.devSeedMutations.clearTableChunk,
          {
            table,
            limit: 200,
          }
        )
        deleted += result.deleted
        if (result.deleted === 0) break
      }
    }
    return { ok: true, deleted }
  },
})

export const seedDevData = internalAction({
  args: {
    confirm: v.string(),
    candidates: v.optional(v.number()),
    recruiters: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    ok: boolean
    orgId: string
    templateId: string
    batchId: string
    candidates: number
    recruiters: number
    sampleIndex: Record<
      string,
      { sessionId: string; inviteToken: string; candidateName: string }
    >
    sampleInviteTokens: string[]
    sampleReviewSessionIds: string[]
  }> => {
    assertDevSeedAllowed(convexEnv)
    if (args.confirm !== SEED_CONFIRMATION) {
      throw new ConvexError(
        `Confirmation mismatch. Pass "${SEED_CONFIRMATION}" to seed dev data.`
      )
    }

    for (const table of SEED_TABLES) {
      while (true) {
        const result = await ctx.runMutation(
          internal.devSeedMutations.clearTableChunk,
          {
            table,
            limit: 200,
          }
        )
        if (result.deleted === 0) break
      }
    }
    return await ctx.runMutation(internal.devSeedMutations.seedData, {
      candidates: args.candidates,
      recruiters: args.recruiters,
    })
  },
})

export const seedDevDataForActiveOrg = action({
  args: {
    confirm: v.string(),
    candidates: v.optional(v.number()),
    recruiters: v.optional(v.number()),
    orgName: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    ok: boolean
    orgId: string
    templateId: string
    batchId: string
    candidates: number
    recruiters: number
    sampleIndex: Record<
      string,
      { sessionId: string; inviteToken: string; candidateName: string }
    >
    sampleInviteTokens: string[]
    sampleReviewSessionIds: string[]
  }> => {
    assertDevSeedAllowed(convexEnv)
    if (args.confirm !== SEED_CONFIRMATION) {
      throw new ConvexError(
        `Confirmation mismatch. Pass "${SEED_CONFIRMATION}" to seed dev data.`
      )
    }

    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError(
        'You must be signed in to seed your workspace. Configure the Clerk "convex" JWT template, sign out/in, then retry.'
      )
    }

    const { orgId } = getOrgContextFromIdentity(
      identity as Record<string, unknown>
    )
    if (!orgId) {
      throw new ConvexError(
        'Select an active organization in the header switcher before seeding recruiter data.'
      )
    }

    const clerkUserId = clerkIdFromIdentity(identity)

    // BLAST RADIUS: seeding is scoped to the caller's org, but this clear is
    // NOT - it empties all 21 seed tables across every org on the deployment.
    // On a shared dev deployment one developer seeding their workspace destroys
    // everyone else's. Safe only because `assertDevSeedAllowed` restricts this
    // to explicit development deployments. Scope the clear by orgId before
    // using this anywhere multi-tenant.
    for (const table of SEED_TABLES) {
      while (true) {
        const result = await ctx.runMutation(
          internal.devSeedMutations.clearTableChunk,
          {
            table,
            limit: 200,
          }
        )
        if (result.deleted === 0) break
      }
    }

    return await ctx.runMutation(internal.devSeedMutations.seedData, {
      candidates: args.candidates,
      recruiters: args.recruiters,
      targetOrgId: orgId,
      targetOrgName: args.orgName?.trim() || 'Development Workspace',
      ownerClerkUserId: clerkUserId,
      ownerEmail: identity.email ?? undefined,
      ownerName: identity.name ?? undefined,
    })
  },
})
