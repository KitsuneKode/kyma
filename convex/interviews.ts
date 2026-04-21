import { ConvexError, v } from "convex/values"

import type { Doc } from "./_generated/dataModel"
import { mutation, query, type MutationCtx } from "./_generated/server"
import { ensureDefaultTemplate } from "./helpers/templates"

const DEVELOPMENT_INVITE_TOKEN = "demo-invite"
const DEFAULT_INTERVIEW_DURATION_MINUTES = 18

function isInviteExpired(expiresAt: string) {
  const parsed = Date.parse(expiresAt)

  if (Number.isNaN(parsed)) {
    return false
  }

  return parsed <= Date.now()
}

function buildInterviewPolicy(expiresAt?: string) {
  return {
    durationMode: "timed" as const,
    targetDurationMinutes: DEFAULT_INTERVIEW_DURATION_MINUTES,
    allowsResume: true,
    maxAttempts: 1,
    expiresAt,
  }
}

function deriveAccessState(
  invite: Pick<Doc<"candidateInvites">, "status" | "expiresAt"> | null,
  session: Pick<Doc<"interviewSessions">, "state"> | null
) {
  if (!invite) {
    return {
      accessState: "available" as const,
      accessMessage: undefined,
    }
  }

  if (invite.status === "expired" || isInviteExpired(invite.expiresAt)) {
    return {
      accessState: "expired" as const,
      accessMessage:
        "This interview link has expired. Please request a new one from the recruiter.",
    }
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
    }
  }

  return {
    accessState: "available" as const,
    accessMessage: undefined,
  }
}

async function ensureInvite(
  ctx: MutationCtx,
  inviteToken: string
): Promise<Doc<"candidateInvites">> {
  const existingInvite = await ctx.db
    .query("candidateInvites")
    .withIndex("by_invite_token", (q) => q.eq("inviteToken", inviteToken))
    .first()

  if (existingInvite) {
    return existingInvite
  }

  if (inviteToken !== DEVELOPMENT_INVITE_TOKEN) {
    throw new ConvexError("Invite not found.")
  }

  const template = await ensureDefaultTemplate(ctx)
  const inviteId = await ctx.db.insert("candidateInvites", {
    inviteToken,
    candidateName: "Demo Candidate",
    templateId: template._id,
    status: "created",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  })

  const invite = await ctx.db.get(inviteId)

  if (!invite) {
    throw new ConvexError("Unable to create development invite.")
  }

  return invite
}

export const getPublicInterviewSnapshot = query({
  args: {
    inviteToken: v.string(),
  },
  handler: async (ctx, { inviteToken }) => {
    const invite = await ctx.db
      .query("candidateInvites")
      .withIndex("by_invite_token", (q) => q.eq("inviteToken", inviteToken))
      .first()

    if (!invite && inviteToken !== DEVELOPMENT_INVITE_TOKEN) {
      return null
    }

    if (!invite) {
      return {
        inviteToken,
        templateName: "AI Tutor Screener",
        candidateName: "Demo Candidate",
        state: "ready" as const,
        accessState: "available" as const,
        accessMessage: undefined,
        policy: buildInterviewPolicy(
          new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()
        ),
      }
    }

    const template = await ctx.db.get(invite.templateId)
    const session = await ctx.db
      .query("interviewSessions")
      .withIndex("by_invite", (q) => q.eq("inviteId", invite._id))
      .first()

    return {
      inviteToken,
      templateName: template?.name ?? "AI Tutor Screener",
      candidateName: invite.candidateName ?? "Candidate",
      state: session?.state ?? ("ready" as const),
      ...deriveAccessState(invite, session),
      policy: buildInterviewPolicy(invite.expiresAt),
    }
  },
})

export const getPublicSessionDetail = query({
  args: {
    inviteToken: v.string(),
  },
  handler: async (ctx, { inviteToken }) => {
    const invite = await ctx.db
      .query("candidateInvites")
      .withIndex("by_invite_token", (q) => q.eq("inviteToken", inviteToken))
      .first()

    if (!invite && inviteToken !== DEVELOPMENT_INVITE_TOKEN) {
      return null
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
        policy: buildInterviewPolicy(
          new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()
        ),
        roomName: undefined,
        events: [],
        transcript: [],
        recordings: [],
      }
    }

    const template = await ctx.db.get(invite.templateId)
    const session = await ctx.db
      .query("interviewSessions")
      .withIndex("by_invite", (q) => q.eq("inviteId", invite._id))
      .first()

    if (!session) {
      const access = deriveAccessState(invite, null)

      return {
        inviteId: invite._id,
        sessionId: undefined,
        candidateName: invite.candidateName ?? "Candidate",
        templateName: template?.name ?? "AI Tutor Screener",
        state: "ready" as const,
        ...access,
        policy: buildInterviewPolicy(invite.expiresAt),
        roomName: undefined,
        events: [],
        transcript: [],
        recordings: [],
      }
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
    ])

    return {
      inviteId: invite._id,
      sessionId: session._id,
      candidateName: invite.candidateName ?? "Candidate",
      templateName: template?.name ?? "AI Tutor Screener",
      state: session.state,
      ...deriveAccessState(invite, session),
      policy: buildInterviewPolicy(invite.expiresAt),
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
    }
  },
})

