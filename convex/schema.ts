import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

const recommendationValidator = v.union(
  v.literal("strong_yes"),
  v.literal("yes"),
  v.literal("mixed"),
  v.literal("no")
)

const confidenceValidator = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low")
)

const rubricDimensionValidator = v.union(
  v.literal("clarity"),
  v.literal("simplification"),
  v.literal("patience"),
  v.literal("warmth"),
  v.literal("listening"),
  v.literal("fluency"),
  v.literal("adaptability"),
  v.literal("engagement"),
  v.literal("accuracy")
)

export default defineSchema({
  assessmentTemplates: defineTable({
    name: v.string(),
    role: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("archived")
    ),
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
      v.literal("expired")
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
      v.literal("failed")
    ),
    provider: v.literal("livekit"),
    roomName: v.optional(v.string()),
    startedAt: v.optional(v.string()),
    endedAt: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  })
    .index("by_invite", ["inviteId"])
    .index("by_room_name", ["roomName"]),

  sessionEvents: defineTable({
    sessionId: v.id("interviewSessions"),
    type: v.string(),
    detail: v.string(),
    createdAt: v.string(),
  }).index("by_session", ["sessionId"]),

  transcriptSegments: defineTable({
    sessionId: v.id("interviewSessions"),
    speaker: v.union(
      v.literal("agent"),
      v.literal("candidate"),
      v.literal("system")
    ),
    text: v.string(),
    status: v.union(v.literal("partial"), v.literal("final")),
    startedAt: v.string(),
    endedAt: v.optional(v.string()),
  }).index("by_session", ["sessionId"]),

  recordingArtifacts: defineTable({
    sessionId: v.id("interviewSessions"),
    provider: v.literal("livekit"),
    egressId: v.string(),
    artifactKey: v.string(),
    roomName: v.string(),
    artifactType: v.union(
      v.literal("audio"),
      v.literal("video"),
      v.literal("composite"),
      v.literal("segments")
    ),
    status: v.union(
      v.literal("starting"),
      v.literal("active"),
      v.literal("complete"),
      v.literal("failed")
    ),
    filename: v.optional(v.string()),
    location: v.optional(v.string()),
    manifestLocation: v.optional(v.string()),
    startedAt: v.optional(v.string()),
    endedAt: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    sizeBytes: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_session", ["sessionId"])
    .index("by_egress_id", ["egressId"])
    .index("by_artifact_key", ["artifactKey"]),

  assessmentReports: defineTable({
    sessionId: v.id("interviewSessions"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("manual_review")
    ),
    overallRecommendation: v.optional(recommendationValidator),
    confidence: v.optional(confidenceValidator),
    summary: v.optional(v.string()),
    weightedScore: v.optional(v.number()),
    hardGateTriggered: v.optional(v.boolean()),
    topStrengths: v.optional(v.array(v.string())),
    topConcerns: v.optional(v.array(v.string())),
    transcriptQualityNote: v.optional(v.string()),
    dimensionScores: v.optional(
      v.array(
        v.object({
          dimension: rubricDimensionValidator,
          score: v.number(),
          rationale: v.string(),
        })
      )
    ),
    generatedAt: v.optional(v.string()),
  })
    .index("by_session", ["sessionId"])
    .index("by_status", ["status"]),

  dimensionEvidence: defineTable({
    reportId: v.id("assessmentReports"),
    sessionId: v.id("interviewSessions"),
    dimension: rubricDimensionValidator,
    snippet: v.string(),
    rationale: v.string(),
    startedAt: v.optional(v.string()),
    endedAt: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_report", ["reportId"])
    .index("by_session", ["sessionId"]),

  reviewDecisions: defineTable({
    reportId: v.id("assessmentReports"),
    sessionId: v.id("interviewSessions"),
    decision: v.union(
      v.literal("advance"),
      v.literal("reject"),
      v.literal("manual_review"),
      v.literal("hold")
    ),
    rationale: v.optional(v.string()),
    reviewerId: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_report_and_created_at", ["reportId", "createdAt"])
    .index("by_session_and_created_at", ["sessionId", "createdAt"]),
})
