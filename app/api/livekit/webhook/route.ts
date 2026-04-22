import { fetchMutation } from "convex/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";

import { api } from "@/convex/_generated/api";
import { createDiagnosticLogger, createRequestId } from "@/lib/interview/diagnostics";
import { getLivekitWebhookSigningCredentials } from "@/lib/livekit/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toNumber(value?: bigint) {
  if (value === undefined) {
    return undefined;
  }

  return Number(value);
}

function getWebhookAuthorizationHeader(request: NextRequest) {
  return (
    request.headers.get("authorization") ??
    request.headers.get("Authorization") ??
    request.headers.get("Authorize") ??
    undefined
  );
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId("lkwebhook");
  const logger = createDiagnosticLogger("livekit-webhook", {
    actor: "server",
    requestId,
  });
  const body = await request.text();
  const { apiKey, apiSecret } = getLivekitWebhookSigningCredentials();

  if (!apiKey || !apiSecret) {
    logger.error({
      event: "webhook.config.missing",
      detail: "LiveKit webhook signing credentials are not configured.",
    });
    return NextResponse.json(
      { error: "LiveKit webhook receiver is not configured." },
      { status: 500 },
    );
  }

  try {
    const receiver = new WebhookReceiver(apiKey, apiSecret);
    const event = await receiver.receive(body, getWebhookAuthorizationHeader(request));
    const roomName = event.room?.name || event.egressInfo?.roomName;
    const participantIdentity = event.participant?.identity;
    const participantName = event.participant?.name;

    logger.info({
      event: "webhook.received",
      detail: `Received LiveKit webhook: ${event.event}.`,
      roomName: roomName ?? undefined,
      participantIdentity: participantIdentity ?? undefined,
      meta: {
        webhookEvent: event.event,
        egressId: event.egressInfo?.egressId,
      },
    });

    const egress = event.egressInfo;
    const mutations = [];

    if (egress && event.event.startsWith("egress_")) {
      const fileResults = egress.fileResults ?? [];
      const segmentResults = egress.segmentResults ?? [];

      if (fileResults.length === 0 && segmentResults.length === 0) {
        mutations.push(
          fetchMutation(api.livekit.ingestWebhookEvent, {
            event: event.event,
            roomName,
            participantIdentity,
            participantName,
            egressId: egress.egressId,
            startedAtMs: toNumber(egress.startedAt),
            endedAtMs: toNumber(egress.endedAt),
            updatedAtMs: toNumber(egress.updatedAt),
            error: egress.error || undefined,
            details: egress.details || undefined,
          }),
        );
      }

      for (const file of fileResults) {
        mutations.push(
          fetchMutation(api.livekit.ingestWebhookEvent, {
            event: event.event,
            roomName,
            participantIdentity,
            participantName,
            egressId: egress.egressId,
            artifactKey: `${egress.egressId}:${file.location || file.filename || "file"}`,
            filename: file.filename || undefined,
            location: file.location || undefined,
            startedAtMs: toNumber(file.startedAt),
            endedAtMs: toNumber(file.endedAt),
            updatedAtMs: toNumber(egress.updatedAt),
            durationMs: toNumber(file.duration),
            sizeBytes: toNumber(file.size),
            error: egress.error || undefined,
            details: egress.details || undefined,
          }),
        );
      }

      for (const segment of segmentResults) {
        mutations.push(
          fetchMutation(api.livekit.ingestWebhookEvent, {
            event: event.event,
            roomName,
            participantIdentity,
            participantName,
            egressId: egress.egressId,
            artifactKey: `${egress.egressId}:${segment.playlistLocation || segment.playlistName || "segments"}`,
            filename: segment.playlistName || undefined,
            manifestLocation: segment.playlistLocation || undefined,
            startedAtMs: toNumber(segment.startedAt),
            endedAtMs: toNumber(segment.endedAt),
            updatedAtMs: toNumber(egress.updatedAt),
            durationMs: toNumber(segment.duration),
            sizeBytes: toNumber(segment.size),
            error: egress.error || undefined,
            details: egress.details || undefined,
          }),
        );
      }
    } else {
      mutations.push(
        fetchMutation(api.livekit.ingestWebhookEvent, {
          event: event.event,
          roomName,
          participantIdentity,
          participantName,
          details:
            roomName && participantIdentity
              ? `${event.event} for ${participantIdentity} in ${roomName}`
              : undefined,
        }),
      );
    }

    await Promise.all(mutations);

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({
      event: "webhook.failed",
      detail: "Failed to process LiveKit webhook.",
      error,
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid webhook." },
      { status: 401 },
    );
  }
}
