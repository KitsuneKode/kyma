import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { transitionSessionSafely } from "../lib/interview/session-machine";
import type { InterviewSessionState } from "../lib/interview/types";
import {
  DEFAULT_INTERVIEW_DURATION_MINUTES,
  resolveInterviewPolicyFromInvite,
  type InterviewPolicy,
} from "./helpers/interviewPolicy";
import { ensureDefaultTemplate } from "./helpers/templates";

const DEVELOPMENT_INVITE_TOKEN = "demo-invite";
const DEMO_INVITE_ENABLED =
  process.env.NODE_ENV !== "production" || process.env.KYMA_ENABLE_DEMO_INVITE === "1";

function isEnabledDemoInviteToken(inviteToken: string) {
  return inviteToken === DEVELOPMENT_INVITE_TOKEN && DEMO_INVITE_ENABLED;
}

const WRITE_WINDOW_MS = 60_000;
const MAX_TRANSCRIPT_WRITES_PER_WINDOW = 120;
const MAX_SESSION_EVENTS_PER_WINDOW = 90;

function defaultDemoPolicy(expiresAt: string): InterviewPolicy {
  return {
    durationMode: "timed",
    targetDurationMinutes: DEFAULT_INTERVIEW_DURATION_MINUTES,
    allowsResume: true,
    maxAttempts: 1,
    expiresAt,
    rubricVersion: "v1",
    templateName: "AI Tutor Screener",
    interviewStyleMode: "standard",
  };
}

async function assertTranscriptWriteThrottle(
  ctx: MutationCtx,
  sessionId: Id<"interviewSessions">,
) {
  const since = new Date(Date.now() - WRITE_WINDOW_MS).toISOString();
  const segments = await ctx.db
    .query("transcriptSegments")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();
  const recent = segments.filter((segment) => segment.startedAt >= since);

  if (recent.length > MAX_TRANSCRIPT_WRITES_PER_WINDOW) {
    throw new ConvexError(
      "Transcript update rate exceeded. Please wait a moment and try again.",
    );
  }
}

async function assertSessionEventThrottle(
  ctx: MutationCtx,
  sessionId: Id<"interviewSessions">,
) {
  const since = new Date(Date.now() - WRITE_WINDOW_MS).toISOString();
  const events = await ctx.db
    .query("sessionEvents")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();
  const recent = events.filter((event) => event.createdAt >= since);

  if (recent.length > MAX_SESSION_EVENTS_PER_WINDOW) {
    throw new ConvexError(
      "Session event rate exceeded. Please wait a moment and try again.",
    );
  }
}

function isInviteExpired(expiresAt: string) {
  const parsed = Date.parse(expiresAt);

  if (Number.isNaN(parsed)) {
    return false;
  }

  return parsed <= Date.now();
}

function resolveTranscriptLookupKey(args: {
  segmentId: string;
  speaker: "agent" | "candidate" | "system";
  startedAt: string;
}) {
  const normalizedSegmentId = args.segmentId.trim();

  if (normalizedSegmentId) {
    return normalizedSegmentId;
  }

  return `${args.speaker}:${args.startedAt}`;
}

function deriveAccessState(
  invite: Pick<Doc<"candidateInvites">, "status" | "expiresAt"> | null,
  session: Pick<Doc<"interviewSessions">, "state"> | null,
) {
  if (!invite) {
    return {
      accessState: "available" as const,
      accessMessage: undefined,
    };
  }

  if (invite.status === "expired" || isInviteExpired(invite.expiresAt)) {
    return {
      accessState: "expired" as const,
      accessMessage:
        "This interview link has expired. Please request a new one from the recruiter.",
    };
  }

  if (
    invite.status === "completed" ||
    session?.state === "processing" ||
    session?.state === "completed"
  ) {
    return {
      accessState: "consumed" as const,
      accessMessage:
        "This invite has already been used for a submitted interview and cannot be started again.",
    };
  }

  return {
    accessState: "available" as const,
    accessMessage: undefined,
  };
}

