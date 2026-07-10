import { RoomAgentDispatch, RoomConfiguration } from '@livekit/protocol'
import { AccessToken } from 'livekit-server-sdk'

import { DEFAULT_INTERVIEW_POLICY } from '../interview/policy'
import {
  createDiagnosticLogger,
  type DiagnosticLogger,
} from '../interview/diagnostics'
import { resolveLivekitAgentName } from './agent-name'
import type { LivekitEnvSlice } from './env'

const TOKEN_DURATION_BUFFER_MINUTES = 15

export function computeLivekitTokenTtlMinutes(
  targetDurationMinutes = DEFAULT_INTERVIEW_POLICY.targetDurationMinutes ?? 18
) {
  return targetDurationMinutes + TOKEN_DURATION_BUFFER_MINUTES
}

function formatTokenTtl(minutes: number) {
  return `${Math.max(minutes, 5)}m`
}

export type CreateParticipantTokenInput = {
  roomName: string
  participantName: string
  participantIdentity?: string
  metadata?: string
  canPublish?: boolean
  canSubscribe?: boolean
  agentMetadata?: string
  requestId?: string
  tokenTtlMinutes?: number
}

/**
 * Mint a LiveKit participant JWT using an explicit env slice.
 * Safe for Convex `"use node"` actions and Next route handlers.
 */
export async function createParticipantTokenWithEnv(
  env: LivekitEnvSlice,
  {
    roomName,
    participantName,
    participantIdentity,
    metadata,
    canPublish = true,
    canSubscribe = true,
    agentMetadata,
    requestId,
    tokenTtlMinutes,
  }: CreateParticipantTokenInput,
  logger?: DiagnosticLogger
) {
  const identity = participantIdentity ?? participantName
  const log =
    logger ??
    createDiagnosticLogger('livekit-token', {
      actor: 'server',
      requestId,
      roomName,
      participantIdentity: identity,
    })
  const agentName = resolveLivekitAgentName(env.LIVEKIT_AGENT_NAME)
  const ttl = formatTokenTtl(tokenTtlMinutes ?? computeLivekitTokenTtlMinutes())

  if (
    !env.NEXT_PUBLIC_LIVEKIT_URL ||
    !env.LIVEKIT_API_KEY ||
    !env.LIVEKIT_API_SECRET
  ) {
    log.error({
      event: 'livekit.config.missing',
      detail: 'LiveKit server credentials are not configured.',
    })
    throw new Error('LiveKit server is not configured.')
  }

  const accessToken = new AccessToken(
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET,
    {
      identity,
      name: participantName,
      metadata,
      ttl,
    }
  )

  accessToken.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe,
  })
  log.debug({
    event: 'livekit.grants.created',
    detail: 'LiveKit grants created for participant.',
    meta: {
      canPublish,
      canSubscribe,
    },
  })

  accessToken.roomConfig = new RoomConfiguration({
    agents: [
      new RoomAgentDispatch({
        agentName,
        metadata: agentMetadata,
      }),
    ],
  })
  log.info({
    event: 'livekit.agent.dispatch.included',
    detail: 'Agent dispatch configuration attached to token.',
    meta: {
      agentName,
      tokenTtlMinutes: tokenTtlMinutes ?? computeLivekitTokenTtlMinutes(),
    },
  })

  const token = await accessToken.toJwt()
  log.info({
    event: 'livekit.token.created',
    detail: 'LiveKit access token created.',
  })

  return {
    token,
    roomName,
    participantName,
    wsUrl: env.NEXT_PUBLIC_LIVEKIT_URL,
  }
}
