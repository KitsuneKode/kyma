import { ConvexError, v } from 'convex/values'

import { recruiterQuery, screeningWriteMutation } from '../lib/customFunctions'
import { getRecruiterActorId } from '../helpers/auth'
import { ensureDefaultTemplate } from '../helpers/templates'
import { slugify } from '../../lib/format/slug'

function buildInviteToken(candidateName: string) {
  const prefix = slugify(candidateName) || 'candidate'
  const suffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now()}`

  return `${prefix}-${suffix}`
}

const MAX_SCREENING_BATCHES = 100
const MAX_BATCH_ELIGIBILITY = 500

export const listScreeningBatches = recruiterQuery({
  args: {},
  handler: async (ctx) => {
    const { orgId } = ctx

    const batches = await ctx.db
      .query('screeningBatches')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .take(MAX_SCREENING_BATCHES)

    return await Promise.all(
      [...batches]
        .toSorted((left, right) =>
          right.createdAt.localeCompare(left.createdAt)
        )
        .map(async (batch) => {
          const [template, eligibility] = await Promise.all([
            ctx.db.get(batch.templateId),
            ctx.db
              .query('candidateEligibility')
              .withIndex('by_batch', (q) => q.eq('batchId', batch._id))
              .take(MAX_BATCH_ELIGIBILITY),
          ])

          return {
            id: batch._id,
            name: batch.name,
            status: batch.status,
            createdAt: batch.createdAt,
            expiresAt: batch.expiresAt,
            allowedAttempts: batch.allowedAttempts,
            templateName: template?.name ?? 'AI Tutor Screener',
            targetDurationMinutes: batch.targetDurationMinutes,
            allowsResume: batch.allowsResume,
            candidateCount: eligibility.length,
            completedCount: eligibility.filter(
              (candidate) => candidate.status === 'submitted'
            ).length,
          }
        })
    )
  },
})

export const getScreeningBatchDetail = recruiterQuery({
  args: {
    batchId: v.id('screeningBatches'),
  },
  handler: async (ctx, { batchId }) => {
    const { orgId } = ctx

    const batch = await ctx.db.get(batchId)

    if (!batch || batch.orgId !== orgId) {
      return null
    }

    const [template, eligibility] = await Promise.all([
      ctx.db.get(batch.templateId),
      ctx.db
        .query('candidateEligibility')
        .withIndex('by_batch', (q) => q.eq('batchId', batchId))
        .take(MAX_BATCH_ELIGIBILITY),
    ])

    const candidates = await Promise.all(
      eligibility.map(async (item) => {
        const invite = await ctx.db.get(item.inviteId)
        return {
          id: item._id,
          candidateName: item.candidateName,
          candidateEmail: item.candidateEmail,
          allowedAttempts: item.allowedAttempts,
          attemptCount: item.attemptCount,
          status: item.status,
          inviteToken: invite?.inviteToken,
          inviteStatus: invite?.status ?? 'created',
          expiresAt: invite?.expiresAt,
        }
      })
    )

    return {
      batch: {
        id: batch._id,
        name: batch.name,
        status: batch.status,
        createdAt: batch.createdAt,
        expiresAt: batch.expiresAt,
        allowedAttempts: batch.allowedAttempts,
        targetDurationMinutes: batch.targetDurationMinutes,
        allowsResume: batch.allowsResume,
        templateName: template?.name ?? 'AI Tutor Screener',
      },
      candidates: candidates.toSorted((left, right) =>
        left.candidateName.localeCompare(right.candidateName)
      ),
    }
  },
})

export const createScreeningBatch = screeningWriteMutation({
  args: {
    name: v.string(),
    createdBy: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    allowedAttempts: v.number(),
    templateId: v.optional(v.id('assessmentTemplates')),
    targetDurationMinutes: v.optional(v.number()),
    allowsResume: v.optional(v.boolean()),
    candidateReleaseMode: v.optional(
      v.union(v.literal('auto'), v.literal('manual'), v.literal('inherit'))
    ),
    candidates: v.array(
      v.object({
        candidateName: v.string(),
        candidateEmail: v.string(),
      })
    ),
  },
  returns: v.id('screeningBatches'),
  handler: async (ctx, args) => {
    const { orgId } = ctx
    const createdBy = await getRecruiterActorId(ctx)
    const template = args.templateId
      ? await ctx.db.get(args.templateId)
      : await ensureDefaultTemplate(ctx, orgId)

    if (!template) {
      throw new ConvexError('Assessment template not found.')
    }
    if (template.orgId !== orgId) {
      throw new ConvexError(
        'Assessment template does not belong to this organization.'
      )
    }

    const now = new Date().toISOString()
    const batchId = await ctx.db.insert('screeningBatches', {
      orgId,
      name: args.name,
      templateId: template._id,
      createdBy: createdBy ?? args.createdBy ?? 'admin',
      status: 'active',
      expiresAt: args.expiresAt,
      allowedAttempts: args.allowedAttempts,
      targetDurationMinutes: args.targetDurationMinutes,
      allowsResume: args.allowsResume,
      candidateReleaseMode: args.candidateReleaseMode ?? 'inherit',
      createdAt: now,
    })

    for (const candidate of args.candidates) {
      const candidateEmail = candidate.candidateEmail.trim().toLowerCase()
      if (!candidateEmail || !candidateEmail.includes('@')) {
        throw new ConvexError(
          'Each candidate must include a valid email address for invite delivery and account linking.'
        )
      }

      const inviteId = await ctx.db.insert('candidateInvites', {
        orgId,
        inviteToken: buildInviteToken(candidate.candidateName),
        candidateName: candidate.candidateName,
        candidateEmail,
        templateId: template._id,
        batchId,
        status: 'created',
        expiresAt:
          args.expiresAt ??
          new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      })

      const eligibilityId = await ctx.db.insert('candidateEligibility', {
        orgId,
        batchId,
        inviteId,
        candidateName: candidate.candidateName,
        candidateEmail,
        allowedAttempts: args.allowedAttempts,
        attemptCount: 0,
        status: 'invited',
        createdAt: now,
      })

      await ctx.db.patch(inviteId, {
        eligibilityId,
      })
    }

    return batchId
  },
})
