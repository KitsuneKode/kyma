import { ConvexError, v } from 'convex/values'

import { finalizeInterviewForProcessing } from './helpers/finalizeInterviewProcessing'
import {
  resolveTemplateSimulationMode,
  resolveTemplateSimulationPersonaPrompt,
} from './helpers/assessmentTemplateMigration'
import { resolveInterviewPolicyFromInvite } from './helpers/interviewPolicy'
import { upsertTranscriptSegmentForSession } from './helpers/transcriptSegments'
import { pipelineMutation, pipelineQuery } from './lib/pipelineFunctions'
import {
  interviewSessionStateValidator,
  jobFamilyValidator,
  modelOverridesValidator,
  sessionPurposeValidator,
  simulationModeValidator,
  workspaceProviderKeyValidator,
} from './validators'
import {
  maxActiveDurationMs,
  resolveSessionBudget,
  resolveSessionPurpose,
} from '../lib/interview/session-purpose'

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
  jobFamily: v.optional(jobFamilyValidator),
  simulationMode: simulationModeValidator,
  systemPrompt: v.optional(v.string()),
  childPersonaPrompt: v.optional(v.string()),
  simulationPersonaPrompt: v.optional(v.string()),
  wrapUpPrompt: v.optional(v.string()),
  modelOverrides: v.optional(modelOverridesValidator),
  defaultModels: v.optional(modelOverridesValidator),
  rubricConfig: v.optional(rubricConfigValidator),
  providerKeys: v.optional(v.array(workspaceProviderKeyValidator)),
  sessionState: interviewSessionStateValidator,
  sessionPurpose: sessionPurposeValidator,
  activeDurationMs: v.number(),
  maxActiveDurationMs: v.number(),
  maxCandidateTurns: v.number(),
  maxAgentTurns: v.number(),
})

export const getInterviewAgentConfig = pipelineQuery({
  args: {
    sessionId: v.id('interviewSessions'),
  },
  returns: v.union(interviewAgentConfigValidator, v.null()),
  handler: async (ctx, args) => {
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
    const sessionPurpose = resolveSessionPurpose(
      session.sessionPurpose ?? invite.sessionPurpose
    )
    const budget = resolveSessionBudget(sessionPurpose)
    const workspaceSettings = await ctx.db
      .query('workspaceSettings')
      .withIndex('by_org_id', (q) => q.eq('orgId', invite.orgId))
      .first()

    return {
      templateName: template.name,
      targetDurationMinutes: policy.targetDurationMinutes,
      jobFamily: template.jobFamily,
      simulationMode: resolveTemplateSimulationMode(template),
      systemPrompt: template.systemPrompt,
      childPersonaPrompt: template.childPersonaPrompt,
      simulationPersonaPrompt: resolveTemplateSimulationPersonaPrompt(template),
      wrapUpPrompt: template.wrapUpPrompt,
      modelOverrides: template.modelOverrides,
      defaultModels: workspaceSettings?.defaultModels,
      rubricConfig: template.rubricConfig,
      providerKeys: workspaceSettings?.providerKeys,
      sessionState: session.state,
      sessionPurpose,
      activeDurationMs: session.activeDurationMs ?? 0,
      maxActiveDurationMs: maxActiveDurationMs(sessionPurpose),
      maxCandidateTurns: budget.maxCandidateTurns,
      maxAgentTurns: budget.maxAgentTurns,
    }
  },
})

export const requestInterviewProcessing = pipelineMutation({
  args: {
    sessionId: v.id('interviewSessions'),
    detail: v.optional(v.string()),
  },
  returns: v.object({
    queued: v.boolean(),
    transitioned: v.boolean(),
  }),
  handler: async (ctx, args) => {
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

export const upsertAgentTranscriptSegment = pipelineMutation({
  args: {
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
