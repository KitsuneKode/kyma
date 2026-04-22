import { v } from 'convex/values'

import type { Id } from './_generated/dataModel'
import { mutation, query, type QueryCtx } from './_generated/server'
import { getRecruiterActorId, requireRecruiterIdentity } from './helpers/auth'
import { logAuditEvent } from './helpers/audit'
import { resolveInterviewPolicyFromInvite } from './helpers/interviewPolicy'
import { runtimeEnv } from '../lib/env/runtime'

const recommendationValidator = v.union(
  v.literal('strong_yes'),
  v.literal('yes'),
  v.literal('mixed'),
  v.literal('no')
)

const confidenceValidator = v.union(
  v.literal('high'),
  v.literal('medium'),
  v.literal('low')
)

const rubricDimensionValidator = v.union(
  v.literal('clarity'),
  v.literal('simplification'),
  v.literal('patience'),
  v.literal('warmth'),
  v.literal('listening'),
  v.literal('fluency'),
  v.literal('adaptability'),
  v.literal('engagement'),
  v.literal('accuracy')
)

const reviewDecisionValidator = v.union(
  v.literal('advance'),
  v.literal('reject'),
  v.literal('manual_review'),
  v.literal('hold')
)

const interviewPolicySnapshotValidator = v.object({
  targetDurationMinutes: v.number(),
  allowsResume: v.boolean(),
  maxAttempts: v.number(),
  rubricVersion: v.string(),
  templateId: v.string(),
  templateName: v.optional(v.string()),
  interviewStyleMode: v.optional(
    v.union(v.literal('standard'), v.literal('intensive'))
  ),
})

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function sortByIsoAsc<T extends { createdAt?: string; startedAt?: string }>(
  items: T[]
) {
  return [...items].toSorted((left, right) =>
    (left.createdAt ?? left.startedAt ?? '').localeCompare(
      right.createdAt ?? right.startedAt ?? ''
    )
  )
}

async function getLatestReviewDecision(
  ctx: QueryCtx,
  sessionId: Id<'interviewSessions'>
) {
  const decisions = await ctx.db
    .query('reviewDecisions')
    .withIndex('by_session_and_created_at', (q) => q.eq('sessionId', sessionId))
    .collect()

  return decisions.toSorted((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  )[0]
}

export const listReviewCandidates = query({
  args: {},
  handler: async (ctx) => {
    await requireRecruiterIdentity(ctx)

    const sessions = await ctx.db.query('interviewSessions').collect()
    const sortedSessions = [...sessions].toSorted((left, right) =>
      (right.startedAt ?? '').localeCompare(left.startedAt ?? '')
    )

    return await Promise.all(
      sortedSessions.map(async (session) => {
        const [invite, report, latestDecision] = await Promise.all([
          ctx.db.get(session.inviteId),
          ctx.db
            .query('assessmentReports')
            .withIndex('by_session', (q) => q.eq('sessionId', session._id))
            .first(),
          getLatestReviewDecision(ctx, session._id),
        ])

        const template = invite ? await ctx.db.get(invite.templateId) : null

        return {
          sessionId: session._id,
          inviteToken: invite?.inviteToken,
          candidateName: invite?.candidateName ?? 'Candidate',
          candidateEmail: invite?.candidateEmail,
          templateName: template?.name ?? 'AI Tutor Screener',
          inviteStatus: invite?.status ?? 'created',
          sessionState: session.state,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          reportStatus: report?.status ?? 'pending',
          recommendation: report?.overallRecommendation,
          confidence: report?.confidence,
          weightedScore: report?.weightedScore,
          hardGateTriggered: report?.hardGateTriggered ?? false,
          topStrengths: report?.topStrengths ?? [],
          topConcerns: report?.topConcerns ?? [],
          latestDecision: latestDecision?.decision,
          latestDecisionAt: latestDecision?.createdAt,
        }
      })
    )
  },
})

export const getSessionProcessingDetail = query({
  args: {
    sessionId: v.id('interviewSessions'),
  },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId)

    if (!session) {
      return null
    }

    const invite = await ctx.db.get(session.inviteId)

    if (!invite) {
      return null
    }

    const template = await ctx.db.get(invite.templateId)
    const { snapshot: policySnapshot } = await resolveInterviewPolicyFromInvite(
      ctx,
      invite
    )
    const report = await ctx.db
      .query('assessmentReports')
      .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
      .first()

    const [transcript, events] = await Promise.all([
      ctx.db
        .query('transcriptSegments')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .collect(),
      ctx.db
        .query('sessionEvents')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .collect(),
    ])

    return {
      sessionId: session._id,
      candidate: {
        name: invite.candidateName ?? 'Candidate',
      },
      template: {
        name: template?.name ?? 'AI Tutor Screener',
      },
      policySnapshot,
      report: report
        ? {
            id: report._id,
            status: report.status,
          }
        : null,
      transcript: sortByIsoAsc(transcript).map((segment) => ({
        speaker: segment.speaker,
        text: segment.text,
        status: segment.status,
        startedAt: segment.startedAt,
        endedAt: segment.endedAt,
      })),
      events: sortByIsoAsc(events).map((event) => ({
        type: event.type,
        detail: event.detail,
        createdAt: event.createdAt,
      })),
    }
  },
})