async function ensureInvite(
  ctx: MutationCtx,
  inviteToken: string,
): Promise<Doc<"candidateInvites">> {
  const existingInvite = await ctx.db
    .query("candidateInvites")
    .withIndex("by_invite_token", (q) => q.eq("inviteToken", inviteToken))
    .first();

  if (existingInvite) {
    return existingInvite;
  }

  if (!isEnabledDemoInviteToken(inviteToken)) {
    throw new ConvexError("Invite not found.");
  }

  const template = await ensureDefaultTemplate(ctx);
  const inviteId = await ctx.db.insert("candidateInvites", {
    inviteToken,
    candidateName: "Demo Candidate",
    templateId: template._id,
    status: "created",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  });

  const invite = await ctx.db.get(inviteId);

  if (!invite) {
    throw new ConvexError("Unable to create development invite.");
  }

  return invite;
}

export const getPublicInterviewSnapshot = query({
  args: {
    inviteToken: v.string(),
  },
  handler: async (ctx, { inviteToken }) => {
    const invite = await ctx.db
      .query("candidateInvites")
      .withIndex("by_invite_token", (q) => q.eq("inviteToken", inviteToken))
      .first();

    if (!invite && !isEnabledDemoInviteToken(inviteToken)) {
      return null;
    }

    if (!invite) {
      return {
        inviteToken,
        templateName: "AI Tutor Screener",
        candidateName: "Demo Candidate",
        state: "ready" as const,
        accessState: "available" as const,
        accessMessage: undefined,
        policy: defaultDemoPolicy(
          new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        ),
      };
    }

    const template = await ctx.db.get(invite.templateId);
    const session = await ctx.db
      .query("interviewSessions")
      .withIndex("by_invite", (q) => q.eq("inviteId", invite._id))
      .first();
    const { policy } = await resolveInterviewPolicyFromInvite(ctx, invite);

    return {
      inviteToken,
      templateName: template?.name ?? "AI Tutor Screener",
      candidateName: invite.candidateName ?? "Candidate",
      state: session?.state ?? ("ready" as const),
      ...deriveAccessState(invite, session),
      policy,
    };
  },
});

