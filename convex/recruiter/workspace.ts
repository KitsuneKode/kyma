import { ConvexError, v } from 'convex/values'

import { api, internal } from '../_generated/api'
import type { Doc } from '../_generated/dataModel'
import { action, internalQuery, query } from '../_generated/server'
import { orgAdminMutation, recruiterQuery } from '../lib/customFunctions'
import { logAuditEvent } from '../helpers/audit'
import {
  requireAdmin,
  requireOrgId,
  requireRecruiterContext,
} from '../helpers/auth'
import { decryptProviderKey, encryptProviderKey } from '../helpers/encryption'
import { resolveOrgPlanForOrg } from '../helpers/orgPlan'
import { convexEnv } from '../../lib/env/convex'
import {
  modelOverridesValidator,
  workspaceProviderKeyValidator,
} from '../validators'
import {
  latestProviderKey,
  normalizeProvider,
} from '../../lib/providers/provider-id'

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
    const plan = await resolveOrgPlanForOrg(ctx, orgId)
    if (plan === 'free') {
      throw new ConvexError(
        'Workspace BYOK requires Pro or Enterprise. Upgrade billing to add provider keys.'
      )
    }
    if (!convexEnv.KYMA_ENCRYPTION_KEY?.trim()) {
      throw new ConvexError(
        'KYMA_ENCRYPTION_KEY is required before storing provider keys.'
      )
    }
    const trimmedKey = args.key.trim()
    if (trimmedKey.length < 8) {
      throw new ConvexError('Provider key looks too short.')
    }
    const now = Date.now()
    const keyId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${now}`
    const maskedKeyTail = trimmedKey.slice(-4)
    const settings = await ctx.db
      .query('workspaceSettings')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .first()
    const encrypted = await encryptProviderKey(trimmedKey, orgId)
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
    // Audit metadata must never include plaintext keys — provider/keyId/label only.
    const settingsId = settings
      ? settings._id
      : await ctx.db.insert('workspaceSettings', {
          orgId,
          providerKeys: [entry],
          updatedAt: now,
          updatedBy: actor,
        })
    if (settings) {
      await ctx.db.patch(settings._id, {
        providerKeys: [...(settings.providerKeys ?? []), entry],
        updatedAt: now,
        updatedBy: actor,
      })
    }

    await logAuditEvent(ctx, {
      orgId,
      actorId: actor,
      action: 'workspace.provider_key.added',
      resource: `workspace_settings:${settingsId}`,
      metadata: {
        provider: entry.provider,
        keyId: entry.keyId,
        label: entry.label ?? null,
        maskedKeyTail: entry.maskedKeyTail,
      },
    })

    return settingsId
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
    const provider = normalizeProvider(args.provider)
    const removed = (settings.providerKeys ?? []).find(
      (item) => item.provider === provider && item.keyId === args.keyId
    )
    await ctx.db.patch(settings._id, {
      providerKeys: (settings.providerKeys ?? []).filter(
        (item) => !(item.provider === provider && item.keyId === args.keyId)
      ),
      updatedAt: Date.now(),
      updatedBy: actor,
    })

    await logAuditEvent(ctx, {
      orgId,
      actorId: actor,
      action: 'workspace.provider_key.removed',
      resource: `workspace_settings:${settings._id}`,
      metadata: {
        provider,
        keyId: args.keyId,
        label: removed?.label ?? null,
      },
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
    const settingsId = settings
      ? settings._id
      : await ctx.db.insert('workspaceSettings', {
          orgId,
          defaultModels: args.models,
          updatedAt: now,
          updatedBy: actor,
        })
    if (settings) {
      await ctx.db.patch(settings._id, {
        defaultModels: args.models,
        updatedAt: now,
        updatedBy: actor,
      })
    }

    await logAuditEvent(ctx, {
      orgId,
      actorId: actor,
      action: 'workspace.default_models.updated',
      resource: `workspace_settings:${settingsId}`,
      metadata: {
        models: args.models,
      },
    })

    return settingsId
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
    const settingsId = settings
      ? settings._id
      : await ctx.db.insert('workspaceSettings', {
          orgId,
          candidateReleaseMode: args.mode,
          updatedAt: now,
          updatedBy: actor,
        })
    if (settings) {
      await ctx.db.patch(settings._id, {
        candidateReleaseMode: args.mode,
        updatedAt: now,
        updatedBy: actor,
      })
    }

    await logAuditEvent(ctx, {
      orgId,
      actorId: actor,
      action: 'workspace.candidate_release_mode.updated',
      resource: `workspace_settings:${settingsId}`,
      metadata: {
        mode: args.mode,
      },
    })

    return settingsId
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

export const getWorkspaceSettingsRaw = internalQuery({
  args: {
    orgId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id('workspaceSettings'),
      _creationTime: v.number(),
      orgId: v.string(),
      defaultModels: v.optional(modelOverridesValidator),
      candidateReleaseMode: v.optional(
        v.union(v.literal('auto'), v.literal('manual'))
      ),
      providerKeys: v.optional(v.array(workspaceProviderKeyValidator)),
      updatedAt: v.optional(v.number()),
      updatedBy: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, { orgId }) => {
    return await ctx.db
      .query('workspaceSettings')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .first()
  },
})

/** Resolve the same candidate-review capability used by recruiter chat. */
export const assertCandidateReviewAccessForAction = query({
  args: {},
  returns: v.object({ orgId: v.string() }),
  handler: async (ctx) => {
    const { orgId } = await requireRecruiterContext(
      ctx,
      'recruiter:candidates:read'
    )
    return { orgId }
  },
})

export const getWorkspaceSettingsForReportChat = action({
  args: {},
  returns: v.union(
    v.object({
      defaultModels: v.optional(modelOverridesValidator),
      providerKeys: v.optional(v.array(workspaceProviderKeyValidator)),
    }),
    v.null()
  ),
  handler: async (
    ctx
  ): Promise<{
    defaultModels?: Doc<'workspaceSettings'>['defaultModels']
    providerKeys?: Doc<'workspaceSettings'>['providerKeys']
  } | null> => {
    const { orgId } = await ctx.runQuery(
      api.recruiter.workspace.assertCandidateReviewAccessForAction,
      {}
    )
    const settings: Doc<'workspaceSettings'> | null = await ctx.runQuery(
      internal.recruiter.workspace.getWorkspaceSettingsRaw,
      { orgId }
    )
    if (!settings) {
      return null
    }
    return {
      defaultModels: settings.defaultModels,
      providerKeys: settings.providerKeys,
    }
  },
})

export const testProviderConnection = action({
  args: {
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(api.recruiter.workspace.assertAdminForAction, {})
    if (!convexEnv.KYMA_ENCRYPTION_KEY?.trim()) {
      throw new ConvexError(
        'KYMA_ENCRYPTION_KEY is required to test provider keys.'
      )
    }
    const normalizedProvider = normalizeProvider(args.provider)
    const { orgId } = await ctx.runQuery(
      api.recruiter.workspace.assertAdminForAction,
      {}
    )
    const settings = await ctx.runQuery(
      internal.recruiter.workspace.getWorkspaceSettingsRaw,
      { orgId }
    )
    const candidate = latestProviderKey(settings?.providerKeys, args.provider)
    if (!candidate) {
      throw new ConvexError(
        `No key configured for provider "${args.provider}".`
      )
    }
    const apiKey = await decryptProviderKey({
      encryptedKey: candidate.encryptedKey,
      iv: candidate.iv,
      aad: orgId,
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
