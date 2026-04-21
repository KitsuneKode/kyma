export type RealtimeRoomGrant = {
  roomName: string;
  participantName: string;
  token: string;
  expiresAt: string;
};

export type CreateRealtimeRoomInput = {
  inviteId: string;
  participantName: string;
};

export interface RealtimeProvider {
  createCandidateGrant(input: CreateRealtimeRoomInput): Promise<RealtimeRoomGrant>;
}

export const REALTIME_PROVIDER = {
  name: "livekit",
  transport: "webrtc",
} as const;