export const getPublicSessionDetail = query({
  args: {
    inviteToken: v.string(),
  },
  handler: async (ctx, { inviteToken }) => {
    const invite = await ctx.db
      .query("candidateInvites")
      .withIndex("by_invite_token", (q) => q.eq("inviteToken", inviteToken))
      .first();

    if (!invite && !isEnabledDemoInviteToken(inviteToken)) {
      return null;
    }

    if (!invite) {
      return {
        inviteId: inviteToken,
        sessionId: undefined,
        candidateName: "Demo Candidate",
        templateName: "AI Tutor Screener",
        state: "ready" as const,
        accessState: "available" as const,
        accessMessage: undefined,
        policy: defaultDemoPolicy(
          new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        ),
        roomName: undefined,
        events: [],
        transcript: [],
        recordings: [],
      };
    }

    const template = await ctx.db.get(invite.templateId);
    const session = await ctx.db
      .query("interviewSessions")
      .withIndex("by_invite", (q) => q.eq("inviteId", invite._id))
      .first();
    const access = deriveAccessState(invite, session);
    const { policy } = await resolveInterviewPolicyFromInvite(ctx, invite);

    if (!session) {
      return {
        inviteId: invite._id,
        sessionId: undefined,
        candidateName: invite.candidateName ?? "Candidate",
        templateName: template?.name ?? "AI Tutor Screener",
        state: "ready" as const,
        ...access,
        policy,
        roomName: undefined,
        events: [],
        transcript: [],
        recordings: [],
      };
    }

    if (access.accessState !== "available") {
      return {
        inviteId: invite._id,
        sessionId: session._id,
        candidateName: invite.candidateName ?? "Candidate",
        templateName: template?.name ?? "AI Tutor Screener",
        state: session.state,
        ...access,
        policy,
        roomName: undefined,
        events: [],
        transcript: [],
        recordings: [],
      };
    }

    const [events, transcript, recordings] = await Promise.all([
      ctx.db
        .query("sessionEvents")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect(),
      ctx.db
        .query("transcriptSegments")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect(),
      ctx.db
        .query("recordingArtifacts")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect(),
    ]);

    return {
      inviteId: invite._id,
      sessionId: session._id,
      candidateName: invite.candidateName ?? "Candidate",
      templateName: template?.name ?? "AI Tutor Screener",
      state: session.state,
      ...access,
      policy,
      roomName: session.roomName,
      events: events
        .toSorted((left, right) => left.createdAt.localeCompare(right.createdAt))
        .map((event) => ({
          type: event.type,
          detail: event.detail,
          createdAt: event.createdAt,
        })),
      transcript: transcript
        .toSorted((left, right) => left.startedAt.localeCompare(right.startedAt))
        .map((segment) => ({
          id: `${segment._id}`,
          speaker: segment.speaker,
          text: segment.text,
          status: segment.status,
          startedAt: segment.startedAt,
          endedAt: segment.endedAt,
        })),
      recordings: recordings
        .toSorted((left, right) => left.updatedAt.localeCompare(right.updatedAt))
        .map((artifact) => ({
          id: `${artifact._id}`,
          provider: artifact.provider,
          egressId: artifact.egressId,
          artifactKey: artifact.artifactKey,
          roomName: artifact.roomName,
          artifactType: artifact.artifactType,
          status: artifact.status,
          filename: artifact.filename,
          location: artifact.location,
          manifestLocation: artifact.manifestLocation,
          startedAt: artifact.startedAt,
          endedAt: artifact.endedAt,
          durationMs: artifact.durationMs,
          sizeBytes: artifact.sizeBytes,
          error: artifact.error,
        })),
    };
  },
});

export const bootstrapPublicSession = mutation({
  args: {
    inviteToken: v.string(),
    participantName: v.string(),
  },
  handler: async (ctx, { inviteToken, participantName }) => {
    const invite = await ensureInvite(ctx, inviteToken);
    const existingSession = await ctx.db
      .query("interviewSessions")
      .withIndex("by_invite", (q) => q.eq("inviteId", invite._id))
      .first();

    if (invite.status === "expired" || isInviteExpired(invite.expiresAt)) {
      if (invite.status !== "expired") {
        await ctx.db.patch(invite._id, {
          status: "expired",
        });
      }

      throw new ConvexError("This interview link has expired.");
    }

    if (
      invite.status === "completed" ||
      existingSession?.state === "processing" ||
      existingSession?.state === "completed"
    ) {
      if (invite.status !== "completed") {
        await ctx.db.patch(invite._id, {
          status: "completed",
        });
      }

      throw new ConvexError("This interview has already been submitted.");
    }

    if (!invite.candidateName) {
      await ctx.db.patch(invite._id, {
        candidateName: participantName,
        status: "opened",
      });
    } else if (invite.status === "created") {
      await ctx.db.patch(invite._id, {
        status: "opened",
      });
    }

    const template = await ctx.db.get(invite.templateId);

    if (existingSession && existingSession.roomName) {
      return {
        inviteId: invite._id,
        sessionId: existingSession._id,
        roomName: existingSession.roomName,
        templateName: template?.name ?? "AI Tutor Screener",
      };
    }

    const roomName = `interview-${inviteToken}-${Date.now()}`;
    const startedAt = new Date().toISOString();

    const sessionId = await ctx.db.insert("interviewSessions", {
      inviteId: invite._id,
      state: "connecting",
      provider: "livekit",
      roomName,
      startedAt,
    });

    await ctx.db.patch(invite._id, {
      status: "in_progress",
    });

    if (invite.eligibilityId) {
      const eligibility = await ctx.db.get(invite.eligibilityId);

      if (eligibility) {
        await ctx.db.patch(invite.eligibilityId, {
          status: "in_progress",
          attemptCount: eligibility.attemptCount + 1,
        });
      }
    }

    await ctx.db.insert("sessionEvents", {
      sessionId,
      type: "room-token-requested",
      detail: `Bootstrap requested by ${participantName}`,
      createdAt: startedAt,
    });

    return {
      inviteId: invite._id,
      sessionId,
      roomName,
      templateName: template?.name ?? "AI Tutor Screener",
    };
  },
});

