'use node'

import { ConvexError, v } from 'convex/values'

import { api } from './_generated/api'
import { action } from './_generated/server'
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
  'candidateEligibility',
  'candidateInvites',
  'screeningBatches',
  'assessmentTemplateVersions',
  'assessmentTemplates',
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
  ): Promise<{ ok: boolean; candidates: number; recruiters: number }> => {
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
