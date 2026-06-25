import { ConvexError, v } from 'convex/values'

import { mutation, query } from '../_generated/server'
import {
  candidateReadQuery,
  candidateWriteMutation,
} from '../lib/customFunctions'
import {
  getRecruiterActorId,
  requireOrgId,
  requireRecruiterCapability,
} from '../helpers/auth'
import { logAuditEvent } from '../helpers/audit'
import {
  assertOrgOwnsReport,
  assertOrgOwnsSession,
  assertReportBelongsToSession,
} from '../helpers/orgAccess'
import {
  releaseReportToCandidate,
  resolveReleaseMode,
  shouldAutoRelease,
} from '../helpers/releasePolicy'
import {
  hasTrustedProcessingKey,
  resolveOrgIdForPipelineWrite,
} from '../helpers/processingAuth'
import {
  loadSessionReviewBase,
  loadSessionReviewSlices,
  resolveTemplateName,
  sortByIsoAsc,
} from '../helpers/sessionReview'
import { isConvexDevelopmentMode } from '../../lib/env/deployment-mode'
import { convexEnv } from '../../lib/env/convex'
import { reviewDecisionValidator } from '../validators'
import {
  persistAssessmentReport,
  saveAssessmentReportFields,
} from '../helpers/assessmentReports'

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

const MAX_REVIEW_DECISIONS = 100
const MAX_SESSION_RECORDINGS = 20
const MAX_RECRUITER_NOTES = 200
const MAX_CHAT_MESSAGES = 500

