import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { z } from "zod";

import { getLivekitEnv } from "@/lib/livekit/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const tokenRequestSchema = z.object({
  roomName: z.string().min(1),
  participantName: z.string().min(1),
  canPublish: z.boolean().optional().default(true),
  canSubscribe: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = tokenRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token request." }, { status: 400 });
  }

  const env = getLivekitEnv();

  if (!env.NEXT_PUBLIC_LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    return NextResponse.json({ error: "LiveKit server is not configured." }, { status: 500 });
  }

  const { roomName, participantName, canPublish, canSubscribe } = parsed.data;

  const accessToken = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: participantName,
    ttl: "15m",
  });

  accessToken.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe,
  });

  return NextResponse.json(
    {
      token: await accessToken.toJwt(),
      roomName,
      participantName,
      wsUrl: env.NEXT_PUBLIC_LIVEKIT_URL,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
