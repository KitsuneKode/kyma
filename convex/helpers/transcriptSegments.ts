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
  const segments = await ctx.db
    .query('transcriptSegments')
    .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
    .collect()
  const recent = segments.filter((segment) => segment.startedAt >= since)

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
  const match =
    indexedMatch ??
    (
      await ctx.db
        .query('transcriptSegments')
        .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
        .collect()
    ).find(
      (segment) =>
        segment.sourceSegmentId === sourceSegmentId ||
        (segment.startedAt === args.startedAt &&
          segment.speaker === args.speaker &&
          segment.status === 'partial')
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
