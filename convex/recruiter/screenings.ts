import { ConvexError, v } from 'convex/values'

import type { Id } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'
import { recruiterQuery, screeningWriteMutation } from '../lib/customFunctions'
import { getRecruiterActorId } from '../helpers/auth'
import { logAuditEvent } from '../helpers/audit'
import { DEFAULT_INTERVIEW_DURATION_MINUTES } from '../helpers/interviewPolicy'
import { quotasForPlan, resolveOrgPlanFromEnv } from '../helpers/orgPlan'
import {
  getSessionOpsWindows,
  isInviteExpiringSoon,
  isStaleSessionWithoutReport,
  isStuckProcessing,
} from '../helpers/sessionOps'
import { resolveTemplateName } from '../helpers/sessionReview'
import { ensureDefaultTemplate } from '../helpers/templates'
import { slugify } from '../../lib/format/slug'

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
  staleBeforeMs: number
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

    if (
      isStaleSessionWithoutReport(
        session.startedAt,
        staleBeforeMs,
        Boolean(report)
      )
    ) {
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
    const { expiringUntilMs, staleBeforeMs } = getSessionOpsWindows(nowMs)

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

          const expiringInvites = invites.filter((invite) =>
            isInviteExpiringSoon(invite?.expiresAt, nowMs, expiringUntilMs)
          ).length

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
            staleBeforeMs
          )

          return {
            id: batch._id,
            name: batch.name,
            status: batch.status,
            createdAt: batch.createdAt,
            expiresAt: batch.expiresAt,
            allowedAttempts: batch.allowedAttempts,
            templateName: resolveTemplateName(template?.name),
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

        return {
          id: item._id,
          inviteId: item.inviteId,
          candidateName: item.candidateName,
          candidateEmail: item.candidateEmail,
          allowedAttempts: item.allowedAttempts,
          attemptCount: item.attemptCount,
          status: item.status,
          inviteToken: invite?.inviteToken,
          inviteStatus: invite?.status ?? 'created',
          expiresAt: invite?.expiresAt,
          emailDeliveryStatus: invite?.emailDeliveryStatus,
          emailSentAt: invite?.emailSentAt,
          isStuckProcessing: Boolean(
            invite && isStuckProcessing(session?.state, session?.endedAt, nowMs)
          ),
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
        templateName: resolveTemplateName(template?.name),
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
    const plan = resolveOrgPlanFromEnv()
    const quotas = quotasForPlan(plan)

    if (args.candidates.length > quotas.maxCandidatesPerBatch) {
      throw new ConvexError(
        `Organization plan "${plan}" allows at most ${quotas.maxCandidatesPerBatch} candidates per batch (attempted ${args.candidates.length}).`
      )
    }

    const thirtyDaysAgo = new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 30
    ).toISOString()
    const recentBatches = await ctx.db
      .query('screeningBatches')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .take(MAX_SCREENING_BATCHES)
    const batchesLast30Days = recentBatches.filter(
      (batch) => batch.createdAt >= thirtyDaysAgo
    ).length
    if (batchesLast30Days >= quotas.maxBatchesPer30Days) {
      throw new ConvexError(
        `Organization plan "${plan}" allows at most ${quotas.maxBatchesPer30Days} screening batches per 30 days.`
      )
    }

    const activeInviteStatuses = new Set([
      'created',
      'opened',
      'in_progress',
    ] as const)
    const orgInvites = await ctx.db
      .query('candidateInvites')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .take(Math.min(quotas.maxActiveInvites + 50, 5_000))
    const activeInviteCount = orgInvites.filter((invite) =>
      activeInviteStatuses.has(
        invite.status as 'created' | 'opened' | 'in_progress'
      )
    ).length
    if (activeInviteCount + args.candidates.length > quotas.maxActiveInvites) {
      throw new ConvexError(
        `Organization plan "${plan}" allows at most ${quotas.maxActiveInvites} active invites.`
      )
    }

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
        emailDeliveryStatus: 'pending',
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

    await logAuditEvent(ctx, {
      orgId,
      actorId: createdBy ?? undefined,
      action: 'screening_batch.created',
      resource: `screeningBatches:${batchId}`,
      metadata: {
        candidateCount: args.candidates.length,
        plan,
        templateId: template._id,
      },
    })

    return batchId
  },
})

export const recordInviteEmailDelivery = screeningWriteMutation({
  args: {
    inviteId: v.id('candidateInvites'),
    status: v.union(
      v.literal('sent'),
      v.literal('failed'),
      v.literal('skipped')
    ),
    provider: v.optional(v.string()),
    providerMessageId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { orgId } = ctx
    const invite = await ctx.db.get(args.inviteId)
    if (!invite || invite.orgId !== orgId) {
      throw new ConvexError('Invite not found.')
    }

    const now = new Date().toISOString()
    await ctx.db.patch(args.inviteId, {
      emailDeliveryStatus: args.status,
      emailSentAt: args.status === 'sent' ? now : invite.emailSentAt,
      emailProvider: args.provider,
      emailProviderMessageId: args.providerMessageId,
      emailLastError: args.error,
    })

    await logAuditEvent(ctx, {
      orgId,
      actorId: (await getRecruiterActorId(ctx)) ?? undefined,
      action: `invite_email.${args.status}`,
      resource: `candidateInvites:${args.inviteId}`,
      metadata: {
        provider: args.provider,
        // Never store the invite token in audit metadata.
        hasError: Boolean(args.error),
      },
    })

    return null
  },
})

export const getInviteEmailDeliverySummary = recruiterQuery({
  args: {
    nowMs: v.number(),
  },
  returns: v.object({
    failedLast24h: v.number(),
    pending: v.number(),
    scanned: v.number(),
  }),
  handler: async (ctx, { nowMs }) => {
    const { orgId } = ctx
    const since = new Date(nowMs - 1000 * 60 * 60 * 24).toISOString()
    const invites = await ctx.db
      .query('candidateInvites')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .take(500)

    let failedLast24h = 0
    let pending = 0
    for (const invite of invites) {
      if (invite.emailDeliveryStatus === 'pending') {
        pending += 1
      }
      if (invite.emailDeliveryStatus !== 'failed') {
        continue
      }
      const failedAt = invite.emailSentAt ?? invite.expiresAt
      // Best-effort recency: prefer emailSentAt; fall back to invite expiry window.
      if (failedAt >= since || !invite.emailSentAt) {
        failedLast24h += 1
      }
    }

    return {
      failedLast24h,
      pending,
      scanned: invites.length,
    }
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