export const appendSessionEvent = mutation({
  args: {
    sessionId: v.id("interviewSessions"),
    type: v.string(),
    detail: v.string(),
    state: v.optional(
      v.union(
        v.literal("created"),
        v.literal("ready"),
        v.literal("connecting"),
        v.literal("live"),
        v.literal("reconnecting"),
        v.literal("interrupted"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
      ),
    ),
  },
  handler: async (ctx, { sessionId, type, detail, state }) => {
    const session = await ctx.db.get(sessionId);

    if (!session) {
      throw new ConvexError("Interview session not found.");
    }

    await assertSessionEventThrottle(ctx, sessionId);

    await ctx.db.insert("sessionEvents", {
      sessionId,
      type,
      detail,
      createdAt: new Date().toISOString(),
    });

    if (state) {
      const nextState = transitionSessionSafely(
        session.state as InterviewSessionState,
        state as InterviewSessionState,
      );
      const patch: Partial<Doc<"interviewSessions">> = {
        state: nextState,
      };

      if (
        (nextState === "processing" || nextState === "completed") &&
        !session.endedAt
      ) {
        patch.endedAt = new Date().toISOString();
      }

      await ctx.db.patch(sessionId, patch);

      if (nextState === "processing" || nextState === "completed") {
        const invite = await ctx.db.get(session.inviteId);

        await ctx.db.patch(session.inviteId, {
          status: "completed",
        });

        if (invite?.eligibilityId) {
          await ctx.db.patch(invite.eligibilityId, {
            status: "submitted",
          });
        }
      }
    }
  },
});

export const upsertTranscriptSegment = mutation({
  args: {
    sessionId: v.id("interviewSessions"),
    segmentId: v.string(),
    speaker: v.union(v.literal("agent"), v.literal("candidate"), v.literal("system")),
    text: v.string(),
    status: v.union(v.literal("partial"), v.literal("final")),
    startedAt: v.string(),
    endedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertTranscriptWriteThrottle(ctx, args.sessionId);

    const sourceSegmentId = resolveTranscriptLookupKey(args);
    const indexedMatch = await ctx.db
      .query("transcriptSegments")
      .withIndex("by_session_and_source_segment_id", (q) =>
        q.eq("sessionId", args.sessionId).eq("sourceSegmentId", sourceSegmentId),
      )
      .first();
    const match =
      indexedMatch ??
      (
        await ctx.db
          .query("transcriptSegments")
          .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
          .collect()
      ).find(
        (segment) =>
          segment.sourceSegmentId === sourceSegmentId ||
          (segment.startedAt === args.startedAt &&
            segment.speaker === args.speaker &&
            segment.status === "partial"),
      );

    if (match) {
      await ctx.db.patch(match._id, {
        sourceSegmentId,
        text: args.text,
        status: args.status,
        endedAt: args.endedAt,
      });
      return match._id;
    }

    return await ctx.db.insert("transcriptSegments", {
      sessionId: args.sessionId,
      sourceSegmentId,
      speaker: args.speaker,
      text: args.text,
      status: args.status,
      startedAt: args.startedAt,
      endedAt: args.endedAt,
    });
  },
});
