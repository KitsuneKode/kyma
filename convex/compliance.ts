import { ConvexError, v } from 'convex/values'

import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server'
import { logAuditEvent } from './helpers/audit'

const DELETE_BATCH = 40
/**
 * Ceiling on rows touched per invocation. Convex mutations are transactions
 * with document read/write limits; an unbounded drain over 40 sessions x 7
 * child tables aborts the whole transaction on real data, rolls back, and
 * makes ZERO progress on every retry. Staying under the limit and
 * rescheduling is what guarantees forward progress.
 */
const ROW_BUDGET_PER_RUN = 2_000

async function collectSubjectSessionIds(
  ctx: QueryCtx | MutationCtx,
  args: {
    orgId: string
    subjectEmail?: string
    subjectUserId?: Id<'users'>
  }
) {
  const sessionIds = new Set<Id<'interviewSessions'>>()

  if (args.subjectUserId) {
    const byUser = await ctx.db
      .query('interviewSessions')
      .withIndex('by_candidate_user', (q) =>
        q.eq('candidateUserId', args.subjectUserId!)
      )
      .take(200)
    for (const session of byUser) {
      if (session.orgId === args.orgId) {
        sessionIds.add(session._id)
      }
    }
  }

  if (args.subjectEmail) {
    const email = args.subjectEmail.trim().toLowerCase()
    const invites = await ctx.db
      .query('candidateInvites')
      .withIndex('by_candidate_email', (q) => q.eq('candidateEmail', email))
      .take(200)
    for (const invite of invites) {
      if (invite.orgId !== args.orgId) {
        continue
      }
      const sessions = await ctx.db
        .query('interviewSessions')
        .withIndex('by_invite', (q) => q.eq('inviteId', invite._id))
        .take(20)
      for (const session of sessions) {
        sessionIds.add(session._id)
      }
    }
  }

  return [...sessionIds]
}

/**
 * Assemble a subject export package (metadata + transcript text — no media bytes).
 * Call from trusted ops tooling via `npx convex run`.
 */
export const exportSubjectData = internalQuery({
  args: {
    orgId: v.string(),
    subjectEmail: v.optional(v.string()),
    subjectUserId: v.optional(v.id('users')),
    requestId: v.string(),
  },
  returns: v.object({
    requestId: v.string(),
    orgId: v.string(),
    exportedAt: v.string(),
    invites: v.array(
      v.object({
        id: v.id('candidateInvites'),
        candidateName: v.optional(v.string()),
        candidateEmail: v.optional(v.string()),
        status: v.string(),
        expiresAt: v.string(),
      })
    ),
    sessions: v.array(
      v.object({
        id: v.id('interviewSessions'),
        state: v.string(),
        startedAt: v.optional(v.string()),
        endedAt: v.optional(v.string()),
        transcript: v.array(
          v.object({
            speaker: v.string(),
            text: v.string(),
            startedAt: v.string(),
            endedAt: v.optional(v.string()),
          })
        ),
      })
    ),
    reports: v.array(
      v.object({
        id: v.id('assessmentReports'),
        status: v.string(),
        summary: v.optional(v.string()),
        recommendation: v.optional(v.string()),
        confidence: v.optional(v.string()),
        generatedAt: v.optional(v.string()),
      })
    ),
  }),
  handler: async (ctx, args) => {
    if (!args.subjectEmail && !args.subjectUserId) {
      throw new ConvexError('Provide subjectEmail and/or subjectUserId.')
    }

    const email = args.subjectEmail?.trim().toLowerCase()
    const invites = email
      ? (
          await ctx.db
            .query('candidateInvites')
            .withIndex('by_candidate_email', (q) =>
              q.eq('candidateEmail', email)
            )
            .take(200)
        ).filter((invite) => invite.orgId === args.orgId)
      : []

    const sessionIds = await collectSubjectSessionIds(ctx, {
      orgId: args.orgId,
      subjectEmail: email,
      subjectUserId: args.subjectUserId,
    })

    const sessions: Array<{
      id: Id<'interviewSessions'>
      state: string
      startedAt?: string
      endedAt?: string
      transcript: Array<{
        speaker: string
        text: string
        startedAt: string
        endedAt?: string
      }>
    }> = []
    const reports: Array<{
      id: Id<'assessmentReports'>
      status: string
      summary?: string
      recommendation?: string
      confidence?: string
      generatedAt?: string
    }> = []

    for (const sessionId of sessionIds) {
      const session = await ctx.db.get(sessionId)
      if (!session || session.orgId !== args.orgId) {
        continue
      }
      const transcript = await ctx.db
        .query('transcriptSegments')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .take(500)
      const report = await ctx.db
        .query('assessmentReports')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .first()
      sessions.push({
        id: session._id,
        state: session.state,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        transcript: transcript.map((segment) => ({
          speaker: segment.speaker,
          text: segment.text,
          startedAt: segment.startedAt,
          endedAt: segment.endedAt,
        })),
      })
      if (report) {
        reports.push({
          id: report._id,
          status: report.status,
          summary: report.summary,
          recommendation: report.overallRecommendation,
          confidence: report.confidence,
          generatedAt: report.generatedAt,
        })
      }
    }

    return {
      requestId: args.requestId,
      orgId: args.orgId,
      exportedAt: new Date().toISOString(),
      invites: invites.map((invite) => ({
        id: invite._id,
        candidateName: invite.candidateName,
        candidateEmail: invite.candidateEmail,
        status: invite.status,
        expiresAt: invite.expiresAt,
      })),
      sessions,
      reports,
    }
  },
})

