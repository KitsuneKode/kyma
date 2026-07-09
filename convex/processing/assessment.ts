import { v } from 'convex/values'

import { pipelineMutation, pipelineQuery } from '../lib/pipelineFunctions'
import {
  persistAssessmentReport,
  saveAssessmentReportFields,
} from '../helpers/assessmentReports'
import { resolveInterviewPolicyFromInvite } from '../helpers/interviewPolicy'
import { requireSessionOrgId } from '../helpers/processingAuth'
import {
  loadSessionReviewBaseForPipeline,
  loadSessionReviewSlices,
  resolveTemplateName,
} from '../helpers/sessionReview'

const MAX_PROCESSING_TRANSCRIPT_SEGMENTS = 500
const MAX_PROCESSING_EVENTS = 200

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
        rubricConfig: v.optional(v.any()),
        modelOverrides: v.optional(v.any()),
      }),
      workspace: v.union(
        v.object({
          defaultModels: v.optional(v.any()),
          providerKeys: v.optional(v.any()),
        }),
        v.null()
      ),
      policySnapshot: v.any(),
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
        transcriptLimit: MAX_PROCESSING_TRANSCRIPT_SEGMENTS,
        eventsLimit: MAX_PROCESSING_EVENTS,
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