export const addRecruiterNote = candidateWriteMutation({
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

export const addReportChatMessage = candidateWriteMutation({
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

export const getReportChatGrounding = candidateReadQuery({
  args: {
    sessionId: v.id('interviewSessions'),
  },
  handler: async (ctx, { sessionId }) => {
    const base = await loadSessionReviewBase(ctx, sessionId)

    if (!base || !base.invite) {
      return null
    }

    const { invite, template, report } = base

    const { transcript, evidence } = await loadSessionReviewSlices(
      ctx,
      sessionId,
      report?._id
    )

    const finalTranscript = transcript.filter(
      (segment) => segment.status === 'final'
    )

    return {
      candidate: {
        name: invite.candidateName ?? 'Candidate',
      },
      template: {
        name: resolveTemplateName(template?.name),
        modelOverrides: template?.modelOverrides,
      },
      report: report
        ? {
            summary: report.summary,
            recommendation: report.overallRecommendation,
            confidence: report.confidence,
            topStrengths: report.topStrengths ?? [],
            topConcerns: report.topConcerns ?? [],
            dimensionScores: report.dimensionScores ?? [],
          }
        : null,
      transcript: finalTranscript.slice(-20).map((segment) => ({
        speaker: segment.speaker,
        text: segment.text,
        startedAt: segment.startedAt,
      })),
      evidence: evidence.slice(0, 8).map((item) => ({
        dimension: item.dimension,
        snippet: item.snippet,
        rationale: item.rationale,
      })),
    }
  },
})

export const getCandidateReviewDetail = query({
  args: {
    sessionId: v.id('interviewSessions'),
    processingKey: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, processingKey }) => {
    const base = await loadSessionReviewBase(ctx, sessionId, processingKey)

    if (!base) {
      return null
    }

    const { session, invite, template, report } = base

    const [slices, decisions, recordings, notes, chatMessages] =
      await Promise.all([
        loadSessionReviewSlices(ctx, sessionId, report?._id),
        ctx.db
          .query('reviewDecisions')
          .withIndex('by_session_and_created_at', (q) =>
            q.eq('sessionId', sessionId)
          )
          .order('desc')
          .take(MAX_REVIEW_DECISIONS),
        ctx.db
          .query('recordingArtifacts')
          .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
          .take(MAX_SESSION_RECORDINGS),
        ctx.db
          .query('recruiterNotes')
          .withIndex('by_session_and_created_at', (q) =>
            q.eq('sessionId', sessionId)
          )
          .order('desc')
          .take(MAX_RECRUITER_NOTES),
        ctx.db
          .query('reportChatMessages')
          .withIndex('by_session_and_created_at', (q) =>
            q.eq('sessionId', sessionId)
          )
          .order('desc')
          .take(MAX_CHAT_MESSAGES),
      ])

    const { transcript, events, evidence } = slices

    const finalTranscript = transcript.filter(
      (segment) => segment.status === 'final'
    )
    const candidateTranscript = finalTranscript.filter(
      (segment) => segment.speaker === 'candidate'
    )
    const agentTranscript = finalTranscript.filter(
      (segment) => segment.speaker === 'agent'
    )

    return {
      session: {
        id: session._id,
        state: session.state,
        provider: session.provider,
        roomName: session.roomName,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        failureReason: session.failureReason,
      },
      candidate: {
        inviteToken: invite?.inviteToken,
        name: invite?.candidateName ?? 'Candidate',
        email: invite?.candidateEmail,
        inviteStatus: invite?.status ?? 'created',
        expiresAt: invite?.expiresAt,
      },
      template: {
        id: template?._id,
        name: resolveTemplateName(template?.name),
        role: template?.role ?? 'teacher',
        rubricVersion: template?.rubricVersion ?? 'v1',
        modelOverrides: template?.modelOverrides ?? undefined,
      },
      report: report
        ? {
            id: report._id,
            status: report.status,
            recommendation: report.overallRecommendation,
            confidence: report.confidence,
            summary: report.summary,
            weightedScore: report.weightedScore,
            hardGateTriggered: report.hardGateTriggered ?? false,
            scoringSource: report.scoringSource,
            scoringModelId: report.scoringModelId,
            topStrengths: report.topStrengths ?? [],
            topConcerns: report.topConcerns ?? [],
            transcriptQualityNote: report.transcriptQualityNote,
            generatedAt: report.generatedAt,
            dimensionScores: report.dimensionScores ?? [],
            policySnapshot: report.policySnapshot,
            released: report.released ?? false,
            releasedAt: report.releasedAt,
            releasedBy: report.releasedBy,
          }
        : null,
      transcriptMetrics: {
        totalSegments: finalTranscript.length,
        candidateTurns: candidateTranscript.length,
        agentTurns: agentTranscript.length,
        candidateWords: candidateTranscript.reduce(
          (total, segment) => total + countWords(segment.text),
          0
        ),
        agentWords: agentTranscript.reduce(
          (total, segment) => total + countWords(segment.text),
          0
        ),
      },
      transcript: transcript.map((segment) => ({
        id: `${segment._id}`,
        speaker: segment.speaker,
        text: segment.text,
        status: segment.status,
        startedAt: segment.startedAt,
        endedAt: segment.endedAt,
      })),
      events: events.map((event) => ({
        id: `${event._id}`,
        type: event.type,
        detail: event.detail,
        createdAt: event.createdAt,
      })),
      evidence: evidence.map((item) => ({
        id: `${item._id}`,
        dimension: item.dimension,
        snippet: item.snippet,
        rationale: item.rationale,
        startedAt: item.startedAt,
        endedAt: item.endedAt,
        createdAt: item.createdAt,
      })),
      decisions: [...decisions]
        .toSorted((left, right) =>
          right.createdAt.localeCompare(left.createdAt)
        )
        .map((decision) => ({
          id: `${decision._id}`,
          decision: decision.decision,
          rationale: decision.rationale,
          reviewerId: decision.reviewerId,
          createdAt: decision.createdAt,
        })),
      notes: [...notes]
        .toSorted((left, right) =>
          right.createdAt.localeCompare(left.createdAt)
        )
        .map((note) => ({
          id: `${note._id}`,
          body: note.body,
          authorId: note.authorId,
          createdAt: note.createdAt,
        })),
      chatMessages: sortByIsoAsc(chatMessages).map((message) => ({
        id: `${message._id}`,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
        answerSource: message.answerSource,
        modelId: message.modelId,
        citationsJson: message.citationsJson,
        groundingVersion: message.groundingVersion,
      })),
      recordings: sortByIsoAsc(recordings).map((artifact) => ({
        id: `${artifact._id}`,
        egressId: artifact.egressId,
        artifactKey: artifact.artifactKey,
        roomName: artifact.roomName,
        provider: artifact.provider,
        artifactType: artifact.artifactType,
        status: artifact.status,
        filename: artifact.filename,
        location: artifact.location,
        manifestLocation: artifact.manifestLocation,
        startedAt: artifact.startedAt,
        endedAt: artifact.endedAt,
        durationMs: artifact.durationMs,
        sizeBytes: artifact.sizeBytes,
        error: artifact.error,
      })),
    }
  },
})

export const saveAssessmentReport = mutation({
  args: {
    ...saveAssessmentReportFields,
    processingKey: v.optional(v.string()),
  },
  returns: v.id('assessmentReports'),
  handler: async (ctx, args) => {
    const pipelineWrite = hasTrustedProcessingKey(args.processingKey)
    let orgId: string
    if (pipelineWrite) {
      orgId = await resolveOrgIdForPipelineWrite(
        ctx,
        args.sessionId,
        args.processingKey
      )
    } else if (!isConvexDevelopmentMode(convexEnv)) {
      throw new ConvexError(
        'Assessment reports must be written via the processing pipeline in production.'
      )
    } else {
      await requireRecruiterCapability(ctx, 'recruiter:candidates:write')
      orgId = await requireOrgId(ctx)
      await assertOrgOwnsSession(ctx, orgId, args.sessionId)
    }

    if (
      pipelineWrite &&
      !convexEnv.KYMA_PROCESSING_WRITE_KEY?.trim() &&
      !isConvexDevelopmentMode(convexEnv)
    ) {
      throw new Error(
        'KYMA_PROCESSING_WRITE_KEY must be configured outside development.'
      )
    }

    const { processingKey: _processingKey, ...reportArgs } = args

    return await persistAssessmentReport(ctx, orgId, reportArgs, {
      rateLimit: !pipelineWrite,
    })
  },
})

export const submitReviewDecision = candidateWriteMutation({
  args: {
    reportId: v.id('assessmentReports'),
    sessionId: v.id('interviewSessions'),
    decision: reviewDecisionValidator,
    rationale: v.optional(v.string()),
    reviewerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = ctx
    const reviewerId = await getRecruiterActorId(ctx)

    await assertOrgOwnsSession(ctx, orgId, args.sessionId)
    const report = await assertOrgOwnsReport(ctx, orgId, args.reportId)
    assertReportBelongsToSession(report, args.sessionId)

    const decisionId = await ctx.db.insert('reviewDecisions', {
      orgId,
      ...args,
      reviewerId,
      createdAt: new Date().toISOString(),
    })

    await logAuditEvent(ctx, {
      orgId,
      actorId: reviewerId ?? undefined,
      action: 'review_decision.submitted',
      resource: `session:${args.sessionId}`,
      metadata: {
        reportId: args.reportId,
        decision: args.decision,
      },
    })

    const session = await ctx.db.get(args.sessionId)
    const invite = session ? await ctx.db.get(session.inviteId) : null
    if (invite) {
      const releaseMode = await resolveReleaseMode(ctx, invite)
      if (shouldAutoRelease(args.decision, releaseMode)) {
        await releaseReportToCandidate(ctx, {
          reportId: args.reportId,
          actorId: reviewerId ?? undefined,
          orgId,
          sessionId: args.sessionId,
        })
      }
    }

    return decisionId
  },
})

export const releaseReport = candidateWriteMutation({
  args: {
    reportId: v.id('assessmentReports'),
    sessionId: v.id('interviewSessions'),
  },
  handler: async (ctx, args) => {
    const { orgId } = ctx
    const actorId = await getRecruiterActorId(ctx)

    await assertOrgOwnsSession(ctx, orgId, args.sessionId)
    const report = await assertOrgOwnsReport(ctx, orgId, args.reportId)
    assertReportBelongsToSession(report, args.sessionId)

    return await releaseReportToCandidate(ctx, {
      reportId: args.reportId,
      actorId: actorId ?? undefined,
      orgId,
      sessionId: args.sessionId,
    })
  },
})
