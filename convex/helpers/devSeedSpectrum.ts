import { faker } from '@faker-js/faker'
import type { Id } from '../_generated/dataModel'
import type { DataModel } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

export const FAKER_SEED = 424242

export type SampleIndexEntry = {
  sessionId: string
  inviteToken: string
  candidateName: string
}

export type SampleIndex = Record<string, SampleIndexEntry>

type SessionState = DataModel['interviewSessions']['document']['state']
type InviteStatus = DataModel['candidateInvites']['document']['status']
type ReportStatus = DataModel['assessmentReports']['document']['status']
type Recommendation = 'strong_yes' | 'yes' | 'mixed' | 'no'
type Confidence = 'high' | 'medium' | 'low'

const DIMENSIONS = [
  'clarity',
  'simplification',
  'patience',
  'warmth',
  'listening',
  'fluency',
  'adaptability',
  'engagement',
  'accuracy',
] as const

const GOLDEN_DIMENSION_SCORES = {
  clarity: {
    score: 4.6,
    rationale:
      'Uses a concrete pizza model before introducing numerator and denominator language.',
  },
  simplification: {
    score: 4.4,
    rationale:
      'Breaks equivalent fractions into one visual comparison and one quick check question.',
  },
  patience: {
    score: 4.2,
    rationale:
      'Validates the misconception before correcting it, which keeps the learner engaged.',
  },
  warmth: {
    score: 4.1,
    rationale:
      'Uses encouraging language and avoids making the wrong answer feel punitive.',
  },
  listening: {
    score: 4.7,
    rationale:
      'Responds directly to the child saying that two pieces sounds larger than one.',
  },
  fluency: {
    score: 3.9,
    rationale:
      'Explains smoothly overall, with a few moments where the answer becomes longer than needed.',
  },
  adaptability: {
    score: 4.0,
    rationale:
      'Adjusts the scaffold when the child answers four sixths instead of three sixths.',
  },
  engagement: {
    score: 4.3,
    rationale:
      'Uses a familiar pizza and chocolate-bar context to keep the concept tangible.',
  },
  accuracy: {
    score: 4.5,
    rationale:
      'Mathematical explanation of one half, two quarters, and three sixths is correct.',
  },
} as const

const STRONG_TRANSCRIPT = [
  {
    speaker: 'agent' as const,
    text: 'Pretend I am a student who thinks one half is bigger than two quarters because one is larger than two. How would you help me?',
  },
  {
    speaker: 'candidate' as const,
    text: 'I would start with a picture. Imagine one pizza cut into two equal slices, then the same size pizza cut into four equal slices.',
  },
  {
    speaker: 'agent' as const,
    text: 'But two pieces still sounds like more than one piece.',
  },
  {
    speaker: 'candidate' as const,
    text: 'That is a good observation. The number of pieces alone is not enough; we also need the size of each piece.',
  },
  {
    speaker: 'agent' as const,
    text: 'Can you give me a quick check question?',
  },
  {
    speaker: 'candidate' as const,
    text: 'If I cut the same chocolate bar into six equal parts, how many sixths would cover the same amount as one half?',
  },
] as const

const WEAK_TRANSCRIPT = [
  {
    speaker: 'agent' as const,
    text: 'How would you explain why one half equals two quarters?',
  },
  {
    speaker: 'candidate' as const,
    text: 'Because they are the same, I think. You just write different numbers.',
  },
  {
    speaker: 'agent' as const,
    text: 'Can you show that with a drawing?',
  },
  {
    speaker: 'candidate' as const,
    text: 'Maybe draw two boxes. I am not totally sure how to make it clear for a child.',
  },
] as const

const BORDERLINE_TRANSCRIPT = [
  {
    speaker: 'agent' as const,
    text: 'A student says one third is bigger than one half. What do you do?',
  },
  {
    speaker: 'candidate' as const,
    text: 'I would draw two same-size bars and shade one half of the first and one third of the second.',
  },
  {
    speaker: 'agent' as const,
    text: 'What if they still disagree after the drawing?',
  },
  {
    speaker: 'candidate' as const,
    text: 'I might move on to the worksheet. I am still learning how to handle pushback calmly.',
  },
] as const

