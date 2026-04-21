import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";
import { AccessToken } from "livekit-server-sdk";

import { getLivekitEnv } from "@/lib/livekit/config";

type CreateParticipantTokenInput = {
  roomName: string;
  participantName: string;
  metadata?: string;
  canPublish?: boolean;
  canSubscribe?: boolean;
  agentMetadata?: string;
};

export async function createParticipantToken({
  roomName,
  participantName,
  metadata,
  canPublish = true,
  canSubscribe = true,
  agentMetadata,
}: CreateParticipantTokenInput) {
  const env = getLivekitEnv();

  if (!env.NEXT_PUBLIC_LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    throw new Error("LiveKit server is not configured.");
  }

  const accessToken = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: participantName,
    name: participantName,
    metadata,
    ttl: "15m",
  });

  accessToken.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe,
  });

  if (env.LIVEKIT_AGENT_NAME) {
    accessToken.roomConfig = new RoomConfiguration({
      agents: [
        new RoomAgentDispatch({
          agentName: env.LIVEKIT_AGENT_NAME,
          metadata: agentMetadata,
        }),
      ],
    });
  }

  return {
    token: await accessToken.toJwt(),
    roomName,
    participantName,
    wsUrl: env.NEXT_PUBLIC_LIVEKIT_URL,
  };
}
