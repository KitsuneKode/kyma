import { v } from 'convex/values'

import { pipelineMutation, pipelineQuery } from '../lib/pipelineFunctions'
import {
  persistAssessmentReport,
  saveAssessmentReportFields,
} from '../helpers/assessmentReports'
import { resolveInterviewPolicyFromInvite } from '../helpers/interviewPolicy'
import { requireSessionOrgId } from '../helpers/processingAuth'
import {
  DEFAULT_SESSION_EVENTS_LIMIT,
  DEFAULT_SESSION_TRANSCRIPT_LIMIT,
  loadSessionReviewBaseForPipeline,
  loadSessionReviewSlices,
  resolveTemplateName,
} from '../helpers/sessionReview'
import {
  interviewPolicySnapshotValidator,
  modelOverridesValidator,
  rubricConfigValidator,
  workspaceProviderKeyValidator,
} from '../validators'

export const getSessionProcessingDetail = pipelineQuery({
  args: {
    sessionId: v.id('interviewSessions'),
  },
  returns: v.union(
    v.object({
      sessionId: v.id('interviewSessions'),
      candidate: v.object({ name: v.string() }),
      template: v.object({
        name: v.string(),
        rubricConfig: v.optional(rubricConfigValidator),
        modelOverrides: v.optional(modelOverridesValidator),
      }),
      workspace: v.union(
        v.object({
          defaultModels: v.optional(modelOverridesValidator),
          providerKeys: v.optional(v.array(workspaceProviderKeyValidator)),
        }),
        v.null()
      ),
      policySnapshot: interviewPolicySnapshotValidator,
      report: v.union(
        v.object({
          id: v.id('assessmentReports'),
          status: v.string(),
        }),
        v.null()
      ),
      transcript: v.array(
        v.object({
          speaker: v.string(),
          text: v.string(),
          status: v.string(),
          startedAt: v.string(),
          endedAt: v.optional(v.string()),
        })
      ),
      events: v.array(
        v.object({
          type: v.string(),
          detail: v.optional(v.string()),
          createdAt: v.string(),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, { sessionId }) => {
    const base = await loadSessionReviewBaseForPipeline(ctx, sessionId)

    if (!base || !base.invite) {
      return null
    }

    const { orgId, session, invite, template, report } = base

    const { snapshot: policySnapshot } = await resolveInterviewPolicyFromInvite(
      ctx,
      invite
    )
    const workspaceSettings = await ctx.db
      .query('workspaceSettings')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .first()

    const { transcript, events } = await loadSessionReviewSlices(
      ctx,
      sessionId,
      undefined,
      {
        transcriptLimit: DEFAULT_SESSION_TRANSCRIPT_LIMIT,
        eventsLimit: DEFAULT_SESSION_EVENTS_LIMIT,
      }
    )

    return {
      sessionId: session._id,
      candidate: {
        name: invite.candidateName ?? 'Candidate',
      },
      template: {
        name: resolveTemplateName(template?.name),
        rubricConfig: template?.rubricConfig ?? undefined,
        modelOverrides: template?.modelOverrides ?? undefined,
      },
      workspace: workspaceSettings
        ? {
            defaultModels: workspaceSettings.defaultModels ?? undefined,
            providerKeys: workspaceSettings.providerKeys ?? undefined,
          }
        : null,
      policySnapshot,
      report: report
        ? {
            id: report._id,
            status: report.status,
          }
        : null,
      transcript: transcript.map((segment) => ({
        speaker: segment.speaker,
        text: segment.text,
        status: segment.status,
        startedAt: segment.startedAt,
        endedAt: segment.endedAt,
      })),
      events: events.map((event) => ({
        type: event.type,
        detail: event.detail,
        createdAt: event.createdAt,
      })),
    }
  },
})

export const saveAssessmentReport = pipelineMutation({
  args: saveAssessmentReportFields,
  returns: v.id('assessmentReports'),
  handler: async (ctx, args) => {
    const orgId = await requireSessionOrgId(ctx, args.sessionId)

    return await persistAssessmentReport(ctx, orgId, args, {
      rateLimit: false,
    })
  },
})