const POOR_TRANSCRIPT = [
  { speaker: 'agent' as const, text: 'Welcome. Can you hear me clearly?' },
  { speaker: 'candidate' as const, text: 'Yes.' },
  { speaker: 'agent' as const, text: 'Explain equivalent fractions.' },
  { speaker: 'candidate' as const, text: '[inaudible]' },
  {
    speaker: 'system' as const,
    text: 'Transcript quality degraded due to connection loss.',
  },
] as const

type CandidateProfile = {
  name: string
  email: string
  summary: string
  strengths: string[]
  concerns: string[]
  transcript: ReadonlyArray<{
    speaker: 'agent' | 'candidate' | 'system'
    text: string
  }>
  evidence: Array<{
    dimension: (typeof DIMENSIONS)[number]
    snippet: string
    rationale: string
  }>
  dimensionScores?: Partial<Record<(typeof DIMENSIONS)[number], number>>
}

const CANDIDATE_PROFILES: Record<string, CandidateProfile> = {
  strong: {
    name: 'Aarav Mehta',
    email: 'aarav.mehta@example.test',
    summary:
      'Aarav gives a calm, structured explanation of equivalent fractions and checks for understanding before increasing difficulty.',
    strengths: [
      'Turns abstract fraction equivalence into concrete visual steps.',
      'Checks learner understanding before moving to symbolic notation.',
    ],
    concerns: [
      'Needs tighter recovery when a child gives a partially correct answer.',
    ],
    transcript: STRONG_TRANSCRIPT,
    evidence: [
      {
        dimension: 'clarity',
        snippet:
          'I would start with a picture. Imagine one pizza cut into two equal slices...',
        rationale: 'Uses a concrete model before symbolic notation.',
      },
      {
        dimension: 'listening',
        snippet:
          'That is a good observation. The number of pieces alone is not enough...',
        rationale: 'Validates the misconception before correcting it.',
      },
    ],
  },
  weak: {
    name: 'Priya Nair',
    email: 'priya.nair@example.test',
    summary:
      'Priya struggles to translate fraction concepts into child-friendly explanations and often stops at vague statements.',
    strengths: ['Shows willingness to try a visual approach.'],
    concerns: [
      'Conceptual accuracy is shaky.',
      'Does not recover when the learner remains confused.',
    ],
    transcript: WEAK_TRANSCRIPT,
    evidence: [
      {
        dimension: 'accuracy',
        snippet:
          'Because they are the same, I think. You just write different numbers.',
        rationale: 'Does not explain why the quantities are equivalent.',
      },
    ],
    dimensionScores: {
      clarity: 2.2,
      accuracy: 1.8,
      warmth: 2.5,
      engagement: 2.0,
    },
  },
  borderline: {
    name: 'Jordan Lee',
    email: 'jordan.lee@example.test',
    summary:
      'Jordan can set up a reasonable visual but loses composure when the learner pushes back.',
    strengths: ['Starts with a sensible bar-model comparison.'],
    concerns: [
      'Avoids extended misconception repair.',
      'Pacing becomes abrupt under disagreement.',
    ],
    transcript: BORDERLINE_TRANSCRIPT,
    evidence: [
      {
        dimension: 'adaptability',
        snippet: 'I might move on to the worksheet.',
        rationale: 'Escapes the misconception instead of scaffolding further.',
      },
    ],
    dimensionScores: {
      clarity: 3.4,
      patience: 2.9,
      adaptability: 2.8,
      warmth: 3.2,
    },
  },
  poor_transcript: {
    name: 'Sam Okonkwo',
    email: 'sam.okonkwo@example.test',
    summary:
      'Session transcript is too sparse for confident automated scoring; recruiter review is required.',
    strengths: [],
    concerns: [
      'Large transcript gaps and inaudible segments.',
      'Insufficient evidence for rubric dimensions.',
    ],
    transcript: POOR_TRANSCRIPT,
    evidence: [],
    dimensionScores: {
      clarity: 2.0,
      accuracy: 2.0,
      fluency: 1.5,
    },
  },
}