export const getCandidateReviewDetail = query({
  args: {
    sessionId: v.id('interviewSessions'),
  },
  handler: async (ctx, { sessionId }) => {
    await requireRecruiterIdentity(ctx)

    const session = await ctx.db.get(sessionId)

    if (!session) {
      return null
    }

    const invite = await ctx.db.get(session.inviteId)
    const template = invite ? await ctx.db.get(invite.templateId) : null
    const report = await ctx.db
      .query('assessmentReports')
      .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
      .first()

    const [
      transcript,
      events,
      evidence,
      decisions,
      recordings,
      notes,
      chatMessages,
    ] = await Promise.all([
      ctx.db
        .query('transcriptSegments')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .collect(),
      ctx.db
        .query('sessionEvents')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .collect(),
      report
        ? ctx.db
            .query('dimensionEvidence')
            .withIndex('by_report', (q) => q.eq('reportId', report._id))
            .collect()
        : [],
      ctx.db
        .query('reviewDecisions')
        .withIndex('by_session_and_created_at', (q) =>
          q.eq('sessionId', sessionId)
        )
        .collect(),
      ctx.db
        .query('recordingArtifacts')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .collect(),
      ctx.db
        .query('recruiterNotes')
        .withIndex('by_session_and_created_at', (q) =>
          q.eq('sessionId', sessionId)
        )
        .collect(),
      ctx.db
        .query('reportChatMessages')
        .withIndex('by_session_and_created_at', (q) =>
          q.eq('sessionId', sessionId)
        )
        .collect(),
    ])

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
        name: template?.name ?? 'AI Tutor Screener',
        role: template?.role ?? 'teacher',
        rubricVersion: template?.rubricVersion ?? 'v1',
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
            topStrengths: report.topStrengths ?? [],
            topConcerns: report.topConcerns ?? [],
            transcriptQualityNote: report.transcriptQualityNote,
            generatedAt: report.generatedAt,
            dimensionScores: report.dimensionScores ?? [],
            policySnapshot: report.policySnapshot,
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
      transcript: sortByIsoAsc(transcript).map((segment) => ({
        id: `${segment._id}`,
        speaker: segment.speaker,
        text: segment.text,
        status: segment.status,
        startedAt: segment.startedAt,
        endedAt: segment.endedAt,
      })),
      events: sortByIsoAsc(events).map((event) => ({
        id: `${event._id}`,
        type: event.type,
        detail: event.detail,
        createdAt: event.createdAt,
      })),
      evidence: sortByIsoAsc(evidence).map((item) => ({
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
    sessionId: v.id('interviewSessions'),
    processingKey: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('manual_review')
    ),
    overallRecommendation: v.optional(recommendationValidator),
    confidence: v.optional(confidenceValidator),
    summary: v.optional(v.string()),
    weightedScore: v.optional(v.number()),
    hardGateTriggered: v.optional(v.boolean()),
    topStrengths: v.optional(v.array(v.string())),
    topConcerns: v.optional(v.array(v.string())),
    transcriptQualityNote: v.optional(v.string()),
    dimensionScores: v.optional(
      v.array(
        v.object({
          dimension: rubricDimensionValidator,
          score: v.number(),
          rationale: v.string(),
        })
      )
    ),
    evidence: v.optional(
      v.array(
        v.object({
          dimension: rubricDimensionValidator,
          snippet: v.string(),
          rationale: v.string(),
          startedAt: v.optional(v.string()),
          endedAt: v.optional(v.string()),
        })
      )
    ),
    policySnapshot: v.optional(interviewPolicySnapshotValidator),
  },
  handler: async (ctx, args) => {
    const configuredProcessingKey =
      runtimeEnv.KYMA_PROCESSING_WRITE_KEY?.trim() || undefined

    if (configuredProcessingKey) {
      if (args.processingKey?.trim() !== configuredProcessingKey) {
        await requireRecruiterIdentity(ctx)
      }
    }

    const now = new Date().toISOString()
    const existingReport = await ctx.db
      .query('assessmentReports')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .first()

    const reportFields = {
      sessionId: args.sessionId,
      status: args.status,
      overallRecommendation: args.overallRecommendation,
      confidence: args.confidence,
      summary: args.summary,
      weightedScore: args.weightedScore,
      hardGateTriggered: args.hardGateTriggered,
      topStrengths: args.topStrengths,
      topConcerns: args.topConcerns,
      transcriptQualityNote: args.transcriptQualityNote,
      dimensionScores: args.dimensionScores,
      generatedAt: now,
      ...(args.policySnapshot ? { policySnapshot: args.policySnapshot } : {}),
    }

    const reportId = existingReport
      ? (await ctx.db.patch(existingReport._id, reportFields),
        existingReport._id)
      : await ctx.db.insert('assessmentReports', reportFields)

    if (args.evidence) {
      const existingEvidence = await ctx.db
        .query('dimensionEvidence')
        .withIndex('by_report', (q) => q.eq('reportId', reportId))
        .collect()

      await Promise.all(existingEvidence.map((item) => ctx.db.delete(item._id)))

      await Promise.all(
        args.evidence.map((item) =>
          ctx.db.insert('dimensionEvidence', {
            reportId,
            sessionId: args.sessionId,
            dimension: item.dimension,
            snippet: item.snippet,
            rationale: item.rationale,
            startedAt: item.startedAt,
            endedAt: item.endedAt,
            createdAt: now,
          })
        )
      )
    }

    return reportId
  },
})

export const submitReviewDecision = mutation({
  args: {
    reportId: v.id('assessmentReports'),
    sessionId: v.id('interviewSessions'),
    decision: reviewDecisionValidator,
    rationale: v.optional(v.string()),
    reviewerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRecruiterIdentity(ctx)
    const reviewerId = await getRecruiterActorId(ctx)

    const decisionId = await ctx.db.insert('reviewDecisions', {
      ...args,
      reviewerId,
      createdAt: new Date().toISOString(),
    })

    await logAuditEvent(ctx, {
      actorId: reviewerId ?? undefined,
      action: 'review_decision.submitted',
      resource: `session:${args.sessionId}`,
      metadata: {
        reportId: args.reportId,
        decision: args.decision,
      },
    })

    return decisionId
  },
})
