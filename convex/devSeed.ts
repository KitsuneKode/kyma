'use node'

import { ConvexError, v } from 'convex/values'

import { api } from './_generated/api'
import { action } from './_generated/server'
import { clerkIdFromIdentity } from './helpers/clerkIdentity'
import { getOrgContextFromIdentity } from './helpers/orgContext'
import { runtimeEnv } from '../lib/env/runtime'

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

function assertDevelopmentMode() {
  if (runtimeEnv.NODE_ENV === 'production') {
    throw new ConvexError('Dev seed/reset is blocked in production mode.')
  }
}

export const resetDevData = action({
  args: {
    confirm: v.string(),
  },
  handler: async (ctx, args): Promise<{ ok: true; deleted: number }> => {
    assertDevelopmentMode()
    if (args.confirm !== RESET_CONFIRMATION) {
      throw new ConvexError(
        `Confirmation mismatch. Pass "${RESET_CONFIRMATION}" to reset dev data.`
      )
    }

    let deleted = 0
    for (const table of SEED_TABLES) {
      while (true) {
        const result = await ctx.runMutation(
          api.devSeedMutations.clearTableChunk,
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

export const seedDevData = action({
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
    sampleInviteTokens: string[]
    sampleReviewSessionIds: string[]
  }> => {
    assertDevelopmentMode()
    if (args.confirm !== SEED_CONFIRMATION) {
      throw new ConvexError(
        `Confirmation mismatch. Pass "${SEED_CONFIRMATION}" to seed dev data.`
      )
    }

    for (const table of SEED_TABLES) {
      while (true) {
        const result = await ctx.runMutation(
          api.devSeedMutations.clearTableChunk,
          {
            table,
            limit: 200,
          }
        )
        if (result.deleted === 0) break
      }
    }
    return await ctx.runMutation(api.devSeedMutations.seedData, {
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
    sampleInviteTokens: string[]
    sampleReviewSessionIds: string[]
  }> => {
    assertDevelopmentMode()
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

    for (const table of SEED_TABLES) {
      while (true) {
        const result = await ctx.runMutation(
          api.devSeedMutations.clearTableChunk,
          {
            table,
            limit: 200,
          }
        )
        if (result.deleted === 0) break
      }
    }

    return await ctx.runMutation(api.devSeedMutations.seedData, {
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
