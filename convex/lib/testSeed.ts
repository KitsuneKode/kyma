import { type TestConvex } from 'convex-test'

import type schema from '../schema'
import type { Id } from '../_generated/dataModel'
import type { InterviewSessionState } from '../../lib/interview/types'

type TestHarness = TestConvex<typeof schema>

type InviteStatus =
  | 'created'
  | 'opened'
  | 'in_progress'
  | 'completed'
  | 'expired'

export type SeedOptions = {
  orgId?: string
  roomName?: string
  inviteToken?: string
  sessionState?: InterviewSessionState
  inviteStatus?: InviteStatus
  startedAt?: string
  lastLiveStartedAt?: string
  endedAt?: string
}

export type SeededInterview = {
  orgId: string
  templateId: Id<'assessmentTemplates'>
  inviteId: Id<'candidateInvites'>
  sessionId: Id<'interviewSessions'>
  inviteToken: string
  roomName: string
}

/**
 * Seeds the minimal template -> invite -> session chain that every interview
 * lifecycle test needs, so individual tests only specify the fields they assert
 * on. Shared here to keep the webhook-transition and reaper suites from drifting
 * on required-field bookkeeping.
 */
export async function seedInterview(
  t: TestHarness,
  options: SeedOptions = {}
): Promise<SeededInterview> {
  const orgId = options.orgId ?? 'org_test'
  const roomName = options.roomName ?? 'room-test'
  const inviteToken = options.inviteToken ?? `invite-${roomName}`

  return await t.run(async (ctx) => {
    const templateId = await ctx.db.insert('assessmentTemplates', {
      orgId,
      name: 'AI Tutor Screener',
      role: 'tutor',
      status: 'active',
      createdBy: 'seed',
      rubricVersion: 'v1',
    })

    const inviteId = await ctx.db.insert('candidateInvites', {
      orgId,
      inviteToken,
      templateId,
      status: options.inviteStatus ?? 'in_progress',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    const sessionId = await ctx.db.insert('interviewSessions', {
      orgId,
      inviteId,
      state: options.sessionState ?? 'live',
      provider: 'livekit',
      roomName,
      startedAt: options.startedAt,
      lastLiveStartedAt: options.lastLiveStartedAt,
      endedAt: options.endedAt,
    })

    return { orgId, templateId, inviteId, sessionId, inviteToken, roomName }
  })
}
