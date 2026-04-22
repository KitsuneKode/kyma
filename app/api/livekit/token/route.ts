import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createDiagnosticLogger, createRequestId } from "@/lib/interview/diagnostics";
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
  const requestId = createRequestId("token");
  const logger = createDiagnosticLogger("livekit-token-route", {
    actor: "server",
    requestId,
  });
  const body = await request.json().catch(() => null);
  const parsed = tokenRequestSchema.safeParse(body);

  if (!parsed.success) {
    logger.warn({
      event: "token.invalid",
      detail: "LiveKit token validation failed.",
      meta: {
        issues: parsed.error.flatten(),
      },
    });
    return NextResponse.json({ error: "Invalid token request." }, { status: 400 });
  }

  const { roomName, participantName, canPublish, canSubscribe } = parsed.data;
  logger.info({
    event: "token.started",
    detail: "Creating direct LiveKit token.",
    roomName,
    participantIdentity: participantName,
    meta: {
      canPublish,
      canSubscribe,
    },
  });

  try {
    const response = await createParticipantToken({
      roomName,
      participantName,
      canPublish,
      canSubscribe,
      requestId,
    });
    logger.info({
      event: "token.issued",
      detail: "Direct LiveKit token issued.",
      roomName,
      participantIdentity: participantName,
    });

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create LiveKit token.";
    logger.error({
      event: "token.failed",
      detail: message,
      roomName,
      participantIdentity: participantName,
      error,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