type SpectrumFixture = {
  label: string
  candidateProfile?: keyof typeof CANDIDATE_PROFILES
  candidateName?: string
  candidateEmail?: string
  sessionState: SessionState
  inviteStatus: InviteStatus
  eligibilityStatus?: DataModel['candidateEligibility']['document']['status']
  reportStatus?: ReportStatus
  recommendation?: Recommendation
  confidence?: Confidence
  batchKey: 'draft' | 'active' | 'closed'
  includeTeachingEvents?: boolean
  includeScreenShare?: boolean
  recordingStatus?: 'complete' | 'failed' | 'none'
  transcriptQualityNote?: string
  hardGateTriggered?: boolean
  withReviewArtifacts?: boolean
}

const SPECTRUM_FIXTURES: SpectrumFixture[] = [
  {
    label: 'session_created',
    sessionState: 'created',
    inviteStatus: 'created',
    batchKey: 'active',
    recordingStatus: 'none',
  },
  {
    label: 'session_ready',
    sessionState: 'ready',
    inviteStatus: 'opened',
    batchKey: 'active',
    recordingStatus: 'none',
  },
  {
    label: 'session_live',
    sessionState: 'live',
    inviteStatus: 'in_progress',
    batchKey: 'active',
    recordingStatus: 'none',
  },
  {
    label: 'session_reconnecting',
    sessionState: 'reconnecting',
    inviteStatus: 'in_progress',
    batchKey: 'active',
    recordingStatus: 'none',
  },
  {
    label: 'session_interrupted',
    sessionState: 'interrupted',
    inviteStatus: 'in_progress',
    batchKey: 'active',
    recordingStatus: 'none',
  },
  {
    label: 'session_processing',
    sessionState: 'processing',
    inviteStatus: 'in_progress',
    batchKey: 'active',
    reportStatus: 'processing',
    recordingStatus: 'none',
  },
  {
    label: 'session_completed',
    sessionState: 'completed',
    inviteStatus: 'completed',
    batchKey: 'active',
    reportStatus: 'completed',
    recommendation: 'yes',
    confidence: 'high',
    withReviewArtifacts: true,
    recordingStatus: 'complete',
  },
  {
    label: 'session_failed',
    sessionState: 'failed',
    inviteStatus: 'in_progress',
    batchKey: 'active',
    reportStatus: 'failed',
    recordingStatus: 'failed',
  },
  {
    label: 'report_pending',
    sessionState: 'completed',
    inviteStatus: 'completed',
    batchKey: 'active',
    reportStatus: 'pending',
    recordingStatus: 'complete',
  },
  {
    label: 'report_processing',
    sessionState: 'processing',
    inviteStatus: 'in_progress',
    batchKey: 'active',
    reportStatus: 'processing',
    recordingStatus: 'none',
  },
  {
    label: 'report_completed',
    sessionState: 'completed',
    inviteStatus: 'completed',
    batchKey: 'active',
    reportStatus: 'completed',
    recommendation: 'yes',
    confidence: 'medium',
    withReviewArtifacts: true,
    recordingStatus: 'complete',
  },
  {
    label: 'report_failed',
    sessionState: 'failed',
    inviteStatus: 'in_progress',
    batchKey: 'active',
    reportStatus: 'failed',
    recordingStatus: 'failed',
  },
  {
    label: 'report_manual_review',
    sessionState: 'completed',
    inviteStatus: 'completed',
    batchKey: 'active',
    reportStatus: 'manual_review',
    recommendation: 'mixed',
    confidence: 'low',
    candidateProfile: 'poor_transcript',
    transcriptQualityNote:
      'Transcript coverage below 40%; multiple inaudible spans.',
    withReviewArtifacts: true,
    recordingStatus: 'complete',
  },
  {
    label: 'recommendation_strong_yes',
    sessionState: 'completed',
    inviteStatus: 'completed',
    batchKey: 'active',
    reportStatus: 'completed',
    recommendation: 'strong_yes',
    confidence: 'high',
    candidateProfile: 'strong',
    includeTeachingEvents: true,
    includeScreenShare: true,
    withReviewArtifacts: true,
    recordingStatus: 'complete',
  },
  {
    label: 'recommendation_yes',
    sessionState: 'completed',
    inviteStatus: 'completed',
    batchKey: 'active',
    reportStatus: 'completed',
    recommendation: 'yes',
    confidence: 'high',
    withReviewArtifacts: true,
    recordingStatus: 'complete',
  },
  {
    label: 'recommendation_mixed',
    sessionState: 'completed',
    inviteStatus: 'completed',
    batchKey: 'active',
    reportStatus: 'completed',
    recommendation: 'mixed',
    confidence: 'medium',
    candidateProfile: 'borderline',
    withReviewArtifacts: true,
    recordingStatus: 'complete',
  },
  {
    label: 'recommendation_no',
    sessionState: 'completed',
    inviteStatus: 'completed',
    batchKey: 'active',
    reportStatus: 'completed',
    recommendation: 'no',
    confidence: 'high',
    candidateProfile: 'weak',
    hardGateTriggered: true,
    withReviewArtifacts: true,
    recordingStatus: 'complete',
  },
  {
    label: 'confidence_high',
    sessionState: 'completed',
    inviteStatus: 'completed',
    batchKey: 'active',
    reportStatus: 'completed',
    recommendation: 'strong_yes',
    confidence: 'high',
    candidateProfile: 'strong',
    withReviewArtifacts: true,
    recordingStatus: 'complete',
  },
  {
    label: 'confidence_medium',
    sessionState: 'completed',
    inviteStatus: 'completed',
    batchKey: 'active',
    reportStatus: 'completed',
    recommendation: 'mixed',
    confidence: 'medium',
    candidateProfile: 'borderline',
    withReviewArtifacts: true,
    recordingStatus: 'complete',
  },
  {
    label: 'confidence_low',
    sessionState: 'completed',
    inviteStatus: 'completed',
    batchKey: 'active',
    reportStatus: 'manual_review',
    recommendation: 'mixed',
    confidence: 'low',
    candidateProfile: 'poor_transcript',
    transcriptQualityNote: 'Low-confidence scoring due to transcript gaps.',
    withReviewArtifacts: true,
    recordingStatus: 'complete',
  },
  {
    label: 'candidate_strong',
    sessionState: 'completed',
    inviteStatus: 'completed',
    batchKey: 'active',
    reportStatus: 'completed',
    recommendation: 'strong_yes',
    confidence: 'high',
    candidateProfile: 'strong',
    includeTeachingEvents: true,
    includeScreenShare: true,
    withReviewArtifacts: true,
    recordingStatus: 'complete',
  },
  {
    label: 'candidate_weak',
    sessionState: 'completed',
    inviteStatus: 'completed',
    batchKey: 'active',
    reportStatus: 'completed',
    recommendation: 'no',
    confidence: 'high',
    candidateProfile: 'weak',
    hardGateTriggered: true,
    withReviewArtifacts: true,
    recordingStatus: 'complete',
  },
  {
    label: 'candidate_borderline',
    sessionState: 'completed',
    inviteStatus: 'completed',
    batchKey: 'active',
    reportStatus: 'completed',
    recommendation: 'mixed',
    confidence: 'medium',
    candidateProfile: 'borderline',
    withReviewArtifacts: true,
    recordingStatus: 'complete',
  },
  {
    label: 'candidate_poor_transcript',
    sessionState: 'completed',
    inviteStatus: 'completed',
    batchKey: 'active',
    reportStatus: 'manual_review',
    recommendation: 'mixed',
    confidence: 'low',
    candidateProfile: 'poor_transcript',
    transcriptQualityNote:
      'Manual review required: transcript too sparse for reliable rubric scoring.',
    withReviewArtifacts: true,
    recordingStatus: 'complete',
  },
  {
    label: 'invite_created',
    sessionState: 'created',
    inviteStatus: 'created',
    batchKey: 'active',
    recordingStatus: 'none',
    candidateName: 'Invite Created Sample',
  },
  {
    label: 'invite_opened',
    sessionState: 'ready',
    inviteStatus: 'opened',
    batchKey: 'active',
    recordingStatus: 'none',
    candidateName: 'Invite Opened Sample',
  },
  {
    label: 'invite_in_progress',
    sessionState: 'live',
    inviteStatus: 'in_progress',
    batchKey: 'active',
    recordingStatus: 'none',
    candidateName: 'Invite In Progress Sample',
  },
  {
    label: 'invite_completed',
    sessionState: 'completed',
    inviteStatus: 'completed',
    batchKey: 'active',
    reportStatus: 'completed',
    recommendation: 'yes',
    confidence: 'medium',
    recordingStatus: 'complete',
    candidateName: 'Invite Completed Sample',
  },
  {
    label: 'invite_expired',
    sessionState: 'created',
    inviteStatus: 'expired',
    batchKey: 'closed',
    recordingStatus: 'none',
    candidateName: 'Invite Expired Sample',
  },
  {
    label: 'recording_complete',
    sessionState: 'completed',
    inviteStatus: 'completed',
    batchKey: 'active',
    reportStatus: 'completed',
    recommendation: 'yes',
    confidence: 'high',
    recordingStatus: 'complete',
    withReviewArtifacts: true,
  },
  {
    label: 'recording_failed',
    sessionState: 'failed',
    inviteStatus: 'in_progress',
    batchKey: 'active',
    reportStatus: 'failed',
    recordingStatus: 'failed',
  },
  {
    label: 'batch_draft',
    sessionState: 'created',
    inviteStatus: 'created',
    batchKey: 'draft',
    recordingStatus: 'none',
    candidateName: 'Draft Batch Candidate',
  },
  {
    label: 'batch_active',
    sessionState: 'ready',
    inviteStatus: 'opened',
    batchKey: 'active',
    recordingStatus: 'none',
    candidateName: 'Active Batch Candidate',
  },
  {
    label: 'batch_closed',
    sessionState: 'completed',
    inviteStatus: 'completed',
    batchKey: 'closed',
    reportStatus: 'completed',
    recommendation: 'mixed',
    confidence: 'medium',
    recordingStatus: 'complete',
    candidateName: 'Closed Batch Candidate',
    withReviewArtifacts: true,
  },
]

