import { fetchMutation } from 'convex/nextjs'
import { NextRequest, NextResponse } from 'next/server'

import { api } from '@/convex/_generated/api'
import {
  createDiagnosticLogger,
  createRequestId,
} from '@/lib/interview/diagnostics'
import { rateLimitAllow } from '@/lib/http/rate-limit'
import { createParticipantToken } from '@/lib/livekit/token'
import { bootstrapBodySchema } from '@/lib/validation/interview-api'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  const requestId = createRequestId('bootstrap')
  const logger = createDiagnosticLogger('bootstrap-route', {
    actor: 'server',
    requestId,
  })
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  if (!rateLimitAllow(['bootstrap', clientIp], 40, 60_000)) {
    return NextResponse.json(
      { error: 'Too many bootstrap attempts. Please try again shortly.' },
      { status: 429 }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = bootstrapBodySchema.safeParse(body)

  if (!parsed.success) {
    logger.warn({
      event: 'bootstrap.invalid',
      detail: 'Interview bootstrap validation failed.',
      meta: {
        issues: parsed.error?.issues ?? [],
      },
    })
    return NextResponse.json(
      { error: 'Invalid interview bootstrap request.' },
      { status: 400 }
    )
  }

  const { inviteToken, participantName } = parsed.data
  logger.info({
    event: 'bootstrap.started',
    detail: 'Bootstrapping interview session.',
    inviteToken,
    participantIdentity: participantName,
  })

  try {
    const session = await fetchMutation(api.interviews.bootstrapPublicSession, {
      inviteToken,
      participantName,
    })
    logger.info({
      event: 'bootstrap.session.created',
      detail: 'Convex session bootstrap completed.',
      inviteToken,
      sessionId: `${session.sessionId}`,
      roomName: session.roomName,
      participantIdentity: participantName,
    })

    const token = await createParticipantToken({
      roomName: session.roomName,
      participantName,
      participantIdentity: `candidate-${session.sessionId}`,
      metadata: JSON.stringify({
        inviteToken,
        sessionId: session.sessionId,
        role: 'candidate',
      }),
      agentMetadata: JSON.stringify({
        inviteToken,
        sessionId: session.sessionId,
        participantName,
      }),
      requestId,
    })
    logger.info({
      event: 'bootstrap.token.issued',
      detail: 'LiveKit token issued for candidate join.',
      inviteToken,
      sessionId: `${session.sessionId}`,
      roomName: session.roomName,
      participantIdentity: participantName,
    })

    return NextResponse.json({
      ...session,
      ...token,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to bootstrap interview.'
    const status =
      message === 'This interview link has expired.'
        ? 410
        : message === 'This interview has already been submitted.'
          ? 409
          : 500
    logger.error({
      event: 'bootstrap.failed',
      detail: message,
      inviteToken,
      participantIdentity: participantName,
      error,
    })

    return NextResponse.json({ error: message }, { status })
  }
}
