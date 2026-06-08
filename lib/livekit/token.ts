import { RoomAgentDispatch, RoomConfiguration } from '@livekit/protocol'
import { AccessToken } from 'livekit-server-sdk'

import { createDiagnosticLogger } from '@/lib/interview/diagnostics'
import { getLivekitEnv } from '@/lib/livekit/config'

type CreateParticipantTokenInput = {
  roomName: string
  participantName: string
  participantIdentity?: string
  metadata?: string
  canPublish?: boolean
  canSubscribe?: boolean
  agentMetadata?: string
  requestId?: string
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
}: CreateParticipantTokenInput) {
  const identity = participantIdentity ?? participantName
  const logger = createDiagnosticLogger('livekit-token', {
    actor: 'server',
    requestId,
    roomName,
    participantIdentity: identity,
  })
  const env = getLivekitEnv()

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
      ttl: '15m',
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

  if (env.LIVEKIT_AGENT_NAME) {
    accessToken.roomConfig = new RoomConfiguration({
      agents: [
        new RoomAgentDispatch({
          agentName: env.LIVEKIT_AGENT_NAME,
          metadata: agentMetadata,
        }),
      ],
    })
    logger.info({
      event: 'livekit.agent.dispatch.included',
      detail: 'Agent dispatch configuration attached to token.',
      meta: {
        agentName: env.LIVEKIT_AGENT_NAME,
      },
    })
  }

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
