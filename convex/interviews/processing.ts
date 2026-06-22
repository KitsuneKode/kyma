import { ConvexError, v } from 'convex/values'

import { mutation } from '../_generated/server'
import { finalizeInterviewForProcessing } from '../helpers/finalizeInterviewProcessing'
import { requireInviteSessionWriteAccess } from '../helpers/interviewSession'

export const submitInterviewForProcessing = mutation({
  args: {
    inviteToken: v.string(),
    sessionId: v.id('interviewSessions'),
    detail: v.optional(v.string()),
  },
  returns: v.object({
    queued: v.boolean(),
    transitioned: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { session } = await requireInviteSessionWriteAccess(
      ctx,
      args.sessionId,
      args.inviteToken
    )

    if (['processing', 'completed', 'failed'].includes(session.state)) {
      return { queued: true, transitioned: false }
    }

    const result = await finalizeInterviewForProcessing(ctx, session, {
      detail:
        args.detail ??
        'Candidate submitted the interview for post-call processing.',
      source: 'candidate-client',
      dedupeKey: `candidate-submit:${session._id}`,
      allowedStates: ['live', 'reconnecting', 'interrupted', 'connecting'],
    })

    if (!result.transitioned && !result.queued) {
      throw new ConvexError(
        'Interview cannot be submitted from its current state.'
      )
    }

    return result
  },
})