/**
 * Anonymize/delete subject interview artifacts in batches.
 * Schedules itself when more work remains.
 */
export const deleteSubjectData = internalMutation({
  args: {
    orgId: v.string(),
    subjectEmail: v.optional(v.string()),
    subjectUserId: v.optional(v.id('users')),
    requestId: v.string(),
    actorId: v.optional(v.string()),
    cursor: v.optional(v.number()),
  },
  returns: v.object({
    done: v.boolean(),
    deletedSessions: v.number(),
  }),
  handler: async (ctx, args) => {
    if (!args.subjectEmail && !args.subjectUserId) {
      throw new ConvexError('Provide subjectEmail and/or subjectUserId.')
    }

    const sessionIds = await collectSubjectSessionIds(ctx, {
      orgId: args.orgId,
      subjectEmail: args.subjectEmail,
      subjectUserId: args.subjectUserId,
    })
    // `collectSubjectSessionIds` is recomputed on every continuation and the
    // previous pass already deleted its sessions, so the list shrinks between
    // runs. Offsetting into it with an absolute cursor therefore SKIPPED
    // sessions - and reported `done` while subject data remained. Always take
    // from the head and let the shrinking list terminate the loop.
    const slice = sessionIds.slice(0, DELETE_BATCH)
    let deletedSessions = 0
    let rowsTouched = 0
    let budgetExhausted = false

    for (const sessionId of slice) {
      const session = await ctx.db.get(sessionId)
      if (!session || session.orgId !== args.orgId) {
        continue
      }

      // Drain child rows within the run's remaining budget. `drained` reports
      // whether this session still has rows left, so the session document is
      // only removed once its children are gone - never orphaning them.
      const drainSessionChildRows = async () => {
        while (rowsTouched < ROW_BUDGET_PER_RUN) {
          const [
            transcript,
            events,
            evidence,
            notes,
            chat,
            decisions,
            recordings,
            observations,
          ] = await Promise.all([
            ctx.db
              .query('transcriptSegments')
              .withIndex('by_session', (q) => q.eq('sessionId', session._id))
              .take(DELETE_BATCH),
            ctx.db
              .query('sessionEvents')
              .withIndex('by_session', (q) => q.eq('sessionId', session._id))
              .take(DELETE_BATCH),
            ctx.db
              .query('dimensionEvidence')
              .withIndex('by_session', (q) => q.eq('sessionId', session._id))
              .take(DELETE_BATCH),
            ctx.db
              .query('recruiterNotes')
              .withIndex('by_session_and_created_at', (q) =>
                q.eq('sessionId', session._id)
              )
              .take(DELETE_BATCH),
            ctx.db
              .query('reportChatMessages')
              .withIndex('by_session_and_created_at', (q) =>
                q.eq('sessionId', session._id)
              )
              .take(DELETE_BATCH),
            ctx.db
              .query('reviewDecisions')
              .withIndex('by_session_and_created_at', (q) =>
                q.eq('sessionId', session._id)
              )
              .take(DELETE_BATCH),
            ctx.db
              .query('recordingArtifacts')
              .withIndex('by_session', (q) => q.eq('sessionId', session._id))
              .take(DELETE_BATCH),
            // Agent-written observations describe the candidate's appearance
            // and behaviour. Omitting this table left PII behind after a DSR
            // reported completion.
            ctx.db
              .query('visualObservations')
              .withIndex('by_session', (q) => q.eq('sessionId', session._id))
              .take(DELETE_BATCH),
          ])

          const batch = [
            ...transcript,
            ...events,
            ...evidence,
            ...notes,
            ...chat,
            ...decisions,
            ...recordings,
            ...observations,
          ]

          if (batch.length === 0) {
            return true
          }

          for (const row of batch) {
            await ctx.db.delete(row._id)
            rowsTouched += 1
          }
        }

        return false
      }

      const childRowsDrained = await drainSessionChildRows()
      if (!childRowsDrained) {
        // Budget exhausted mid-session: stop here and continue next run. The
        // session row stays so its remaining children are still reachable.
        budgetExhausted = true
        break
      }

      const report = await ctx.db
        .query('assessmentReports')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .first()

      if (report) {
        await ctx.db.delete(report._id)
        rowsTouched += 1
      }

      await ctx.db.delete(session._id)
      deletedSessions += 1
    }

    if (budgetExhausted || sessionIds.length > slice.length) {
      await ctx.scheduler.runAfter(0, internal.compliance.deleteSubjectData, {
        ...args,
        cursor: 0,
      })
      return { done: false, deletedSessions }
    }

    if (args.subjectEmail) {
      const email = args.subjectEmail.trim().toLowerCase()
      const invites = await ctx.db
        .query('candidateInvites')
        .withIndex('by_candidate_email', (q) => q.eq('candidateEmail', email))
        .take(200)
      for (const invite of invites) {
        if (invite.orgId !== args.orgId) {
          continue
        }
        await ctx.db.patch(invite._id, {
          candidateName: 'redacted',
          candidateEmail: `redacted+${invite._id}@invalid.local`,
          inviteToken: `redacted-${invite._id}-${crypto.randomUUID()}`,
          emailLastError: undefined,
          emailProviderMessageId: undefined,
        })
        if (invite.eligibilityId) {
          const eligibility = await ctx.db.get(invite.eligibilityId)
          if (eligibility && eligibility.orgId === args.orgId) {
            await ctx.db.patch(eligibility._id, {
              candidateName: 'redacted',
              candidateEmail: `redacted+${eligibility._id}@invalid.local`,
            })
          }
        }
      }
    }

    await logAuditEvent(ctx, {
      orgId: args.orgId,
      actorId: args.actorId,
      action: 'data_subject.delete.completed',
      resource: `dsr:${args.requestId}`,
      metadata: {
        requestId: args.requestId,
        deletedSessionCount: sessionIds.length,
        hadEmail: Boolean(args.subjectEmail),
        hadUserId: Boolean(args.subjectUserId),
      },
    })

    return { done: true, deletedSessions }
  },
})
