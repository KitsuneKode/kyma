import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { NextRequest, NextResponse } from 'next/server'

import { api } from '@/convex/_generated/api'
import {
  createDiagnosticLogger,
  createRequestId,
  redactInviteToken,
} from '@/lib/interview/diagnostics'
import { assertServerRateLimit } from '@/lib/http/server-rate-limit'
import {
  createParticipantToken,
  computeLivekitTokenTtlMinutes,
} from '@/lib/livekit/token'
import { validateProviderKeysForBootstrap } from '@/lib/agent/validate-provider-keys'
import { bootstrapBodySchema } from '@/lib/validation/interview-api'
import { serverEnv } from '@/lib/env/server'
import { reportError } from '@/lib/ops/error-reporting'

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
  const inviteTokenForLog = redactInviteToken(inviteToken)

  try {
    await assertServerRateLimit('publicSnapshot', `bootstrap:${clientIp}`)
    // Token mint is the expensive/abuse-sensitive step; budget is tighter than snapshot.
    await assertServerRateLimit(
      'livekitToken',
      `livekit:${clientIp}:${inviteToken}`
    )

    logger.info({
      event: 'bootstrap.started',
      detail: 'Bootstrapping interview session.',
      inviteToken: inviteTokenForLog,
      participantIdentity: participantName,
    })

    const session = await fetchMutation(
      api.interviews.bootstrap.bootstrapPublicSession,
      {
        inviteToken,
        participantName,
      }
    )

    const byokSummary = await fetchQuery(
      api.interviews.bootstrap.getInviteBootstrapByokSummary,
      { inviteToken }
    )
    if (byokSummary.providerKeys.length > 0) {
      const validation = validateProviderKeysForBootstrap(
        byokSummary.providerKeys,
        {
          encryptionKeyConfigured: Boolean(
            serverEnv.KYMA_ENCRYPTION_KEY?.trim()
          ),
        }
      )
      if (!validation.ok) {
        logger.warn({
          event: 'bootstrap.byok.invalid',
          detail: validation.issues.join(' '),
          inviteToken: inviteTokenForLog,
          meta: { issues: validation.issues },
        })
        return NextResponse.json(
          {
            error:
              'Workspace provider keys are misconfigured for interview bootstrap.',
          },
          { status: 503 }
        )
      }
    }

    logger.info({
      event: 'bootstrap.session.created',
      detail: 'Convex session bootstrap completed.',
      inviteToken: inviteTokenForLog,
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
      tokenTtlMinutes: computeLivekitTokenTtlMinutes(
        session.targetDurationMinutes
      ),
      requestId,
    })
    logger.info({
      event: 'bootstrap.token.issued',
      detail: 'LiveKit token issued for candidate join.',
      inviteToken: inviteTokenForLog,
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
      message === 'RATE_LIMITED' || message.includes('monthly interview limit')
        ? 429
        : message === 'This interview link has expired.'
          ? 410
          : message === 'This interview has already been submitted.'
            ? 409
            : 500
    logger.error({
      event: 'bootstrap.failed',
      detail: message,
      inviteToken: inviteTokenForLog,
      participantIdentity: participantName,
      error,
    })

    if (status >= 500) {
      await reportError(error, {
        route: '/api/interviews/bootstrap',
        requestId,
        tags: { surface: 'interview-bootstrap' },
        extra: { status },
      })
    }

    return NextResponse.json({ error: message }, { status })
  }
}
