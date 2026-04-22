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

function emitDebugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>
) {
  // #region agent log
  fetch('http://127.0.0.1:7775/ingest/c816eaeb-acd1-4edb-bd45-1464db25af33', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'af8e6a',
    },
    body: JSON.stringify({
      sessionId: 'af8e6a',
      runId: 'baseline',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion
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
  emitDebugLog(
    'J1',
    'lib/livekit/token.ts:createParticipantToken',
    'token request received',
    {
      roomName,
      participantName,
      identity,
      hasAgentName: Boolean(env.LIVEKIT_AGENT_NAME),
    }
  )

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
    emitDebugLog(
      'J2',
      'lib/livekit/token.ts:createParticipantToken',
      'agent dispatch attached to room config',
      {
        agentName: env.LIVEKIT_AGENT_NAME,
      }
    )
  } else {
    emitDebugLog(
      'J2',
      'lib/livekit/token.ts:createParticipantToken',
      'agent dispatch missing because agent name not set',
      {
        agentName: null,
      }
    )
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
