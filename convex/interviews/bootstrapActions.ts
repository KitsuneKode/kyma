'use node'

import { ConvexError, v } from 'convex/values'

import { api, internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import { action } from '../_generated/server'
import { validateProviderKeysForBootstrap } from '../../lib/agent/validate-provider-keys'
import { convexEnv } from '../../lib/env/convex'
import {
  createDiagnosticLogger,
  createRequestId,
  redactInviteToken,
} from '../../lib/interview/diagnostics'
import {
  computeLivekitTokenTtlMinutes,
  createParticipantTokenWithEnv,
} from '../../lib/livekit/create-participant-token'
import { rateLimiter } from '../rateLimiter'

const bootstrapResultValidator = v.object({
  inviteId: v.id('candidateInvites'),
  sessionId: v.id('interviewSessions'),
  roomName: v.string(),
  templateName: v.string(),
  token: v.string(),
  participantName: v.string(),
  wsUrl: v.string(),
})

function livekitEnvFromConvex() {
  return {
    NEXT_PUBLIC_LIVEKIT_URL: convexEnv.NEXT_PUBLIC_LIVEKIT_URL,
    LIVEKIT_API_KEY: convexEnv.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: convexEnv.LIVEKIT_API_SECRET,
    LIVEKIT_AGENT_NAME: convexEnv.LIVEKIT_AGENT_NAME,
  }
}

/**
 * Public interview bootstrap: Convex session + LiveKit participant token.
 * Replaces the former Next.js `/api/interviews/bootstrap` route.
 */
type BootstrapInterviewSessionResult = {
  inviteId: Id<'candidateInvites'>
  sessionId: Id<'interviewSessions'>
  roomName: string
  templateName: string
  token: string
  participantName: string
  wsUrl: string
}

export const bootstrapInterviewSession = action({
  args: {
    inviteToken: v.string(),
    participantName: v.string(),
  },
  returns: bootstrapResultValidator,
  handler: async (ctx, args): Promise<BootstrapInterviewSessionResult> => {
    const inviteToken = args.inviteToken.trim()
    const participantName = args.participantName.trim()
    if (!inviteToken) {
      throw new ConvexError('Invalid interview bootstrap request.')
    }
    if (participantName.length < 2) {
      throw new ConvexError('Invalid interview bootstrap request.')
    }

    const requestId = createRequestId('bootstrap')
    const inviteTokenForLog = redactInviteToken(inviteToken)
    const logger = createDiagnosticLogger('bootstrap-action', {
      actor: 'convex',
      requestId,
    })

    try {
      await rateLimiter.limit(ctx, 'publicSnapshot', {
        key: `bootstrap:${inviteToken}`,
        throws: true,
      })

      logger.info({
        event: 'bootstrap.started',
        detail: 'Bootstrapping interview session.',
        inviteToken: inviteTokenForLog,
        participantIdentity: participantName,
      })

      const session: {
        inviteId: Id<'candidateInvites'>
        sessionId: Id<'interviewSessions'>
        roomName: string
        templateName: string
        targetDurationMinutes: number
      } = await ctx.runMutation(
        api.interviews.bootstrap.bootstrapPublicSession,
        {
          inviteToken,
          participantName,
        }
      )

      const byokSummary = await ctx.runQuery(
        api.interviews.bootstrap.getInviteBootstrapByokSummary,
        { inviteToken }
      )
      if (byokSummary.providerKeys.length > 0) {
        const validation = validateProviderKeysForBootstrap(
          byokSummary.providerKeys,
          {
            encryptionKeyConfigured: Boolean(
              convexEnv.KYMA_ENCRYPTION_KEY?.trim()
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
          throw new ConvexError(
            'Workspace provider keys are misconfigured for interview bootstrap.'
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

      const token = await createParticipantTokenWithEnv(
        livekitEnvFromConvex(),
        {
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
        },
        logger
      )

      logger.info({
        event: 'bootstrap.token.issued',
        detail: 'LiveKit token issued for candidate join.',
        inviteToken: inviteTokenForLog,
        sessionId: `${session.sessionId}`,
        roomName: session.roomName,
        participantIdentity: participantName,
      })

      return {
        inviteId: session.inviteId,
        sessionId: session.sessionId,
        roomName: session.roomName,
        templateName: session.templateName,
        token: token.token,
        participantName: token.participantName,
        wsUrl: token.wsUrl,
      }
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? String(error.data ?? error.message)
          : error instanceof Error
            ? error.message
            : 'Failed to bootstrap interview.'
      logger.error({
        event: 'bootstrap.failed',
        detail: message,
        inviteToken: inviteTokenForLog,
        participantIdentity: participantName,
        error,
      })
      throw error instanceof ConvexError ? error : new ConvexError(message)
    }
  },
})

/**
 * Ops recovery: re-enqueue processing for a session already in `processing`.
 * Replaces the former Next.js `/api/interviews/process` route.
 */
type RequeueInterviewProcessingResult = {
  ok: true
  queued: boolean
  fallback: boolean
}

export const requeueInterviewProcessing = action({
  args: {
    sessionId: v.id('interviewSessions'),
    inviteToken: v.string(),
  },
  returns: v.object({
    ok: v.literal(true),
    queued: v.boolean(),
    fallback: v.boolean(),
  }),
  handler: async (ctx, args): Promise<RequeueInterviewProcessingResult> => {
    const inviteToken = args.inviteToken.trim()
    if (!inviteToken) {
      throw new ConvexError('Invalid processing recovery request.')
    }

    await rateLimiter.limit(ctx, 'publicSnapshot', {
      key: `process:${inviteToken}:${args.sessionId}`,
      throws: true,
    })

    const allowed: boolean = await ctx.runQuery(
      api.interviews.public.verifyPublicSessionProcessingAccess,
      {
        inviteToken,
        sessionId: args.sessionId,
      }
    )
    if (!allowed) {
      throw new ConvexError('Session processing access denied for this invite.')
    }

    const result: {
      queued: boolean
      fallback: boolean
      eventIds?: string[]
    } = await ctx.runAction(internal.processingPipeline.run, {
      sessionId: args.sessionId,
    })

    return {
      ok: true as const,
      queued: result.queued,
      fallback: result.fallback,
    }
  },
})
