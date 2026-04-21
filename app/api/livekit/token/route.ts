import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createParticipantToken } from "@/lib/livekit/token";

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

  const { roomName, participantName, canPublish, canSubscribe } = parsed.data;

  try {
    const response = await createParticipantToken({
      roomName,
      participantName,
      canPublish,
      canSubscribe,
    });

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create LiveKit token.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
