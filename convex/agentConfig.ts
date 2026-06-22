import { ConvexError, v } from 'convex/values'

import { mutation, query } from './_generated/server'
import { finalizeInterviewForProcessing } from './helpers/finalizeInterviewProcessing'
import { resolveInterviewPolicyFromInvite } from './helpers/interviewPolicy'
import { hasTrustedProcessingKey } from './helpers/processingAuth'
import { upsertTranscriptSegmentForSession } from './helpers/transcriptSegments'
import {
  interviewSessionStateValidator,
  modelOverridesValidator,
  workspaceProviderKeyValidator,
} from './validators'

const rubricConfigValidator = v.object({
  dimensions: v.array(
    v.object({
      name: v.string(),
      weight: v.number(),
      isHardGate: v.boolean(),
      keywords: v.optional(v.array(v.string())),
    })
  ),
})

const interviewAgentConfigValidator = v.object({
  templateName: v.string(),
  targetDurationMinutes: v.number(),
  systemPrompt: v.optional(v.string()),
  childPersonaPrompt: v.optional(v.string()),
  wrapUpPrompt: v.optional(v.string()),
  modelOverrides: v.optional(modelOverridesValidator),
  rubricConfig: v.optional(rubricConfigValidator),
  providerKeys: v.optional(v.array(workspaceProviderKeyValidator)),
  sessionState: interviewSessionStateValidator,
})

export const getInterviewAgentConfig = query({
  args: {
    sessionId: v.id('interviewSessions'),
    processingKey: v.optional(v.string()),
  },
  returns: v.union(interviewAgentConfigValidator, v.null()),
  handler: async (ctx, args) => {
    if (!hasTrustedProcessingKey(args.processingKey)) {
      throw new ConvexError('Invalid processing key for agent config.')
    }

    const session = await ctx.db.get(args.sessionId)
    if (!session) {
      return null
    }

    const invite = await ctx.db.get(session.inviteId)
    if (!invite) {
      return null
    }

    const template = await ctx.db.get(invite.templateId)
    if (!template) {
      return null
    }

    const { policy } = await resolveInterviewPolicyFromInvite(ctx, invite)
    const workspaceSettings = await ctx.db
      .query('workspaceSettings')
      .withIndex('by_org_id', (q) => q.eq('orgId', invite.orgId))
      .first()

    return {
      templateName: template.name,
      targetDurationMinutes: policy.targetDurationMinutes,
      systemPrompt: template.systemPrompt,
      childPersonaPrompt: template.childPersonaPrompt,
      wrapUpPrompt: template.wrapUpPrompt,
      modelOverrides: template.modelOverrides,
      rubricConfig: template.rubricConfig,
      providerKeys: workspaceSettings?.providerKeys,
      sessionState: session.state,
    }
  },
})

export const requestInterviewProcessing = mutation({
  args: {
    processingKey: v.optional(v.string()),
    sessionId: v.id('interviewSessions'),
    detail: v.optional(v.string()),
  },
  returns: v.object({
    queued: v.boolean(),
    transitioned: v.boolean(),
  }),
  handler: async (ctx, args) => {
    if (!hasTrustedProcessingKey(args.processingKey)) {
      throw new ConvexError('Invalid processing key for interview processing.')
    }

    const session = await ctx.db.get(args.sessionId)
    if (!session) {
      throw new ConvexError('Interview session not found.')
    }

    return await finalizeInterviewForProcessing(ctx, session, {
      detail:
        args.detail ??
        'Agent completed the interview and requested post-call processing.',
      source: 'livekit-agent',
      dedupeKey: `agent-complete:${session._id}`,
      allowedStates: ['live', 'reconnecting', 'interrupted', 'connecting'],
    })
  },
})

export const upsertAgentTranscriptSegment = mutation({
  args: {
    processingKey: v.optional(v.string()),
    sessionId: v.id('interviewSessions'),
    segmentId: v.string(),
    speaker: v.union(
      v.literal('agent'),
      v.literal('candidate'),
      v.literal('system')
    ),
    text: v.string(),
    status: v.union(v.literal('partial'), v.literal('final')),
    startedAt: v.string(),
    endedAt: v.optional(v.string()),
  },
  returns: v.id('transcriptSegments'),
  handler: async (ctx, args) => {
    if (!hasTrustedProcessingKey(args.processingKey)) {
      throw new ConvexError('Invalid processing key for transcript write.')
    }

    return await upsertTranscriptSegmentForSession(ctx, {
      sessionId: args.sessionId,
      segmentId: args.segmentId,
      speaker: args.speaker,
      text: args.text,
      status: args.status,
      startedAt: args.startedAt,
      endedAt: args.endedAt,
    })
  },
})

/** @internal Alias for pipeline callers that already use internal naming. */
export const getAgentSessionConfig = getInterviewAgentConfig
