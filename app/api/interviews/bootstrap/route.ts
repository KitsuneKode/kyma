import { fetchMutation } from "convex/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { api } from "@/convex/_generated/api";
import { createParticipantToken } from "@/lib/livekit/token";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const bootstrapSchema = z.object({
  inviteToken: z.string().min(1),
  participantName: z.string().min(2),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = bootstrapSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid interview bootstrap request." }, { status: 400 });
  }

  const { inviteToken, participantName } = parsed.data;

  try {
    const session = await fetchMutation(api.interviews.bootstrapPublicSession, {
      inviteToken,
      participantName,
    });

    const token = await createParticipantToken({
      roomName: session.roomName,
      participantName,
      metadata: JSON.stringify({
        inviteToken,
        sessionId: session.sessionId,
        role: "candidate",
      }),
      agentMetadata: JSON.stringify({
        inviteToken,
        sessionId: session.sessionId,
        participantName,
      }),
    });

    return NextResponse.json({
      ...session,
      ...token,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to bootstrap interview.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
