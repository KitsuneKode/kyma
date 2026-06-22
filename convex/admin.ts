import { ConvexError, v } from 'convex/values'

import { api } from './_generated/api'
import { action, query } from './_generated/server'
import {
  orgAdminMutation,
  recruiterMutation,
  recruiterQuery,
} from './lib/customFunctions'
import { getRecruiterActorId, requireAdmin, requireOrgId } from './helpers/auth'
import { logAuditEvent } from './helpers/audit'
import { assertOrgOwnsReport, assertOrgOwnsSession } from './helpers/orgAccess'
import { ensureDefaultTemplate } from './helpers/templates'
import { decryptProviderKey, encryptProviderKey } from './helpers/encryption'
import { runtimeEnv } from '../lib/env/runtime'
import { modelOverridesValidator } from './validators'
import { slugify } from '../lib/format/slug'
import {
  latestProviderKey,
  normalizeProvider,
} from '../lib/providers/provider-id'

function buildInviteToken(candidateName: string) {
  const prefix = slugify(candidateName) || 'candidate'
  const suffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now()}`

  return `${prefix}-${suffix}`
}

export const bootstrapOrgTemplates = recruiterMutation({
  args: {},
  returns: v.object({ templateId: v.id('assessmentTemplates') }),
  handler: async (ctx) => {
    const { orgId } = ctx
    const template = await ensureDefaultTemplate(ctx, orgId)
    return { templateId: template._id }
  },
})

export const createAssessmentTemplate = recruiterMutation({
  args: {
    name: v.string(),
    role: v.optional(v.string()),
    targetDurationMinutes: v.optional(v.number()),
    allowsResume: v.optional(v.boolean()),
    interviewStyleMode: v.optional(
      v.union(v.literal('standard'), v.literal('intensive'))
    ),
  },
  returns: v.id('assessmentTemplates'),
  handler: async (ctx, args) => {
    const { orgId } = ctx
    const actor = (await getRecruiterActorId(ctx)) ?? 'recruiter'
    const name = args.name.trim()
    if (!name) {
      throw new ConvexError('Template name is required.')
    }

    const templateId = await ctx.db.insert('assessmentTemplates', {
      orgId,
      name,
      role: args.role?.trim() || 'teacher',
      status: 'active',
      createdBy: actor,
      rubricVersion: 'v1',
      targetDurationMinutes: args.targetDurationMinutes,
      allowsResume: args.allowsResume ?? true,
      interviewStyleMode: args.interviewStyleMode ?? 'standard',
    })

    await logAuditEvent(ctx, {
      orgId,
      actorId: actor,
      action: 'template.created',
      resource: `template:${templateId}`,
      metadata: { name },
    })

    return templateId
  },
})

export const listActiveTemplates = recruiterQuery({
  args: {},
  handler: async (ctx) => {
    const { orgId } = ctx

    const templates = await ctx.db
      .query('assessmentTemplates')
      .withIndex('by_org_id_and_status', (q) =>
        q.eq('orgId', orgId).eq('status', 'active')
      )
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

export const listScreeningBatches = recruiterQuery({
  args: {},
  handler: async (ctx) => {
    const { orgId } = ctx

    const batches = await ctx.db
      .query('screeningBatches')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .collect()

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

export const createScreeningBatch = recruiterMutation({
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
        candidateEmail: v.optional(v.string()),
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
      const inviteId = await ctx.db.insert('candidateInvites', {
        orgId,
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
        orgId,
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

export const addRecruiterNote = recruiterMutation({
  args: {
    sessionId: v.id('interviewSessions'),
    reportId: v.optional(v.id('assessmentReports')),
    authorId: v.optional(v.string()),
    body: v.string(),
  },
  returns: v.id('recruiterNotes'),
  handler: async (ctx, args) => {
    const { orgId } = ctx
    const authorId = await getRecruiterActorId(ctx)

    await assertOrgOwnsSession(ctx, orgId, args.sessionId)
    if (args.reportId) {
      const report = await assertOrgOwnsReport(ctx, orgId, args.reportId)
      if (report.sessionId !== args.sessionId) {
        throw new ConvexError(
          'Assessment report does not belong to this session.'
        )
      }
    }

    const noteId = await ctx.db.insert('recruiterNotes', {
      orgId,
      ...args,
      authorId: authorId ?? args.authorId,
      createdAt: new Date().toISOString(),
    })

    await logAuditEvent(ctx, {
      orgId,
      actorId: authorId ?? args.authorId ?? undefined,
      action: 'recruiter_note.created',
      resource: `session:${args.sessionId}`,
      metadata: { noteId },
    })

    return noteId
  },
})

export const addReportChatMessage = recruiterMutation({
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
  returns: v.id('reportChatMessages'),
  handler: async (ctx, args) => {
    const { orgId } = ctx

    await assertOrgOwnsSession(ctx, orgId, args.sessionId)
    if (args.reportId) {
      const report = await assertOrgOwnsReport(ctx, orgId, args.reportId)
      if (report.sessionId !== args.sessionId) {
        throw new ConvexError(
          'Assessment report does not belong to this session.'
        )
      }
    }

    return await ctx.db.insert('reportChatMessages', {
      orgId,
      ...args,
      createdAt: new Date().toISOString(),
    })
  },
})

export const getDashboardSummary = recruiterQuery({
  args: {},
  handler: async (ctx) => {
    const { orgId } = ctx
    const [
      manualReviewReports,
      pendingReports,
      sessions,
      invites,
      recentEvents,
    ] = await Promise.all([
      ctx.db
        .query('assessmentReports')
        .withIndex('by_org_id_and_status', (q) =>
          q.eq('orgId', orgId).eq('status', 'manual_review')
        )
        .collect(),
      ctx.db
        .query('assessmentReports')
        .withIndex('by_org_id_and_status', (q) =>
          q.eq('orgId', orgId).eq('status', 'pending')
        )
        .collect(),
      ctx.db
        .query('interviewSessions')
        .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
        .collect(),
      ctx.db
        .query('candidateInvites')
        .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
        .collect(),
      ctx.db
        .query('sessionEvents')
        .withIndex('by_org_id_and_created_at', (q) => q.eq('orgId', orgId))
        .order('desc')
        .take(10),
    ])

    const reports = [...manualReviewReports, ...pendingReports]

    const now = Date.now()
    const in24h = now + 24 * 60 * 60 * 1000
    const oneHourAgo = now - 60 * 60 * 1000

    const pendingReviews = reports.length
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

    const manualReviewCandidates = await Promise.all(
      manualReviewReports.map(async (report) => {
        const session = await ctx.db.get(report.sessionId)
        const invite = session ? await ctx.db.get(session.inviteId) : null
        return {
          reportId: report._id,
          sessionId: report.sessionId,
          candidateName: invite?.candidateName ?? 'Candidate',
        }
      })
    )

    return {
      counts: {
        pendingReviews,
        activeSessions,
        expiringInvites,
        sessionsToday,
      },
      needsAttention: {
        manualReviewCandidates,
        invitesExpiringSoon: invites
          .filter((invite) => {
            const expiry = Date.parse(invite.expiresAt)
            return Number.isFinite(expiry) && expiry > now && expiry <= in24h
          })
          .map((invite) => ({
            inviteId: invite._id,
            inviteToken: invite.inviteToken,
            expiresAt: invite.expiresAt,
            candidateName: invite.candidateName,
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
      recentActivity: recentEvents.map((event) => ({
        id: event._id,
        type: event.type,
        detail: event.detail,
        sessionId: event.sessionId,
        createdAt: event.createdAt,
      })),
    }
  },
})

export const getWorkspaceSettings = recruiterQuery({
  args: {},
  handler: async (ctx) => {
    const { orgId } = ctx
    const settings = await ctx.db
      .query('workspaceSettings')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .first()
    if (!settings) return null
    return {
      id: settings._id,
      defaultModels: settings.defaultModels,
      candidateReleaseMode: settings.candidateReleaseMode ?? 'auto',
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

export const addProviderKey = orgAdminMutation({
  args: {
    provider: v.string(),
    key: v.string(),
    label: v.optional(v.string()),
  },
  returns: v.id('workspaceSettings'),
  handler: async (ctx, args) => {
    const { orgId, actor } = ctx
    const now = Date.now()
    const keyId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${now}`
    const maskedKeyTail = args.key.slice(-4)
    const settings = await ctx.db
      .query('workspaceSettings')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .first()
    const encrypted = await encryptProviderKey(args.key)
    const entry = {
      keyId,
      provider: normalizeProvider(args.provider),
      encryptedKey: encrypted.encryptedKey,
      iv: encrypted.iv,
      label: args.label,
      addedAt: now,
      addedBy: actor,
      maskedKeyTail,
    }
    if (!settings) {
      return await ctx.db.insert('workspaceSettings', {
        orgId,
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

export const removeProviderKey = orgAdminMutation({
  args: {
    provider: v.string(),
    keyId: v.string(),
  },
  returns: v.union(v.id('workspaceSettings'), v.null()),
  handler: async (ctx, args) => {
    const { orgId, actor } = ctx
    const settings = await ctx.db
      .query('workspaceSettings')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .first()
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

export const updateDefaultModels = orgAdminMutation({
  args: {
    models: modelOverridesValidator,
  },
  returns: v.id('workspaceSettings'),
  handler: async (ctx, args) => {
    const { orgId, actor } = ctx
    const now = Date.now()
    const settings = await ctx.db
      .query('workspaceSettings')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .first()
    if (!settings) {
      return await ctx.db.insert('workspaceSettings', {
        orgId,
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

export const updateCandidateReleaseMode = orgAdminMutation({
  args: {
    mode: v.union(v.literal('auto'), v.literal('manual')),
  },
  returns: v.id('workspaceSettings'),
  handler: async (ctx, args) => {
    const { orgId, actor } = ctx
    const now = Date.now()
    const settings = await ctx.db
      .query('workspaceSettings')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .first()
    if (!settings) {
      return await ctx.db.insert('workspaceSettings', {
        orgId,
        candidateReleaseMode: args.mode,
        updatedAt: now,
        updatedBy: actor,
      })
    }
    await ctx.db.patch(settings._id, {
      candidateReleaseMode: args.mode,
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
    await ctx.runQuery(api.admin.assertAdminForAction, {})
    if (!runtimeEnv.KYMA_ENCRYPTION_KEY?.trim()) {
      throw new ConvexError(
        'KYMA_ENCRYPTION_KEY is required to test provider keys.'
      )
    }
    const normalizedProvider = normalizeProvider(args.provider)
    const settings = await ctx.runQuery(api.admin.getWorkspaceSettingsRaw, {})
    const candidate = latestProviderKey(settings?.providerKeys, args.provider)
    if (!candidate) {
      throw new ConvexError(
        `No key configured for provider "${args.provider}".`
      )
    }
    const apiKey = await decryptProviderKey({
      encryptedKey: candidate.encryptedKey,
      iv: candidate.iv,
    })
    if (!apiKey?.trim()) {
      throw new ConvexError(
        `Configured key for provider "${args.provider}" is empty after decrypt.`
      )
    }

    if (normalizedProvider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!response.ok) {
        throw new ConvexError(
          `OpenAI connection failed (${response.status}): ${await response.text()}`
        )
      }
      return { ok: true, provider: 'openai' as const }
    }

    if (normalizedProvider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      })
      if (!response.ok) {
        throw new ConvexError(
          `Anthropic connection failed (${response.status}): ${await response.text()}`
        )
      }
      return { ok: true, provider: 'anthropic' as const }
    }

    if (normalizedProvider === 'google') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
      )
      if (!response.ok) {
        throw new ConvexError(
          `Google connection failed (${response.status}): ${await response.text()}`
        )
      }
      return {
        ok: true,
        provider:
          args.provider.toLowerCase() === 'gemini'
            ? ('gemini' as const)
            : ('google' as const),
      }
    }

    if (normalizedProvider === 'deepgram') {
      const response = await fetch('https://api.deepgram.com/v1/projects', {
        headers: { Authorization: `Token ${apiKey}` },
      })
      if (!response.ok) {
        throw new ConvexError(
          `Deepgram connection failed (${response.status}): ${await response.text()}`
        )
      }
      return { ok: true, provider: 'deepgram' as const }
    }

    throw new ConvexError(
      `Provider "${args.provider}" is not supported in testProviderConnection yet.`
    )
  },
})

export const assertAdminForAction = query({
  args: {},
  returns: v.object({ orgId: v.string() }),
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const orgId = await requireOrgId(ctx)
    return { orgId }
  },
})

export const getWorkspaceSettingsRaw = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const orgId = await requireOrgId(ctx)
    return await ctx.db
      .query('workspaceSettings')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .first()
  },
})

export const getTemplateById = recruiterQuery({
  args: {
    templateId: v.id('assessmentTemplates'),
  },
  handler: async (ctx, args) => {
    const { orgId } = ctx
    const template = await ctx.db.get(args.templateId)
    if (!template || template.orgId !== orgId) {
      return null
    }
    return template
  },
})

export const updateAssessmentTemplate = recruiterMutation({
  args: {
    templateId: v.id('assessmentTemplates'),
    name: v.optional(v.string()),
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
    modelOverrides: v.optional(modelOverridesValidator),
  },
  returns: v.id('assessmentTemplates'),
  handler: async (ctx, args) => {
    const { orgId } = ctx
    const actor = (await getRecruiterActorId(ctx)) ?? 'admin'
    const template = await ctx.db.get(args.templateId)
    if (!template || template.orgId !== orgId) {
      throw new ConvexError('Template not found.')
    }
    const nextVersion = Number.parseInt(
      template.rubricVersion.replace(/[^\d]/g, ''),
      10
    )
    const nextRubricVersion = `v${Number.isFinite(nextVersion) ? nextVersion + 1 : 2}`

    await ctx.db.patch(template._id, {
      ...(args.name?.trim() ? { name: args.name.trim() } : {}),
      systemPrompt: args.systemPrompt,
      childPersonaPrompt: args.childPersonaPrompt,
      wrapUpPrompt: args.wrapUpPrompt,
      rubricConfig: args.rubricConfig,
      modelOverrides: args.modelOverrides,
      rubricVersion: nextRubricVersion,
    })

    await ctx.db.insert('assessmentTemplateVersions', {
      orgId,
      templateId: template._id,
      rubricVersion: nextRubricVersion,
      savedAt: Date.now(),
      savedBy: actor,
      systemPrompt: args.systemPrompt,
      childPersonaPrompt: args.childPersonaPrompt,
      wrapUpPrompt: args.wrapUpPrompt,
      rubricConfig: args.rubricConfig,
      modelOverrides: args.modelOverrides,
    })
    return template._id
  },
})

export const listTemplateVersions = recruiterQuery({
  args: {
    templateId: v.id('assessmentTemplates'),
  },
  handler: async (ctx, args) => {
    const { orgId } = ctx
    const template = await ctx.db.get(args.templateId)
    if (!template || template.orgId !== orgId) {
      return []
    }
    const versions = await ctx.db
      .query('assessmentTemplateVersions')
      .withIndex('by_template_and_saved_at', (q) =>
        q.eq('templateId', args.templateId)
      )
      .order('desc')
      .take(50)

    return versions.map((version) => ({
      id: version._id,
      rubricVersion: version.rubricVersion,
      savedAt: version.savedAt,
      savedBy: version.savedBy,
    }))
  },
})

export const searchCandidates = recruiterQuery({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = ctx
    const normalized = args.query.trim().toLowerCase()
    const invites = await ctx.db
      .query('candidateInvites')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .collect()
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