type SeedContext = {
  orgId: string
  templateId: Id<'assessmentTemplates'>
  batchIds: Record<'draft' | 'active' | 'closed', Id<'screeningBatches'>>
  recruiterIds: Array<Id<'users'>>
  adminId: Id<'users'>
  createdAtIso: string
}

function profileWeightedScore(
  _profile: CandidateProfile | undefined,
  recommendation?: Recommendation
) {
  if (recommendation === 'strong_yes') return 4.6
  if (recommendation === 'yes') return 4.1
  if (recommendation === 'mixed') return 3.2
  if (recommendation === 'no') return 2.1
  return faker.number.float({ min: 2.5, max: 4.5, fractionDigits: 2 })
}

async function seedSpectrumFixture(
  ctx: MutationCtx,
  fixture: SpectrumFixture,
  context: SeedContext,
  sampleIndex: SampleIndex,
  candidateUserId?: Id<'users'>
) {
  const profile = fixture.candidateProfile
    ? CANDIDATE_PROFILES[fixture.candidateProfile]
    : undefined
  const candidateName =
    fixture.candidateName ?? profile?.name ?? faker.person.fullName()
  const candidateEmail =
    fixture.candidateEmail ??
    profile?.email ??
    faker.internet.email().toLowerCase()
  const inviteToken = `seed-${fixture.label}-${faker.string.alphanumeric(8).toLowerCase()}`
  const batchId = context.batchIds[fixture.batchKey]
  const startedAtDate = faker.date.recent({ days: 10 })
  const endedAtDate = new Date(startedAtDate.getTime() + 16 * 60_000)
  const startedAt = startedAtDate.toISOString()
  const endedAt = endedAtDate.toISOString()
  const sessionState = fixture.sessionState
  const roomName = `room-${fixture.label}-${faker.string.alphanumeric(6).toLowerCase()}`

  const inviteId = await ctx.db.insert('candidateInvites', {
    orgId: context.orgId,
    inviteToken,
    candidateName,
    candidateEmail,
    userId: candidateUserId,
    templateId: context.templateId,
    batchId,
    status: fixture.inviteStatus,
    expiresAt:
      fixture.inviteStatus === 'expired'
        ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        : faker.date.soon({ days: 7 }).toISOString(),
  })

  const eligibilityId = await ctx.db.insert('candidateEligibility', {
    orgId: context.orgId,
    batchId,
    inviteId,
    candidateName,
    candidateEmail,
    allowedAttempts: 2,
    attemptCount:
      fixture.inviteStatus === 'completed'
        ? 1
        : fixture.inviteStatus === 'in_progress'
          ? 1
          : 0,
    status:
      fixture.eligibilityStatus ??
      (fixture.inviteStatus === 'completed'
        ? 'submitted'
        : fixture.inviteStatus === 'in_progress'
          ? 'in_progress'
          : fixture.inviteStatus === 'expired'
            ? 'expired'
            : 'invited'),
    createdAt: context.createdAtIso,
  })
  await ctx.db.patch(inviteId, { eligibilityId })

  const sessionId = await ctx.db.insert('interviewSessions', {
    orgId: context.orgId,
    inviteId,
    state: sessionState,
    provider: 'livekit',
    roomName,
    participantName: candidateName,
    participantIdentity: candidateUserId
      ? `candidate:${candidateUserId}`
      : `candidate:${fixture.label}`,
    reconnectCount: sessionState === 'reconnecting' ? 2 : 0,
    activeDurationMs:
      sessionState === 'live' || sessionState === 'reconnecting'
        ? faker.number.int({ min: 120_000, max: 480_000 })
        : faker.number.int({ min: 300_000, max: 1_200_000 }),
    lastLiveStartedAt:
      sessionState === 'live' || sessionState === 'reconnecting'
        ? faker.date.recent({ days: 1 }).toISOString()
        : startedAt,
    startedAt: sessionState === 'created' ? undefined : startedAt,
    endedAt:
      sessionState === 'live' ||
      sessionState === 'ready' ||
      sessionState === 'created' ||
      sessionState === 'reconnecting'
        ? undefined
        : endedAt,
    failureReason:
      sessionState === 'failed'
        ? 'LiveKit room disconnected before assessment could complete.'
        : undefined,
    candidateUserId,
  })

  sampleIndex[fixture.label] = {
    sessionId: `${sessionId}`,
    inviteToken,
    candidateName,
  }

  await ctx.db.insert('sessionEvents', {
    orgId: context.orgId,
    sessionId,
    type: 'session.bootstrap',
    detail: `Seeded ${fixture.label} session for ${candidateName}`,
    createdAt: startedAt,
  })

  if (fixture.includeTeachingEvents) {
    await ctx.db.insert('sessionEvents', {
      orgId: context.orgId,
      sessionId,
      type: 'teaching-simulation-started',
      detail: 'Child-persona fraction misconception simulation started.',
      createdAt: new Date(startedAtDate.getTime() + 7 * 60_000).toISOString(),
    })
    await ctx.db.insert('sessionEvents', {
      orgId: context.orgId,
      sessionId,
      type: 'teaching-simulation-completed',
      detail: 'Simulation completed with a follow-up check question.',
      createdAt: new Date(startedAtDate.getTime() + 14 * 60_000).toISOString(),
    })
  }

  if (fixture.includeScreenShare) {
    await ctx.db.insert('sessionEvents', {
      orgId: context.orgId,
      sessionId,
      type: 'candidate-screen-share-started',
      detail: 'Candidate shared a whiteboard to draw equivalent fractions.',
      createdAt: new Date(startedAtDate.getTime() + 8 * 60_000).toISOString(),
    })
  }

  if (fixture.recordingStatus && fixture.recordingStatus !== 'none') {
    const egressId = `egress_${fixture.label}_${faker.string.alphanumeric(8).toLowerCase()}`
    await ctx.db.insert('recordingArtifacts', {
      orgId: context.orgId,
      sessionId,
      provider: 'livekit',
      egressId,
      artifactKey: `${egressId}:seed-recording.mp4`,
      roomName,
      artifactType: 'composite',
      status: fixture.recordingStatus === 'complete' ? 'complete' : 'failed',
      filename: 'seed-recording.mp4',
      location:
        fixture.recordingStatus === 'complete'
          ? `s3://kyma-seed-recordings/${egressId}.mp4`
          : undefined,
      startedAt,
      endedAt: fixture.recordingStatus === 'complete' ? endedAt : undefined,
      durationMs:
        fixture.recordingStatus === 'complete'
          ? Math.max(60_000, endedAtDate.getTime() - startedAtDate.getTime())
          : undefined,
      sizeBytes:
        fixture.recordingStatus === 'complete'
          ? faker.number.int({ min: 4_000_000, max: 80_000_000 })
          : undefined,
      error:
        fixture.recordingStatus === 'failed'
          ? 'Egress worker failed to finalize composite recording.'
          : undefined,
      createdAt: startedAt,
      updatedAt: endedAt,
    })
  }

  const transcript = profile?.transcript ?? []
  const transcriptLength = transcript.length > 0 ? transcript.length : 4
  for (
    let segmentIndex = 0;
    segmentIndex < transcriptLength;
    segmentIndex += 1
  ) {
    const segment = transcript[segmentIndex]
    await ctx.db.insert('transcriptSegments', {
      sessionId,
      sourceSegmentId: faker.string.uuid(),
      speaker:
        segment?.speaker ?? (segmentIndex % 2 === 0 ? 'agent' : 'candidate'),
      text: segment?.text ?? faker.lorem.sentences({ min: 1, max: 2 }),
      status: 'final',
      startedAt: new Date(
        startedAtDate.getTime() + segmentIndex * 90_000
      ).toISOString(),
      endedAt: new Date(
        startedAtDate.getTime() + segmentIndex * 90_000 + 45_000
      ).toISOString(),
    })
  }

  if (fixture.reportStatus) {
    const reportId = await ctx.db.insert('assessmentReports', {
      orgId: context.orgId,
      sessionId,
      status: fixture.reportStatus,
      overallRecommendation: fixture.recommendation,
      confidence: fixture.confidence,
      summary: profile?.summary ?? faker.lorem.paragraph(),
      weightedScore: profileWeightedScore(profile, fixture.recommendation),
      hardGateTriggered: fixture.hardGateTriggered ?? false,
      topStrengths: profile?.strengths ?? [faker.lorem.words(3)],
      topConcerns: profile?.concerns ?? [faker.lorem.words(3)],
      transcriptQualityNote:
        fixture.transcriptQualityNote ??
        (profile?.name === 'Sam Okonkwo'
          ? 'Transcript coverage is insufficient for automated scoring.'
          : faker.lorem.sentence()),
      dimensionScores: DIMENSIONS.map((dimension) => {
        const golden = GOLDEN_DIMENSION_SCORES[dimension]
        const profileScore = profile?.dimensionScores?.[dimension]
        return {
          dimension,
          score:
            profileScore ??
            (fixture.candidateProfile === 'strong'
              ? golden.score
              : faker.number.float({ min: 1.8, max: 4.8, fractionDigits: 1 })),
          rationale:
            fixture.candidateProfile === 'strong'
              ? golden.rationale
              : faker.lorem.sentence(),
        }
      }),
      generatedAt: fixture.reportStatus === 'pending' ? undefined : endedAt,
      policySnapshot: {
        targetDurationMinutes: 18,
        allowsResume: true,
        maxAttempts: 2,
        rubricVersion: 'v3',
        templateId: `${context.templateId}`,
        templateName: 'AI Tutor Screener Default',
        interviewStyleMode: 'standard',
      },
      released:
        fixture.reportStatus === 'completed' ||
        fixture.reportStatus === 'manual_review',
    })

    const evidenceItems = profile?.evidence ?? []
    for (const [index, evidence] of evidenceItems.entries()) {
      await ctx.db.insert('dimensionEvidence', {
        orgId: context.orgId,
        reportId,
        sessionId,
        dimension: evidence.dimension,
        snippet: evidence.snippet,
        rationale: evidence.rationale,
        startedAt: new Date(
          startedAtDate.getTime() + (index + 1) * 120_000
        ).toISOString(),
        createdAt: endedAt,
      })
    }

    if (fixture.withReviewArtifacts) {
      await ctx.db.insert('reviewDecisions', {
        orgId: context.orgId,
        reportId,
        sessionId,
        decision:
          fixture.recommendation === 'no'
            ? 'reject'
            : fixture.reportStatus === 'manual_review'
              ? 'manual_review'
              : fixture.recommendation === 'mixed'
                ? 'hold'
                : 'advance',
        rationale: faker.lorem.sentence(),
        reviewerId: `user:${faker.helpers.arrayElement(context.recruiterIds)}`,
        createdAt: faker.date.recent({ days: 2 }).toISOString(),
      })

      await ctx.db.insert('recruiterNotes', {
        orgId: context.orgId,
        sessionId,
        reportId,
        authorId: `user:${faker.helpers.arrayElement(context.recruiterIds)}`,
        body: `Seeded recruiter note for ${fixture.label}.`,
        createdAt: faker.date.recent({ days: 2 }).toISOString(),
      })

      await ctx.db.insert('reportChatMessages', {
        orgId: context.orgId,
        sessionId,
        reportId,
        role: 'user',
        content: 'What should I verify before making a final decision?',
        createdAt: faker.date.recent({ days: 1 }).toISOString(),
      })

      await ctx.db.insert('reportChatMessages', {
        orgId: context.orgId,
        sessionId,
        reportId,
        role: 'assistant',
        content:
          'Focus on misconception handling and whether the candidate checks understanding before increasing difficulty.',
        createdAt: faker.date.recent({ days: 1 }).toISOString(),
        answerSource: 'model',
        modelId: 'anthropic/claude-sonnet-4.6',
        citationsJson: JSON.stringify([
          { kind: 'evidence', ref: `${fixture.label}:1`, label: fixture.label },
        ]),
        groundingVersion: 'v1',
      })
    }
  }

  return { sessionId, inviteToken, inviteId }
}