export const bootstrapPublicSession = mutation({
  args: {
    inviteToken: v.string(),
    participantName: v.string(),
  },
  handler: async (ctx, { inviteToken, participantName }) => {
    const invite = await ensureInvite(ctx, inviteToken)
    const existingSession = await ctx.db
      .query("interviewSessions")
      .withIndex("by_invite", (q) => q.eq("inviteId", invite._id))
      .first()

    if (invite.status === "expired" || isInviteExpired(invite.expiresAt)) {
      if (invite.status !== "expired") {
        await ctx.db.patch(invite._id, {
          status: "expired",
        })
      }

      throw new ConvexError("This interview link has expired.")
    }

    if (
      invite.status === "completed" ||
      existingSession?.state === "processing" ||
      existingSession?.state === "completed"
    ) {
      if (invite.status !== "completed") {
        await ctx.db.patch(invite._id, {
          status: "completed",
        })
      }

      throw new ConvexError("This interview has already been submitted.")
    }

    if (!invite.candidateName) {
      await ctx.db.patch(invite._id, {
        candidateName: participantName,
        status: "opened",
      })
    } else if (invite.status === "created") {
      await ctx.db.patch(invite._id, {
        status: "opened",
      })
    }

    const template = await ctx.db.get(invite.templateId)

    if (existingSession && existingSession.roomName) {
      return {
        inviteId: invite._id,
        sessionId: existingSession._id,
        roomName: existingSession.roomName,
        templateName: template?.name ?? "AI Tutor Screener",
      }
    }

    const roomName = `interview-${inviteToken}-${Date.now()}`
    const startedAt = new Date().toISOString()

    const sessionId = await ctx.db.insert("interviewSessions", {
      inviteId: invite._id,
      state: "connecting",
      provider: "livekit",
      roomName,
      startedAt,
    })

    await ctx.db.patch(invite._id, {
      status: "in_progress",
    })

    if (invite.eligibilityId) {
      const eligibility = await ctx.db.get(invite.eligibilityId)

      if (eligibility) {
        await ctx.db.patch(invite.eligibilityId, {
          status: "in_progress",
          attemptCount: eligibility.attemptCount + 1,
        })
      }
    }

    await ctx.db.insert("sessionEvents", {
      sessionId,
      type: "room-token-requested",
      detail: `Bootstrap requested by ${participantName}`,
      createdAt: startedAt,
    })

    return {
      inviteId: invite._id,
      sessionId,
      roomName,
      templateName: template?.name ?? "AI Tutor Screener",
    }
  },
})

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
        v.literal("failed")
      )
    ),
  },
  handler: async (ctx, { sessionId, type, detail, state }) => {
    await ctx.db.insert("sessionEvents", {
      sessionId,
      type,
      detail,
      createdAt: new Date().toISOString(),
    })

    if (state) {
      await ctx.db.patch(sessionId, { state })

      if (state === "processing" || state === "completed") {
        const session = await ctx.db.get(sessionId)

        if (session) {
          const invite = await ctx.db.get(session.inviteId)

          await ctx.db.patch(session.inviteId, {
            status: "completed",
          })

          if (invite?.eligibilityId) {
            await ctx.db.patch(invite.eligibilityId, {
              status: "submitted",
            })
          }
        }
      }
    }
  },
})

export const upsertTranscriptSegment = mutation({
  args: {
    sessionId: v.id("interviewSessions"),
    segmentId: v.string(),
    speaker: v.union(
      v.literal("agent"),
      v.literal("candidate"),
      v.literal("system")
    ),
    text: v.string(),
    status: v.union(v.literal("partial"), v.literal("final")),
    startedAt: v.string(),
    endedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("transcriptSegments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect()

    const match = existing.find(
      (segment) =>
        segment.startedAt === args.startedAt &&
        segment.speaker === args.speaker &&
        segment.status === "partial"
    )

    if (match) {
      await ctx.db.patch(match._id, {
        text: args.text,
        status: args.status,
        endedAt: args.endedAt,
      })
      return match._id
    }

    return await ctx.db.insert("transcriptSegments", {
      sessionId: args.sessionId,
      speaker: args.speaker,
      text: args.text,
      status: args.status,
      startedAt: args.startedAt,
      endedAt: args.endedAt,
    })
  },
})
