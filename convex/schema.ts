import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

import {
  confidenceValidator,
  interviewPolicySnapshotValidator,
  interviewSessionStateValidator,
  interviewStyleModeValidator,
  jobFamilyValidator,
  practiceJobFamilyValidator,
  modelOverridesValidator,
  recommendationValidator,
  reportStatusValidator,
  scoringDimensionValidator,
  sessionPurposeValidator,
  simulationModeValidator,
  workspaceProviderKeyValidator,
} from './validators'

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    preferredWorkspace: v.optional(
      v.union(v.literal('candidate'), v.literal('recruiter'))
    ),
    role: v.union(
      v.literal('admin'),
      v.literal('recruiter'),
      v.literal('candidate')
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_email', ['email']),

  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    /** Effective Kyma plan from Dodo (or free). Override via KYMA_ORG_PLAN_OVERRIDE. */
    plan: v.optional(
      v.union(v.literal('free'), v.literal('pro'), v.literal('enterprise'))
    ),
    billingStatus: v.optional(v.string()),
    dodoCustomerId: v.optional(v.string()),
    dodoSubscriptionId: v.optional(v.string()),
    dodoProductId: v.optional(v.string()),
    billingCurrentPeriodEnd: v.optional(v.number()),
    billingCancelAtPeriodEnd: v.optional(v.boolean()),
    billingUpdatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_clerk_org_id', ['clerkOrgId'])
    .index('by_dodo_customer_id', ['dodoCustomerId'])
    .index('by_dodo_subscription_id', ['dodoSubscriptionId']),

  /** Idempotent Dodo webhook event log (dedupe by event id / composite key). */
  billingWebhookEvents: defineTable({
    eventKey: v.string(),
    eventType: v.string(),
    clerkOrgId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    processedAt: v.number(),
  }).index('by_event_key', ['eventKey']),

  orgMemberships: defineTable({
    clerkMembershipId: v.string(),
    clerkOrgId: v.string(),
    clerkUserId: v.string(),
    role: v.string(),
    permissions: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_clerk_membership_id', ['clerkMembershipId'])
    .index('by_clerk_org_id', ['clerkOrgId'])
    .index('by_clerk_user_id', ['clerkUserId']),

  assessmentTemplates: defineTable({
    orgId: v.string(),
    name: v.string(),
    role: v.string(),
    status: v.union(
      v.literal('draft'),
      v.literal('active'),
      v.literal('archived')
    ),
    createdBy: v.string(),
    rubricVersion: v.string(),
    targetDurationMinutes: v.optional(v.number()),
    allowsResume: v.optional(v.boolean()),
    interviewStyleMode: v.optional(interviewStyleModeValidator),
    jobFamily: v.optional(jobFamilyValidator),
    simulationMode: v.optional(simulationModeValidator),
    systemPrompt: v.optional(v.string()),
    /** @deprecated Use simulationPersonaPrompt */
    childPersonaPrompt: v.optional(v.string()),
    simulationPersonaPrompt: v.optional(v.string()),
    wrapUpPrompt: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
    rubricConfig: v.optional(
      v.object({
        dimensions: v.array(
          v.object({
            name: v.string(),
            weight: v.number(),
            isHardGate: v.boolean(),
            keywords: v.optional(v.array(v.string())),
          })
        ),
      })
    ),
    modelOverrides: v.optional(modelOverridesValidator),
  })
    .index('by_org_id', ['orgId'])
    .index('by_org_id_and_status', ['orgId', 'status']),

  assessmentTemplateVersions: defineTable({
    orgId: v.string(),
    templateId: v.id('assessmentTemplates'),
    rubricVersion: v.string(),
    savedAt: v.number(),
    savedBy: v.string(),
    jobFamily: v.optional(jobFamilyValidator),
    simulationMode: v.optional(simulationModeValidator),
    systemPrompt: v.optional(v.string()),
    childPersonaPrompt: v.optional(v.string()),
    simulationPersonaPrompt: v.optional(v.string()),
    wrapUpPrompt: v.optional(v.string()),
    rubricConfig: v.optional(
      v.object({
        dimensions: v.array(
          v.object({
            name: v.string(),
            weight: v.number(),
            isHardGate: v.boolean(),
            keywords: v.optional(v.array(v.string())),
          })
        ),
      })
    ),
    modelOverrides: v.optional(modelOverridesValidator),
  })
    .index('by_org_id', ['orgId'])
    .index('by_template', ['templateId'])
    .index('by_template_and_saved_at', ['templateId', 'savedAt']),

  screeningBatches: defineTable({
    orgId: v.string(),
    name: v.string(),
    templateId: v.id('assessmentTemplates'),
    createdBy: v.string(),
    status: v.union(
      v.literal('draft'),
      v.literal('active'),
      v.literal('closed'),
      v.literal('archived')
    ),
    expiresAt: v.optional(v.string()),
    allowedAttempts: v.number(),
    targetDurationMinutes: v.optional(v.number()),
    allowsResume: v.optional(v.boolean()),
    candidateReleaseMode: v.optional(
      v.union(v.literal('auto'), v.literal('manual'), v.literal('inherit'))
    ),
    createdAt: v.string(),
  })
    .index('by_org_id', ['orgId'])
    .index('by_org_id_and_status', ['orgId', 'status'])
    .index('by_org_id_and_created_at', ['orgId', 'createdAt'])
    .index('by_template', ['templateId']),

  candidateEligibility: defineTable({
    orgId: v.string(),
    batchId: v.id('screeningBatches'),
    inviteId: v.id('candidateInvites'),
    candidateName: v.string(),
    candidateEmail: v.optional(v.string()),
    allowedAttempts: v.number(),
    attemptCount: v.number(),
    status: v.union(
      v.literal('eligible'),
      v.literal('invited'),
      v.literal('in_progress'),
      v.literal('submitted'),
      v.literal('revoked'),
      v.literal('expired')
    ),
    createdAt: v.string(),
  })
    .index('by_org_id', ['orgId'])
    .index('by_batch', ['batchId'])
    .index('by_invite', ['inviteId'])
    .index('by_status', ['status']),

  candidateInvites: defineTable({
    orgId: v.string(),
    inviteToken: v.string(),
    candidateName: v.optional(v.string()),
    candidateEmail: v.optional(v.string()),
    userId: v.optional(v.id('users')),
    templateId: v.id('assessmentTemplates'),
    batchId: v.optional(v.id('screeningBatches')),
    eligibilityId: v.optional(v.id('candidateEligibility')),
    status: v.union(
      v.literal('created'),
      v.literal('opened'),
      v.literal('in_progress'),
      v.literal('completed'),
      v.literal('expired')
    ),
    sessionPurpose: v.optional(sessionPurposeValidator),
    /** Set for mock/practice invites — avoids parsing invite tokens. */
    practiceJobFamily: v.optional(practiceJobFamilyValidator),
    practiceCreatedAt: v.optional(v.number()),
    expiresAt: v.string(),
    /** Last invite-email delivery attempt (not invite lifecycle). */
    emailDeliveryStatus: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('sent'),
        v.literal('failed'),
        v.literal('skipped')
      )
    ),
    emailSentAt: v.optional(v.string()),
    emailProvider: v.optional(v.string()),
    emailProviderMessageId: v.optional(v.string()),
    emailLastError: v.optional(v.string()),
  })
    .index('by_org_id', ['orgId'])
    .index('by_org_id_and_status', ['orgId', 'status'])
    .index('by_invite_token', ['inviteToken'])
    .index('by_status', ['status'])
    .index('by_candidate_email', ['candidateEmail'])
    .index('by_user', ['userId'])
    .index('by_email_delivery_status', ['emailDeliveryStatus']),

  interviewSessions: defineTable({
    orgId: v.string(),
    inviteId: v.id('candidateInvites'),
    state: interviewSessionStateValidator,
    provider: v.literal('livekit'),
    roomName: v.optional(v.string()),
    participantName: v.optional(v.string()),
    participantIdentity: v.optional(v.string()),
    reconnectCount: v.optional(v.number()),
    activeDurationMs: v.optional(v.number()),
    lastLiveStartedAt: v.optional(v.string()),
    startedAt: v.optional(v.string()),
    endedAt: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    candidateUserId: v.optional(v.id('users')),
    sessionPurpose: v.optional(sessionPurposeValidator),
  })
    .index('by_org_id', ['orgId'])
    .index('by_org_id_and_state', ['orgId', 'state'])
    .index('by_state', ['state'])
    .index('by_invite', ['inviteId'])
    .index('by_room_name', ['roomName'])
    .index('by_candidate_user', ['candidateUserId']),

  sessionEvents: defineTable({
    orgId: v.string(),
    sessionId: v.id('interviewSessions'),
    type: v.string(),
    detail: v.string(),
    source: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index('by_org_id', ['orgId'])
    .index('by_session', ['sessionId'])
    .index('by_session_and_dedupe_key', ['sessionId', 'dedupeKey'])
    .index('by_session_and_created_at', ['sessionId', 'createdAt'])
    .index('by_org_id_and_created_at', ['orgId', 'createdAt']),

  transcriptSegments: defineTable({
    sessionId: v.id('interviewSessions'),
    sourceSegmentId: v.optional(v.string()),
    speaker: v.union(
      v.literal('agent'),
      v.literal('candidate'),
      v.literal('system')
    ),
    text: v.string(),
    status: v.union(v.literal('partial'), v.literal('final')),
    startedAt: v.string(),
    endedAt: v.optional(v.string()),
  })
    .index('by_session', ['sessionId'])
    .index('by_session_and_source_segment_id', ['sessionId', 'sourceSegmentId'])
    .index('by_session_and_started_at', ['sessionId', 'startedAt']),

  candidateReadinessRuns: defineTable({
    candidateUserId: v.id('users'),
    ranAt: v.string(),
    checks: v.object({
      browserSupported: v.boolean(),
      audioInputAvailable: v.boolean(),
      videoInputAvailable: v.boolean(),
      networkOnline: v.boolean(),
      secureContext: v.boolean(),
      mediaPermissionsGranted: v.boolean(),
    }),
    notes: v.optional(v.string()),
  })
    .index('by_candidate_user', ['candidateUserId'])
    .index('by_candidate_user_and_ran_at', ['candidateUserId', 'ranAt']),

  candidatePreferences: defineTable({
    candidateUserId: v.id('users'),
    preferredInterviewLanguage: v.string(),
    preferredInterviewLengthMinutes: v.number(),
    timezone: v.string(),
    accessibilityNotes: v.optional(v.string()),
    updatedAt: v.string(),
  }).index('by_candidate_user', ['candidateUserId']),

  recordingArtifacts: defineTable({
    orgId: v.string(),
    sessionId: v.id('interviewSessions'),
    provider: v.literal('livekit'),
    egressId: v.string(),
    artifactKey: v.string(),
    roomName: v.string(),
    artifactType: v.union(
      v.literal('audio'),
      v.literal('video'),
      v.literal('composite'),
      v.literal('segments')
    ),
    status: v.union(
      v.literal('starting'),
      v.literal('active'),
      v.literal('complete'),
      v.literal('failed')
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
    .index('by_org_id', ['orgId'])
    .index('by_session', ['sessionId'])
    .index('by_egress_id', ['egressId'])
    .index('by_artifact_key', ['artifactKey']),

  assessmentReports: defineTable({
    orgId: v.string(),
    sessionId: v.id('interviewSessions'),
    status: reportStatusValidator,
    overallRecommendation: v.optional(recommendationValidator),
    confidence: v.optional(confidenceValidator),
    summary: v.optional(v.string()),
    weightedScore: v.optional(v.number()),
    hardGateTriggered: v.optional(v.boolean()),
    /**
     * The dimensions that actually gated THIS report, captured at scoring time.
     * Stored rather than re-derived so a report rendered later reflects the
     * rubric that was applied, not whatever the template says today.
     */
    hardGateDimensions: v.optional(v.array(v.string())),
    topStrengths: v.optional(v.array(v.string())),
    topConcerns: v.optional(v.array(v.string())),
    transcriptQualityNote: v.optional(v.string()),
    dimensionScores: v.optional(
      v.array(
        v.object({
          dimension: scoringDimensionValidator,
          score: v.number(),
          rationale: v.string(),
        })
      )
    ),
    scoringSource: v.optional(
      v.union(v.literal('llm'), v.literal('deterministic'))
    ),
    scoringModelId: v.optional(v.string()),
    generatedAt: v.optional(v.string()),
    policySnapshot: v.optional(interviewPolicySnapshotValidator),
    released: v.optional(v.boolean()),
    releasedAt: v.optional(v.string()),
    releasedBy: v.optional(v.string()),
  })
    .index('by_org_id', ['orgId'])
    .index('by_session', ['sessionId'])
    .index('by_status', ['status'])
    .index('by_org_id_and_status', ['orgId', 'status']),

  dimensionEvidence: defineTable({
    orgId: v.string(),
    reportId: v.id('assessmentReports'),
    sessionId: v.id('interviewSessions'),
    dimension: scoringDimensionValidator,
    snippet: v.string(),
    rationale: v.string(),
    startedAt: v.optional(v.string()),
    endedAt: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index('by_org_id', ['orgId'])
    .index('by_report', ['reportId'])
    .index('by_session', ['sessionId']),

  reviewDecisions: defineTable({
    orgId: v.string(),
    reportId: v.id('assessmentReports'),
    sessionId: v.id('interviewSessions'),
    decision: v.union(
      v.literal('advance'),
      v.literal('reject'),
      v.literal('manual_review'),
      v.literal('hold')
    ),
    rationale: v.optional(v.string()),
    reviewerId: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index('by_org_id', ['orgId'])
    .index('by_report_and_created_at', ['reportId', 'createdAt'])
    .index('by_session_and_created_at', ['sessionId', 'createdAt']),

  recruiterNotes: defineTable({
    orgId: v.string(),
    sessionId: v.id('interviewSessions'),
    reportId: v.optional(v.id('assessmentReports')),
    authorId: v.optional(v.string()),
    body: v.string(),
    createdAt: v.string(),
  })
    .index('by_org_id', ['orgId'])
    .index('by_session_and_created_at', ['sessionId', 'createdAt'])
    .index('by_report_and_created_at', ['reportId', 'createdAt']),

  reportChatMessages: defineTable({
    orgId: v.string(),
    sessionId: v.id('interviewSessions'),
    reportId: v.optional(v.id('assessmentReports')),
    role: v.union(
      v.literal('user'),
      v.literal('assistant'),
      v.literal('system')
    ),
    content: v.string(),
    createdAt: v.string(),
    answerSource: v.optional(
      v.union(v.literal('fallback'), v.literal('model'))
    ),
    modelId: v.optional(v.string()),
    citationsJson: v.optional(v.string()),
    groundingVersion: v.optional(v.string()),
  })
    .index('by_org_id', ['orgId'])
    .index('by_session_and_created_at', ['sessionId', 'createdAt'])
    .index('by_report_and_created_at', ['reportId', 'createdAt']),

  auditEvents: defineTable({
    orgId: v.optional(v.string()),
    actorId: v.optional(v.string()),
    action: v.string(),
    resource: v.string(),
    metadataJson: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index('by_org_id', ['orgId'])
    .index('by_created_at', ['createdAt']),

  visualObservations: defineTable({
    orgId: v.string(),
    sessionId: v.id('interviewSessions'),
    observation: v.string(),
    observedAt: v.string(),
    source: v.union(v.literal('agent'), v.literal('system')),
  })
    .index('by_org_id', ['orgId'])
    .index('by_session', ['sessionId']),

  workspaceSettings: defineTable({
    orgId: v.string(),
    providerKeys: v.optional(v.array(workspaceProviderKeyValidator)),
    defaultModels: v.optional(modelOverridesValidator),
    candidateReleaseMode: v.optional(
      v.union(v.literal('auto'), v.literal('manual'))
    ),
    recruiterOnboarding: v.optional(
      v.object({
        completedAt: v.optional(v.number()),
        steps: v.array(
          v.union(
            v.literal('template'),
            v.literal('batch'),
            v.literal('invite_preview'),
            v.literal('example_report')
          )
        ),
      })
    ),
    updatedAt: v.number(),
    updatedBy: v.string(),
  }).index('by_org_id', ['orgId']),

  agentWorkerHeartbeats: defineTable({
    workerId: v.string(),
    agentName: v.string(),
    status: v.union(
      v.literal('running'),
      v.literal('draining'),
      v.literal('stopped')
    ),
    activeJobs: v.optional(v.number()),
    version: v.optional(v.string()),
    lastSeenAt: v.number(),
  })
    .index('by_worker_id', ['workerId'])
    .index('by_last_seen_at', ['lastSeenAt']),
})
