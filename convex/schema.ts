import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  assessmentTemplates: defineTable({
    name: v.string(),
    role: v.string(),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("archived")),
    createdBy: v.string(),
    rubricVersion: v.string(),
  }).index("by_status", ["status"]),

  candidateInvites: defineTable({
    inviteToken: v.string(),
    candidateName: v.optional(v.string()),
    candidateEmail: v.optional(v.string()),
    templateId: v.id("assessmentTemplates"),
    status: v.union(
      v.literal("created"),
      v.literal("opened"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("expired"),
    ),
    expiresAt: v.string(),
  })
    .index("by_invite_token", ["inviteToken"])
    .index("by_status", ["status"]),

  interviewSessions: defineTable({
    inviteId: v.id("candidateInvites"),
    state: v.union(
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
    provider: v.literal("livekit"),
    roomName: v.optional(v.string()),
    startedAt: v.optional(v.string()),
    endedAt: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  }).index("by_invite", ["inviteId"]),

  sessionEvents: defineTable({
    sessionId: v.id("interviewSessions"),
    type: v.string(),
    detail: v.string(),
    createdAt: v.string(),
  }).index("by_session", ["sessionId"]),

  transcriptSegments: defineTable({
    sessionId: v.id("interviewSessions"),
    speaker: v.union(v.literal("agent"), v.literal("candidate"), v.literal("system")),
    text: v.string(),
    status: v.union(v.literal("partial"), v.literal("final")),
    startedAt: v.string(),
    endedAt: v.optional(v.string()),
  }).index("by_session", ["sessionId"]),

  assessmentReports: defineTable({
    sessionId: v.id("interviewSessions"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("manual_review"),
    ),
    overallRecommendation: v.optional(v.string()),
    confidence: v.optional(v.string()),
    summary: v.optional(v.string()),
  }).index("by_session", ["sessionId"]),
});
