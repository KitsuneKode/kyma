import { ConvexError, v } from 'convex/values'

import type { Id } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'
import { recruiterQuery, screeningWriteMutation } from '../lib/customFunctions'
import { getRecruiterActorId } from '../helpers/auth'
import { ensureDefaultTemplate } from '../helpers/templates'
import { DEFAULT_INTERVIEW_DURATION_MINUTES } from '../helpers/interviewPolicy'
import { slugify } from '../../lib/format/slug'

const STUCK_PROCESSING_MS = 10 * 60 * 1000

/** URL-safe invite token: optional name prefix + full UUID (128-bit entropy). */
function buildInviteToken(candidateName: string) {
  const prefix = slugify(candidateName) || 'candidate'
  // Full UUID — do not slice; timestamp must not be the primary secret.
  const secret = crypto.randomUUID()
  return `${prefix}-${secret}`
}

const MAX_SCREENING_BATCHES = 100
const MAX_BATCH_ELIGIBILITY = 500

async function countStuckCandidatesForInvites(
  ctx: QueryCtx,
  inviteIds: Id<'candidateInvites'>[],
  oneHourAgo: number
) {
  let stuckCandidates = 0

  for (const inviteId of inviteIds) {
    const session = await ctx.db
      .query('interviewSessions')
      .withIndex('by_invite', (q) => q.eq('inviteId', inviteId))
      .order('desc')
      .first()

    if (!session?.startedAt) {
      continue
    }

    const report = await ctx.db
      .query('assessmentReports')
      .withIndex('by_session', (q) => q.eq('sessionId', session._id))
      .first()

    if (report) {
      continue
    }

    if (Date.parse(session.startedAt) < oneHourAgo) {
      stuckCandidates += 1
    }
  }

  return stuckCandidates
}

export const listScreeningBatches = recruiterQuery({
  args: {
    nowMs: v.number(),
  },
  handler: async (ctx, { nowMs }) => {
    const { orgId } = ctx
    const in24h = nowMs + 24 * 60 * 60 * 1000
    const oneHourAgo = nowMs - 60 * 60 * 1000

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

          const inviteIds = eligibility.map((candidate) => candidate.inviteId)
          const invites = await Promise.all(
            inviteIds.map((inviteId) => ctx.db.get(inviteId))
          )

          const expiringInvites = invites.filter((invite) => {
            if (!invite) {
              return false
            }
            const expiry = Date.parse(invite.expiresAt)
            return Number.isFinite(expiry) && expiry > nowMs && expiry <= in24h
          }).length

          const candidateCount = eligibility.length
          const completedCount = eligibility.filter(
            (candidate) => candidate.status === 'submitted'
          ).length
          const completionPercent =
            candidateCount === 0
              ? 0
              : Math.round((completedCount / candidateCount) * 100)
          const stuckCandidates = await countStuckCandidatesForInvites(
            ctx,
            inviteIds,
            oneHourAgo
          )

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
            candidateCount,
            completedCount,
            completionPercent,
            expiringInvites,
            stuckCandidates,
          }
        })
    )
  },
})

export const getScreeningBatchDetail = recruiterQuery({
  args: {
    batchId: v.id('screeningBatches'),
    nowMs: v.number(),
  },
  handler: async (ctx, { batchId, nowMs }) => {
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
        const session = invite
          ? await ctx.db
              .query('interviewSessions')
              .withIndex('by_invite', (q) => q.eq('inviteId', invite._id))
              .order('desc')
              .first()
          : null
        const isStuckProcessing =
          invite &&
          session?.state === 'processing' &&
          session.endedAt &&
          nowMs - Date.parse(session.endedAt) >= STUCK_PROCESSING_MS

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
          isStuckProcessing: Boolean(isStuckProcessing),
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
        jobFamily: template?.jobFamily,
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
    const resolvedDuration =
      args.targetDurationMinutes ??
      template.targetDurationMinutes ??
      DEFAULT_INTERVIEW_DURATION_MINUTES
    const resolvedAllowsResume =
      args.allowsResume ?? template.allowsResume ?? true

    const batchId = await ctx.db.insert('screeningBatches', {
      orgId,
      name: args.name,
      templateId: template._id,
      createdBy: createdBy ?? args.createdBy ?? 'admin',
      status: 'active',
      expiresAt: args.expiresAt,
      allowedAttempts: args.allowedAttempts,
      targetDurationMinutes: resolvedDuration,
      allowsResume: resolvedAllowsResume,
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

export const extendBatchExpiry = screeningWriteMutation({
  args: {
    batchId: v.id('screeningBatches'),
    extendDays: v.union(v.literal(7), v.literal(14), v.literal(30)),
  },
  returns: v.object({
    expiresAt: v.string(),
    updatedInviteCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const { orgId } = ctx
    const batch = await ctx.db.get(args.batchId)

    if (!batch || batch.orgId !== orgId) {
      throw new ConvexError('Screening batch not found.')
    }

    const baseMs = batch.expiresAt ? Date.parse(batch.expiresAt) : Date.now()
    const anchorMs = Number.isFinite(baseMs) ? baseMs : Date.now()
    const expiresAt = new Date(
      anchorMs + args.extendDays * 24 * 60 * 60 * 1000
    ).toISOString()

    await ctx.db.patch(args.batchId, { expiresAt })

    const eligibility = await ctx.db
      .query('candidateEligibility')
      .withIndex('by_batch', (q) => q.eq('batchId', args.batchId))
      .take(MAX_BATCH_ELIGIBILITY)

    let updatedInviteCount = 0
    for (const item of eligibility) {
      const invite = await ctx.db.get(item.inviteId)
      if (!invite || invite.status === 'completed') {
        continue
      }
      await ctx.db.patch(invite._id, { expiresAt })
      updatedInviteCount += 1
    }

    return { expiresAt, updatedInviteCount }
  },
})
