import { ConvexError, v } from 'convex/values'

import { api } from './_generated/api'
import { action, mutation, query } from './_generated/server'
import {
  getRecruiterActorId,
  requireAdmin,
  requireAdminIdentity,
} from './helpers/auth'
import { logAuditEvent } from './helpers/audit'
import { ensureDefaultTemplate } from './helpers/templates'
import { decryptProviderKey, encryptProviderKey } from './helpers/encryption'
import { runtimeEnv } from '../lib/env/runtime'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildInviteToken(candidateName: string) {
  const prefix = slugify(candidateName) || 'candidate'
  const suffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now()}`

  return `${prefix}-${suffix}`
}

export const listActiveTemplates = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminIdentity(ctx)

    const templates = await ctx.db
      .query('assessmentTemplates')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect()

    return templates
      .toSorted((left, right) => left.name.localeCompare(right.name))
      .map((template) => ({
        id: template._id,
        name: template.name,
        role: template.role,
        rubricVersion: template.rubricVersion,
        targetDurationMinutes: template.targetDurationMinutes,
        allowsResume: template.allowsResume,
        interviewStyleMode: template.interviewStyleMode,
      }))
  },
})

export const listScreeningBatches = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminIdentity(ctx)

    const batches = await ctx.db.query('screeningBatches').collect()

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
              .collect(),
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

export const getScreeningBatchDetail = query({
  args: {
    batchId: v.id('screeningBatches'),
  },
  handler: async (ctx, { batchId }) => {
    await requireAdminIdentity(ctx)

    const batch = await ctx.db.get(batchId)

    if (!batch) {
      return null
    }

    const [template, eligibility] = await Promise.all([
      ctx.db.get(batch.templateId),
      ctx.db
        .query('candidateEligibility')
        .withIndex('by_batch', (q) => q.eq('batchId', batchId))
        .collect(),
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

export const createScreeningBatch = mutation({
  args: {
    name: v.string(),
    createdBy: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    allowedAttempts: v.number(),
    templateId: v.optional(v.id('assessmentTemplates')),
    targetDurationMinutes: v.optional(v.number()),
    allowsResume: v.optional(v.boolean()),
    candidates: v.array(
      v.object({
        candidateName: v.string(),
        candidateEmail: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx)
    const createdBy = await getRecruiterActorId(ctx)
    const template = args.templateId
      ? await ctx.db.get(args.templateId)
      : await ensureDefaultTemplate(ctx)

    if (!template) {
      throw new ConvexError('Assessment template not found.')
    }

    const now = new Date().toISOString()
    const batchId = await ctx.db.insert('screeningBatches', {
      name: args.name,
      templateId: template._id,
      createdBy: createdBy ?? args.createdBy ?? 'admin',
      status: 'active',
      expiresAt: args.expiresAt,
      allowedAttempts: args.allowedAttempts,
      targetDurationMinutes: args.targetDurationMinutes,
      allowsResume: args.allowsResume,
      createdAt: now,
    })

    for (const candidate of args.candidates) {
      const inviteId = await ctx.db.insert('candidateInvites', {
        inviteToken: buildInviteToken(candidate.candidateName),
        candidateName: candidate.candidateName,
        candidateEmail: candidate.candidateEmail,
        templateId: template._id,
        batchId,
        status: 'created',
        expiresAt:
          args.expiresAt ??
          new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      })

      const eligibilityId = await ctx.db.insert('candidateEligibility', {
        batchId,
        inviteId,
        candidateName: candidate.candidateName,
        candidateEmail: candidate.candidateEmail,
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

export const addRecruiterNote = mutation({
  args: {
    sessionId: v.id('interviewSessions'),
    reportId: v.optional(v.id('assessmentReports')),
    authorId: v.optional(v.string()),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx)
    const authorId = await getRecruiterActorId(ctx)

    const noteId = await ctx.db.insert('recruiterNotes', {
      ...args,
      authorId: authorId ?? args.authorId,
      createdAt: new Date().toISOString(),
    })

    await logAuditEvent(ctx, {
      actorId: authorId ?? args.authorId ?? undefined,
      action: 'recruiter_note.created',
      resource: `session:${args.sessionId}`,
      metadata: { noteId },
    })

    return noteId
  },
})

export const addReportChatMessage = mutation({
  args: {
    sessionId: v.id('interviewSessions'),
    reportId: v.optional(v.id('assessmentReports')),
    role: v.union(
      v.literal('user'),
      v.literal('assistant'),
      v.literal('system')
    ),
    content: v.string(),
    answerSource: v.optional(
      v.union(v.literal('fallback'), v.literal('model'))
    ),
    modelId: v.optional(v.string()),
    citationsJson: v.optional(v.string()),
    groundingVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx)

    return await ctx.db.insert('reportChatMessages', {
      ...args,
      createdAt: new Date().toISOString(),
    })
  },
})

export const getDashboardSummary = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminIdentity(ctx)
    const [sessions, invites, reports, events] = await Promise.all([
      ctx.db.query('interviewSessions').collect(),
      ctx.db.query('candidateInvites').collect(),
      ctx.db.query('assessmentReports').collect(),
      ctx.db.query('sessionEvents').collect(),
    ])

    const now = Date.now()
    const in24h = now + 24 * 60 * 60 * 1000
    const oneHourAgo = now - 60 * 60 * 1000

    const pendingReviews = reports.filter(
      (r) => r.status === 'pending' || r.status === 'manual_review'
    ).length
    const activeSessions = sessions.filter((s) =>
      ['connecting', 'live', 'reconnecting'].includes(s.state)
    ).length
    const expiringInvites = invites.filter((invite) => {
      const expiry = Date.parse(invite.expiresAt)
      return Number.isFinite(expiry) && expiry > now && expiry <= in24h
    }).length
    const sessionsToday = sessions.filter((session) => {
      if (!session.startedAt) return false
      return (
        new Date(session.startedAt).toDateString() === new Date().toDateString()
      )
    }).length

    const reportBySession = new Map(
      reports.map((report) => [`${report.sessionId}`, report])
    )

    return {
      counts: {
        pendingReviews,
        activeSessions,
        expiringInvites,
        sessionsToday,
      },
      needsAttention: {
        manualReviewCandidates: reports
          .filter((report) => report.status === 'manual_review')
          .map((report) => ({
            reportId: report._id,
            sessionId: report.sessionId,
          })),
        invitesExpiringSoon: invites
          .filter((invite) => {
            const expiry = Date.parse(invite.expiresAt)
            return Number.isFinite(expiry) && expiry > now && expiry <= in24h
          })
          .map((invite) => ({
            inviteId: invite._id,
            inviteToken: invite.inviteToken,
            expiresAt: invite.expiresAt,
          })),
        staleSessions: sessions
          .filter((session) => {
            if (!session.startedAt) return false
            if (reportBySession.has(`${session._id}`)) return false
            return Date.parse(session.startedAt) < oneHourAgo
          })
          .map((session) => ({
            sessionId: session._id,
            startedAt: session.startedAt,
          })),
      },
      recentActivity: [...events]
        .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 10)
        .map((event) => ({
          id: event._id,
          type: event.type,
          detail: event.detail,
          sessionId: event.sessionId,
          createdAt: event.createdAt,
        })),
    }
  },
})

export const getWorkspaceSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminIdentity(ctx)
    const settings = await ctx.db.query('workspaceSettings').first()
    if (!settings) return null
    return {
      id: settings._id,
      defaultModels: settings.defaultModels,
      providerKeys:
        settings.providerKeys?.map((item) => ({
          keyId: item.keyId,
          provider: item.provider,
          label: item.label,
          addedAt: item.addedAt,
          addedBy: item.addedBy,
          maskedKeyTail: item.maskedKeyTail,
        })) ?? [],
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    }
  },
})

export const addProviderKey = mutation({
  args: {
    provider: v.string(),
    key: v.string(),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireAdmin(ctx)
    const actor = identity?.tokenIdentifier ?? identity?.subject ?? 'admin'
    const now = Date.now()
    const keyId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${now}`
    const maskedKeyTail = args.key.slice(-4)
    const settings = await ctx.db.query('workspaceSettings').first()
    const encrypted = await encryptProviderKey(args.key)
    const entry = {
      keyId,
      provider: args.provider,
      encryptedKey: encrypted.encryptedKey,
      iv: encrypted.iv,
      label: args.label,
      addedAt: now,
      addedBy: actor,
      maskedKeyTail,
    }
    if (!settings) {
      return await ctx.db.insert('workspaceSettings', {
        providerKeys: [entry],
        updatedAt: now,
        updatedBy: actor,
      })
    }
    await ctx.db.patch(settings._id, {
      providerKeys: [...(settings.providerKeys ?? []), entry],
      updatedAt: now,
      updatedBy: actor,
    })
    return settings._id
  },
})

