import { ConvexError, v } from 'convex/values'

import { finalizeInterviewForProcessing } from './helpers/finalizeInterviewProcessing'
import {
  resolveTemplateSimulationMode,
  resolveTemplateSimulationPersonaPrompt,
} from './helpers/assessmentTemplateMigration'
import { resolveInterviewPolicyFromInvite } from './helpers/interviewPolicy'
import { upsertTranscriptSegmentForSession } from './helpers/transcriptSegments'
import { DEFAULT_SESSION_TRANSCRIPT_LIMIT } from './helpers/sessionReview'
import { pipelineMutation, pipelineQuery } from './lib/pipelineFunctions'
import {
  interviewSessionStateValidator,
  interviewStyleModeValidator,
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
  candidateTurnCount: v.number(),
  agentTurnCount: v.number(),
  orgId: v.string(),
  interviewStyleMode: v.optional(interviewStyleModeValidator),
  policySnapshot: v.optional(
    v.object({
      targetDurationMinutes: v.number(),
      allowsResume: v.boolean(),
      maxAttempts: v.number(),
      rubricVersion: v.string(),
      templateId: v.string(),
      templateName: v.optional(v.string()),
      interviewStyleMode: v.optional(interviewStyleModeValidator),
    })
  ),
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

    // Seed turn counters from persisted transcript so a redispatch does not reset
    // the budget. Counts are final segments only; partials are not counted.
    const segments = await ctx.db
      .query('transcriptSegments')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .take(DEFAULT_SESSION_TRANSCRIPT_LIMIT)
    let candidateTurnCount = 0
    let agentTurnCount = 0
    for (const segment of segments) {
      if (segment.status !== 'final') continue
      if (segment.speaker === 'candidate') candidateTurnCount += 1
      else if (segment.speaker === 'agent') agentTurnCount += 1
    }

    return {
      templateName: template.name,
      targetDurationMinutes:
        session.policySnapshot?.targetDurationMinutes ??
        policy.targetDurationMinutes,
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
      candidateTurnCount,
      agentTurnCount,
      orgId: invite.orgId,
      interviewStyleMode:
        session.interviewStyleMode ?? template.interviewStyleMode ?? 'standard',
      policySnapshot: session.policySnapshot ?? {
        targetDurationMinutes: policy.targetDurationMinutes,
        allowsResume: policy.allowsResume,
        maxAttempts: policy.maxAttempts,
        rubricVersion: template.rubricVersion,
        templateId: `${invite.templateId}`,
        templateName: template.name,
        interviewStyleMode: template.interviewStyleMode ?? 'standard',
      },
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