export async function seedFullSpectrumCohort(
  ctx: MutationCtx,
  context: SeedContext,
  sampleIndex: SampleIndex,
  candidateIds: Array<Id<'users'>>
) {
  for (const [index, fixture] of SPECTRUM_FIXTURES.entries()) {
    await seedSpectrumFixture(
      ctx,
      fixture,
      context,
      sampleIndex,
      candidateIds[index % candidateIds.length]
    )
  }
}

export async function seedBatches(
  ctx: MutationCtx,
  args: {
    orgId: string
    templateId: Id<'assessmentTemplates'>
    recruiterId: Id<'users'>
    createdAtIso: string
  }
) {
  const statuses = ['draft', 'active', 'closed'] as const
  const batchIds = {} as Record<
    (typeof statuses)[number],
    Id<'screeningBatches'>
  >

  for (const status of statuses) {
    const batchId = await ctx.db.insert('screeningBatches', {
      orgId: args.orgId,
      name: `Seed ${status.charAt(0).toUpperCase()}${status.slice(1)} Batch`,
      templateId: args.templateId,
      createdBy: `user:${args.recruiterId}`,
      status,
      expiresAt:
        status === 'closed'
          ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
          : faker.date.soon({ days: 14 }).toISOString(),
      allowedAttempts: 2,
      targetDurationMinutes: 18,
      allowsResume: true,
      createdAt: args.createdAtIso,
    })
    batchIds[status] = batchId
  }

  return batchIds
}

export function initDeterministicFaker() {
  faker.seed(FAKER_SEED)
}

export { DIMENSIONS, CANDIDATE_PROFILES, GOLDEN_DIMENSION_SCORES }
