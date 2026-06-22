import { RoomAgentDispatch, RoomConfiguration } from '@livekit/protocol'
import { AccessToken } from 'livekit-server-sdk'

import { DEFAULT_INTERVIEW_POLICY } from '@/lib/interview/policy'
import { createDiagnosticLogger } from '@/lib/interview/diagnostics'
import { resolveLivekitAgentName } from '@/lib/livekit/agent-name'
import { getLivekitEnv } from '@/lib/livekit/config'

const TOKEN_DURATION_BUFFER_MINUTES = 15

export function computeLivekitTokenTtlMinutes(
  targetDurationMinutes = DEFAULT_INTERVIEW_POLICY.targetDurationMinutes ?? 18
) {
  return targetDurationMinutes + TOKEN_DURATION_BUFFER_MINUTES
}

function formatTokenTtl(minutes: number) {
  return `${Math.max(minutes, 5)}m`
}

type CreateParticipantTokenInput = {
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

export async function createParticipantToken({
  roomName,
  participantName,
  participantIdentity,
  metadata,
  canPublish = true,
  canSubscribe = true,
  agentMetadata,
  requestId,
  tokenTtlMinutes,
}: CreateParticipantTokenInput) {
  const identity = participantIdentity ?? participantName
  const logger = createDiagnosticLogger('livekit-token', {
    actor: 'server',
    requestId,
    roomName,
    participantIdentity: identity,
  })
  const env = getLivekitEnv()
  const agentName = resolveLivekitAgentName(env.LIVEKIT_AGENT_NAME)
  const ttl = formatTokenTtl(tokenTtlMinutes ?? computeLivekitTokenTtlMinutes())

  if (
    !env.NEXT_PUBLIC_LIVEKIT_URL ||
    !env.LIVEKIT_API_KEY ||
    !env.LIVEKIT_API_SECRET
  ) {
    logger.error({
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
  logger.debug({
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
  logger.info({
    event: 'livekit.agent.dispatch.included',
    detail: 'Agent dispatch configuration attached to token.',
    meta: {
      agentName,
      tokenTtlMinutes: tokenTtlMinutes ?? computeLivekitTokenTtlMinutes(),
    },
  })

  const token = await accessToken.toJwt()
  logger.info({
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
