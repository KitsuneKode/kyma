import { ConvexError } from 'convex/values'

import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

const WRITE_WINDOW_MS = 60_000
const MAX_TRANSCRIPT_WRITES_PER_WINDOW = 120

export type TranscriptSegmentWriteArgs = {
  sessionId: Id<'interviewSessions'>
  segmentId: string
  speaker: 'agent' | 'candidate' | 'system'
  text: string
  status: 'partial' | 'final'
  startedAt: string
  endedAt?: string
}

function resolveTranscriptLookupKey(args: {
  segmentId: string
  speaker: 'agent' | 'candidate' | 'system'
  startedAt: string
}) {
  const normalizedSegmentId = args.segmentId.trim()

  if (normalizedSegmentId) {
    return normalizedSegmentId
  }

  return `${args.speaker}:${args.startedAt}`
}

async function assertTranscriptWriteThrottle(
  ctx: MutationCtx,
  sessionId: Id<'interviewSessions'>
) {
  const since = new Date(Date.now() - WRITE_WINDOW_MS).toISOString()
  const recent = await ctx.db
    .query('transcriptSegments')
    .withIndex('by_session_and_started_at', (q) =>
      q.eq('sessionId', sessionId).gte('startedAt', since)
    )
    .take(MAX_TRANSCRIPT_WRITES_PER_WINDOW + 1)

  if (recent.length > MAX_TRANSCRIPT_WRITES_PER_WINDOW) {
    throw new ConvexError(
      'Transcript update rate exceeded. Please wait a moment and try again.'
    )
  }
}

export async function upsertTranscriptSegmentForSession(
  ctx: MutationCtx,
  args: TranscriptSegmentWriteArgs
): Promise<Id<'transcriptSegments'>> {
  await assertTranscriptWriteThrottle(ctx, args.sessionId)

  const sourceSegmentId = resolveTranscriptLookupKey(args)
  const indexedMatch = await ctx.db
    .query('transcriptSegments')
    .withIndex('by_session_and_source_segment_id', (q) =>
      q.eq('sessionId', args.sessionId).eq('sourceSegmentId', sourceSegmentId)
    )
    .first()

  // A partial written before its source id stabilised is found by exact start
  // time. The previous fallback `.collect()`ed the whole session transcript on
  // every miss, which made each new segment O(n) and the session O(n^2) - and
  // it ran on the live write path for every STT partial.
  const match =
    indexedMatch ??
    (
      await ctx.db
        .query('transcriptSegments')
        .withIndex('by_session_and_started_at', (q) =>
          q.eq('sessionId', args.sessionId).eq('startedAt', args.startedAt)
        )
        .take(8)
    ).find(
      (segment) =>
        segment.speaker === args.speaker && segment.status === 'partial'
    )

  if (match) {
    await ctx.db.patch(match._id, {
      sourceSegmentId,
      text: args.text,
      status: args.status,
      endedAt: args.endedAt,
    })
    return match._id
  }

  return await ctx.db.insert('transcriptSegments', {
    sessionId: args.sessionId,
    sourceSegmentId,
    speaker: args.speaker,
    text: args.text,
    status: args.status,
    startedAt: args.startedAt,
    endedAt: args.endedAt,
  })
}
