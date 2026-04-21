import { fetchMutation } from "convex/nextjs"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { api } from "@/convex/_generated/api"
import {
  createDiagnosticLogger,
  createRequestId,
} from "@/lib/interview/diagnostics"
import { createParticipantToken } from "@/lib/livekit/token"

export const dynamic = "force-dynamic"
export const revalidate = 0

const bootstrapSchema = z.object({
  inviteToken: z.string().min(1),
  participantName: z.string().min(2),
})

export async function POST(request: NextRequest) {
  const requestId = createRequestId("bootstrap")
  const logger = createDiagnosticLogger("bootstrap-route", {
    actor: "server",
    requestId,
  })
  const body = await request.json().catch(() => null)
  const parsed = bootstrapSchema.safeParse(body)

  if (!parsed.success) {
    logger.warn({
      event: "bootstrap.invalid",
      detail: "Interview bootstrap validation failed.",
      meta: {
        issues: parsed.error.flatten(),
      },
    })
    return NextResponse.json(
      { error: "Invalid interview bootstrap request." },
      { status: 400 }
    )
  }

  const { inviteToken, participantName } = parsed.data
  logger.info({
    event: "bootstrap.started",
    detail: "Bootstrapping interview session.",
    inviteToken,
    participantIdentity: participantName,
  })

  try {
    const session = await fetchMutation(api.interviews.bootstrapPublicSession, {
      inviteToken,
      participantName,
    })
    logger.info({
      event: "bootstrap.session.created",
      detail: "Convex session bootstrap completed.",
      inviteToken,
      sessionId: `${session.sessionId}`,
      roomName: session.roomName,
      participantIdentity: participantName,
    })

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
      requestId,
    })
    logger.info({
      event: "bootstrap.token.issued",
      detail: "LiveKit token issued for candidate join.",
      inviteToken,
      sessionId: `${session.sessionId}`,
      roomName: session.roomName,
      participantIdentity: participantName,
    })

    return NextResponse.json({
      ...session,
      ...token,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to bootstrap interview."
    const status =
      message === "This interview link has expired."
        ? 410
        : message === "This interview has already been submitted."
          ? 409
          : 500
    logger.error({
      event: "bootstrap.failed",
      detail: message,
      inviteToken,
      participantIdentity: participantName,
      error,
    })

    return NextResponse.json({ error: message }, { status })
  }
}