export const removeProviderKey = mutation({
  args: {
    provider: v.string(),
    keyId: v.string(),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireAdmin(ctx)
    const actor = identity?.tokenIdentifier ?? identity?.subject ?? 'admin'
    const settings = await ctx.db.query('workspaceSettings').first()
    if (!settings) return null
    await ctx.db.patch(settings._id, {
      providerKeys: (settings.providerKeys ?? []).filter(
        (item) =>
          !(item.provider === args.provider && item.keyId === args.keyId)
      ),
      updatedAt: Date.now(),
      updatedBy: actor,
    })
    return settings._id
  },
})

export const updateDefaultModels = mutation({
  args: {
    models: v.object({
      stt: v.optional(v.string()),
      llm: v.optional(v.string()),
      tts: v.optional(v.string()),
      reviewChat: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireAdmin(ctx)
    const actor = identity?.tokenIdentifier ?? identity?.subject ?? 'admin'
    const now = Date.now()
    const settings = await ctx.db.query('workspaceSettings').first()
    if (!settings) {
      return await ctx.db.insert('workspaceSettings', {
        defaultModels: args.models,
        updatedAt: now,
        updatedBy: actor,
      })
    }
    await ctx.db.patch(settings._id, {
      defaultModels: args.models,
      updatedAt: now,
      updatedBy: actor,
    })
    return settings._id
  },
})

export const testProviderConnection = action({
  args: {
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    if (!runtimeEnv.KYMA_ENCRYPTION_KEY?.trim()) {
      throw new ConvexError(
        'KYMA_ENCRYPTION_KEY is required to test provider keys.'
      )
    }
    const settings = await ctx.runQuery(api.admin.getWorkspaceSettingsRaw, {})
    const candidate = settings?.providerKeys?.find(
      (item) => item.provider === args.provider
    )
    if (!candidate) {
      throw new ConvexError(
        `No key configured for provider "${args.provider}".`
      )
    }
    await decryptProviderKey({
      encryptedKey: candidate.encryptedKey,
      iv: candidate.iv,
    })
    return { ok: true }
  },
})

export const getWorkspaceSettingsRaw = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminIdentity(ctx)
    return await ctx.db.query('workspaceSettings').first()
  },
})

