import { ConvexError, v } from 'convex/values'

import { internalMutation, mutation } from '../_generated/server'
import { upsertTranscriptSegmentForSession } from '../helpers/transcriptSegments'
import { requireInviteSessionWriteAccess } from '../helpers/interviewSession'

export const upsertTranscriptSegment = mutation({
  args: {
    inviteToken: v.string(),
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
  handler: async (ctx, args) => {
    await requireInviteSessionWriteAccess(ctx, args.sessionId, args.inviteToken)

    throw new ConvexError(
      'Transcript persistence is owned by the interview agent.'
    )
  },
})

export const upsertTranscriptSegmentInternal = internalMutation({
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
  handler: async (ctx, args) => {
    return await upsertTranscriptSegmentForSession(ctx, args)
  },
})
