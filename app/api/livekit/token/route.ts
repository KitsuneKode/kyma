import { fetchAction, fetchMutation, fetchQuery } from 'convex/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { api } from '@/convex/_generated/api'
import {
  createDiagnosticLogger,
  createRequestId,
} from '@/lib/interview/diagnostics'
import { createParticipantToken } from '@/lib/livekit/token'

const tokenRequestSchema = z.object({
  inviteToken: z.string().min(1),
  participantName: z.string().min(1),
  canPublish: z.boolean().optional().default(true),
  canSubscribe: z.boolean().optional().default(true),
})

export async function POST(request: NextRequest) {
  const requestId = createRequestId('token')
  const logger = createDiagnosticLogger('livekit-token-route', {
    actor: 'server',
    requestId,
  })
  const body = await request.json().catch(() => null)
  const parsed = tokenRequestSchema.safeParse(body)

  if (!parsed.success) {
    logger.warn({
      event: 'token.invalid',
      detail: 'LiveKit token validation failed.',
      meta: {
        issues: parsed.error.flatten(),
      },
    })
    return NextResponse.json(
      { error: 'Invalid token request.' },
      { status: 400 }
    )
  }
  const { inviteToken, participantName, canPublish, canSubscribe } = parsed.data
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  try {
    await fetchAction(api.rateLimiter.checkLimit, {
      name: 'livekitToken',
      key: `livekit-token:${clientIp}:${inviteToken}`,
    })
  } catch {
    return NextResponse.json(
      { error: 'Too many token requests.' },
      { status: 429 }
    )
  }

  const snapshot = await fetchQuery(api.interviews.getPublicSessionDetail, {
    inviteToken,
  }).catch(() => null)

  if (!snapshot || snapshot.accessState !== 'available') {
    return NextResponse.json(
      { error: 'Invite is invalid, expired, or already consumed.' },
      { status: 403 }
    )
  }
  if (
    snapshot.candidateName &&
    snapshot.candidateName !== 'Candidate' &&
    snapshot.candidateName !== participantName
  ) {
    return NextResponse.json(
      { error: 'Invite participant identity does not match this session.' },
      { status: 403 }
    )
  }

  let roomName = snapshot.roomName
  let sessionId = snapshot.sessionId ? `${snapshot.sessionId}` : undefined
  if (!roomName || !sessionId) {
    const bootstrapped = await fetchMutation(
      api.interviews.bootstrapPublicSession,
      {
        inviteToken,
        participantName,
      }
    ).catch(() => null)
    if (!bootstrapped) {
      return NextResponse.json(
        { error: 'Unable to initialize interview.' },
        { status: 403 }
      )
    }
    roomName = bootstrapped.roomName
    sessionId = `${bootstrapped.sessionId}`
  }

  logger.info({
    event: 'token.started',
    detail: 'Creating direct LiveKit token.',
    roomName,
    participantIdentity: participantName,
    meta: {
      canPublish,
      canSubscribe,
    },
  })

  try {
    const response = await createParticipantToken({
      roomName,
      participantName,
      participantIdentity: `candidate-${sessionId}`,
      canPublish,
      canSubscribe,
      metadata: JSON.stringify({
        inviteToken,
        sessionId,
        role: 'candidate',
      }),
      requestId,
    })
    logger.info({
      event: 'token.issued',
      detail: 'Direct LiveKit token issued.',
      roomName,
      participantIdentity: participantName,
    })

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create LiveKit token.'
    logger.error({
      event: 'token.failed',
      detail: message,
      roomName,
      participantIdentity: participantName,
      error,
    })

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