export const getTemplateById = query({
  args: {
    templateId: v.id('assessmentTemplates'),
  },
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx)
    return await ctx.db.get(args.templateId)
  },
})

export const updateAssessmentTemplate = mutation({
  args: {
    templateId: v.id('assessmentTemplates'),
    systemPrompt: v.optional(v.string()),
    childPersonaPrompt: v.optional(v.string()),
    wrapUpPrompt: v.optional(v.string()),
    rubricConfig: v.optional(
      v.object({
        dimensions: v.array(
          v.object({
            name: v.string(),
            weight: v.number(),
            isHardGate: v.boolean(),
            keywords: v.optional(v.array(v.string())),
          })
        ),
      })
    ),
    modelOverrides: v.optional(
      v.object({
        stt: v.optional(v.string()),
        llm: v.optional(v.string()),
        tts: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx)
    const template = await ctx.db.get(args.templateId)
    if (!template) {
      throw new ConvexError('Template not found.')
    }
    const nextVersion = Number.parseInt(
      template.rubricVersion.replace(/[^\d]/g, ''),
      10
    )
    await ctx.db.patch(template._id, {
      systemPrompt: args.systemPrompt,
      childPersonaPrompt: args.childPersonaPrompt,
      wrapUpPrompt: args.wrapUpPrompt,
      rubricConfig: args.rubricConfig,
      modelOverrides: args.modelOverrides,
      rubricVersion: `v${Number.isFinite(nextVersion) ? nextVersion + 1 : 2}`,
    })
    return template._id
  },
})

export const searchCandidates = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminIdentity(ctx)
    const normalized = args.query.trim().toLowerCase()
    const invites = await ctx.db.query('candidateInvites').collect()
    return invites
      .filter((invite) => {
        if (!normalized) return true
        return (
          invite.candidateName?.toLowerCase().includes(normalized) ||
          invite.candidateEmail?.toLowerCase().includes(normalized) ||
          invite.inviteToken.toLowerCase().includes(normalized)
        )
      })
      .slice(0, 20)
      .map((invite) => ({
        inviteId: invite._id,
        inviteToken: invite.inviteToken,
        candidateName: invite.candidateName,
        candidateEmail: invite.candidateEmail,
      }))
  },
})
