import { faker } from '@faker-js/faker'
import type { TableNamesInDataModel } from 'convex/server'
import { ConvexError, v } from 'convex/values'

import type { DataModel } from './_generated/dataModel'
import { mutation } from './_generated/server'

const SEED_TABLES = [
  'reportChatMessages',
  'recruiterNotes',
  'reviewDecisions',
  'dimensionEvidence',
  'assessmentReports',
  'recordingArtifacts',
  'transcriptSegments',
  'sessionEvents',
  'interviewSessions',
  'candidateReadinessRuns',
  'candidatePreferences',
  'candidateEligibility',
  'candidateInvites',
  'screeningBatches',
  'assessmentTemplateVersions',
  'assessmentTemplates',
  'orgMemberships',
  'organizations',
  'users',
  'workspaceSettings',
  'auditEvents',
] as const

type SeedTable = TableNamesInDataModel<DataModel>

function randomRecommendation() {
  return faker.helpers.arrayElement([
    'strong_yes',
    'yes',
    'mixed',
    'no',
  ] as const)
}

function randomConfidence() {
  return faker.helpers.arrayElement(['high', 'medium', 'low'] as const)
}

function nowIso() {
  return new Date().toISOString()
}

const SEED_ORG_ID = 'org_seed'
const SEED_ORG_NAME = 'Kyma Seed Academy'

const REALISTIC_CANDIDATES = [
  {
    name: 'Aarav Mehta',
    email: 'aarav.mehta@example.test',
    summary:
      'Aarav gives a calm, structured explanation of equivalent fractions and checks for understanding before increasing difficulty. He is strongest when he uses a concrete pizza model, and weaker when the learner asks about edge cases involving mixed numbers.',
    strengths: [
      'Turns abstract fraction equivalence into concrete visual steps.',
      'Checks learner understanding before moving to symbolic notation.',
    ],
    concerns: [
      'Needs tighter recovery when a child gives a partially correct answer.',
      'Occasionally over-explains instead of asking a guiding question.',
    ],
    transcript: [
      {
        speaker: 'agent' as const,
        text: 'Pretend I am a student who thinks one half is bigger than two quarters because one is larger than two. How would you help me?',
      },
      {
        speaker: 'candidate' as const,
        text: 'I would start with a picture. Imagine one pizza cut into two equal slices, then the same size pizza cut into four equal slices. If we shade one of the two slices, it covers the same amount as shading two of the four slices.',
      },
      {
        speaker: 'agent' as const,
        text: 'But two pieces still sounds like more than one piece.',
      },
      {
        speaker: 'candidate' as const,
        text: 'That is a good observation. The number of pieces alone is not enough; we also need the size of each piece. Two small equal pieces can cover the same space as one larger equal piece.',
      },
      {
        speaker: 'agent' as const,
        text: 'Can you give me a quick check question?',
      },
      {
        speaker: 'candidate' as const,
        text: 'Yes. If I cut the same chocolate bar into six equal parts, how many sixths would cover the same amount as one half? I would wait for the student to reason it out, then connect three sixths back to one half.',
      },
      {
        speaker: 'agent' as const,
        text: 'What if I answer four sixths?',
      },
      {
        speaker: 'candidate' as const,
        text: 'I would say four sixths is more than half and ask them to compare it to three sixths on the same bar. Then I would have them mark the midpoint first.',
      },
    ],
    evidence: [
      {
        dimension: 'clarity',
        snippet:
          'I would start with a picture. Imagine one pizza cut into two equal slices...',
        rationale:
          'Uses a concrete model before symbolic notation, which makes the concept inspectable for a child.',
      },
      {
        dimension: 'listening',
        snippet:
          'That is a good observation. The number of pieces alone is not enough...',
        rationale: 'Validates the child misconception before correcting it.',
      },
      {
        dimension: 'adaptability',
        snippet:
          'I would say four sixths is more than half and ask them to compare it to three sixths...',
        rationale:
          'Responds to a wrong answer with a scaffold rather than simply giving the answer.',
      },
    ],
  },
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

export const clearTableChunk = mutation({
  args: {
    table: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 200, 1000))
    if (!SEED_TABLES.includes(args.table as (typeof SEED_TABLES)[number])) {
      throw new ConvexError(`Table "${args.table}" is not allowed for reset.`)
    }
    const table = args.table as SeedTable
    const docs = await ctx.db.query(table).take(limit)
    for (const doc of docs) {
      await ctx.db.delete(doc._id)
    }
    return { deleted: docs.length }
  },
})

export const seedData = mutation({
  args: {
    candidates: v.optional(v.number()),
    recruiters: v.optional(v.number()),
    targetOrgId: v.optional(v.string()),
    targetOrgName: v.optional(v.string()),
    ownerClerkUserId: v.optional(v.string()),
    ownerEmail: v.optional(v.string()),
    ownerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = args.targetOrgId?.trim() || SEED_ORG_ID
    const orgName = args.targetOrgName?.trim() || SEED_ORG_NAME
    const recruiterCount = Math.max(1, Math.min(args.recruiters ?? 3, 12))
    const candidateCount = Math.max(5, Math.min(args.candidates ?? 24, 200))
    const now = Date.now()
    const createdAtIso = nowIso()
    const sampleInviteTokens: string[] = []
    const sampleReviewSessionIds: string[] = []

    await ctx.db.insert('organizations', {
      clerkOrgId: orgId,
      name: orgName,
      slug: 'kyma-seed-academy',
      createdAt: now,
      updatedAt: now,
    })

    const adminClerkId =
      args.ownerClerkUserId?.trim() ||
      `clerk_admin_${faker.string.alphanumeric(10)}`
    const adminId = await ctx.db.insert('users', {
      clerkId: adminClerkId,
      email:
        args.ownerEmail?.trim() ||
        `admin+${faker.string.alphanumeric(6).toLowerCase()}@kyma.local`,
      name: args.ownerName?.trim() || faker.person.fullName(),
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert('orgMemberships', {
      clerkMembershipId: `seed_membership_admin_${faker.string.alphanumeric(8)}`,
      clerkOrgId: orgId,
      clerkUserId: adminClerkId,
      role: 'org:admin',
      permissions: ['org:recruiter:access'],
      createdAt: now,
      updatedAt: now,
    })

    const recruiterIds: Array<DataModel['users']['document']['_id']> = []
    for (let index = 0; index < recruiterCount; index += 1) {
      const recruiterClerkId = `clerk_recruiter_${faker.string.alphanumeric(10)}`
      const recruiterId = await ctx.db.insert('users', {
        clerkId: recruiterClerkId,
        email: `recruiter${index + 1}@kyma.local`,
        name: faker.person.fullName(),
        role: 'recruiter',
        createdAt: now,
        updatedAt: now,
      })
      recruiterIds.push(recruiterId)
      await ctx.db.insert('orgMemberships', {
        clerkMembershipId: `seed_membership_recruiter_${index}_${faker.string.alphanumeric(8)}`,
        clerkOrgId: orgId,
        clerkUserId: recruiterClerkId,
        role: 'org:member',
        permissions: ['org:recruiter:access'],
        createdAt: now,
        updatedAt: now,
      })
    }

    const candidateIds: Array<DataModel['users']['document']['_id']> = []
    for (let index = 0; index < candidateCount; index += 1) {
      const candidateClerkId = `clerk_candidate_${faker.string.alphanumeric(10)}`
      const candidateId = await ctx.db.insert('users', {
        clerkId: candidateClerkId,
        email: `candidate${index + 1}@kyma.local`,
        name: faker.person.fullName(),
        role: 'candidate',
        createdAt: now,
        updatedAt: now,
      })
      candidateIds.push(candidateId)
    }

    const templateId = await ctx.db.insert('assessmentTemplates', {
      orgId,
      name: 'AI Tutor Screener Default',
      role: 'tutor',
      status: 'active',
      createdBy: `user:${adminId}`,
      rubricVersion: 'v3',
      targetDurationMinutes: 18,
      allowsResume: true,
      interviewStyleMode: 'standard',
      systemPrompt: 'Assess candidate teaching quality with grounded evidence.',
      childPersonaPrompt:
        'Simulate a curious child asking follow-up questions.',
      wrapUpPrompt: 'Wrap up politely and summarize candidate performance.',
      rubricConfig: {
        dimensions: [
          {
            name: 'clarity',
            weight: 0.2,
            isHardGate: false,
            keywords: ['clear', 'simple'],
          },
          {
            name: 'accuracy',
            weight: 0.25,
            isHardGate: true,
            keywords: ['correct', 'concept'],
          },
          {
            name: 'warmth',
            weight: 0.15,
            isHardGate: false,
            keywords: ['supportive', 'calm'],
          },
        ],
      },
      modelOverrides: {
        llm: 'openai/gpt-4.1-mini',
        stt: 'deepgram/nova-3',
        tts: 'cartesia/sonic',
        reviewChat: 'anthropic/claude-sonnet-4.6',
      },
    })

    await ctx.db.insert('assessmentTemplateVersions', {
      orgId,
      templateId,
      rubricVersion: 'v3',
      savedAt: now,
      savedBy: `user:${adminId}`,
      systemPrompt: 'Assess candidate teaching quality with grounded evidence.',
      childPersonaPrompt:
        'Simulate a curious child asking follow-up questions.',
      wrapUpPrompt: 'Wrap up politely and summarize candidate performance.',
      rubricConfig: {
        dimensions: [
          {
            name: 'clarity',
            weight: 0.2,
            isHardGate: false,
            keywords: ['clear', 'simple'],
          },
          {
            name: 'accuracy',
            weight: 0.25,
            isHardGate: true,
            keywords: ['correct', 'concept'],
          },
          {
            name: 'warmth',
            weight: 0.15,
            isHardGate: false,
            keywords: ['supportive', 'calm'],
          },
        ],
      },
      modelOverrides: {
        llm: 'openai/gpt-4.1-mini',
        stt: 'deepgram/nova-3',
        tts: 'cartesia/sonic',
        reviewChat: 'anthropic/claude-sonnet-4.6',
      },
    })

    const batchId = await ctx.db.insert('screeningBatches', {
      orgId,
      name: `Seed Batch ${faker.date.recent({ days: 2 }).toISOString().slice(0, 10)}`,
      templateId,
      createdBy: `user:${recruiterIds[0]}`,
      status: 'active',
      expiresAt: faker.date.soon({ days: 14 }).toISOString(),
      allowedAttempts: 2,
      targetDurationMinutes: 18,
      allowsResume: true,
      createdAt: createdAtIso,
    })

    const openInviteToken = `seed-open-${faker.string.alphanumeric(14).toLowerCase()}`
    const openInviteId = await ctx.db.insert('candidateInvites', {
      orgId,
      inviteToken: openInviteToken,
      candidateName: 'Nisha Rao',
      candidateEmail: 'nisha.rao@example.test',
      templateId,
      batchId,
      status: 'created',
      expiresAt: faker.date.soon({ days: 7 }).toISOString(),
    })
    const openEligibilityId = await ctx.db.insert('candidateEligibility', {
      orgId,
      batchId,
      inviteId: openInviteId,
      candidateName: 'Nisha Rao',
      candidateEmail: 'nisha.rao@example.test',
      allowedAttempts: 2,
      attemptCount: 0,
      status: 'invited',
      createdAt: createdAtIso,
    })
    await ctx.db.patch(openInviteId, { eligibilityId: openEligibilityId })
    sampleInviteTokens.push(openInviteToken)

    const dimensions = [
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

    for (const [candidateIndex, candidateUserId] of candidateIds.entries()) {
      const candidate = await ctx.db.get(candidateUserId)
      const realisticCandidate = REALISTIC_CANDIDATES[candidateIndex]
      const inviteToken = `seed-${faker.string.alphanumeric(18).toLowerCase()}`
      if (sampleInviteTokens.length < 5) {
        sampleInviteTokens.push(inviteToken)
      }
      const inviteId = await ctx.db.insert('candidateInvites', {
        orgId,
        inviteToken,
        candidateName: realisticCandidate?.name ?? candidate?.name,
        candidateEmail: realisticCandidate?.email ?? candidate?.email,
        userId: candidateUserId,
        templateId,
        batchId,
        status:
          candidateIndex === 0
            ? 'completed'
            : faker.helpers.arrayElement([
                'created',
                'opened',
                'in_progress',
                'completed',
              ] as const),
        expiresAt: faker.date.soon({ days: 7 }).toISOString(),
      })

      const eligibilityId = await ctx.db.insert('candidateEligibility', {
        orgId,
        batchId,
        inviteId,
        candidateName:
          realisticCandidate?.name ??
          candidate?.name ??
          faker.person.fullName(),
        candidateEmail: realisticCandidate?.email ?? candidate?.email,
        allowedAttempts: 2,
        attemptCount: faker.number.int({ min: 0, max: 1 }),
        status:
          candidateIndex === 0
            ? 'submitted'
            : faker.helpers.arrayElement([
                'invited',
                'in_progress',
                'submitted',
              ] as const),
        createdAt: createdAtIso,
      })

      await ctx.db.patch(inviteId, { eligibilityId })

      const startedAtDate = faker.date.recent({ days: 10 })
      const nowDate = new Date()
      const endedAtDate =
        startedAtDate >= nowDate
          ? new Date(startedAtDate.getTime() + 5 * 60 * 1000)
          : faker.date.between({
              from: startedAtDate,
              to: nowDate,
            })
      const startedAt = startedAtDate.toISOString()
      const endedAt = endedAtDate.toISOString()
      const state =
        candidateIndex === 0
          ? 'completed'
          : faker.helpers.arrayElement([
              'processing',
              'completed',
              'failed',
              'live',
            ] as const)
      const sessionId = await ctx.db.insert('interviewSessions', {
        orgId,
        inviteId,
        state,
        provider: 'livekit',
        roomName: `room-${faker.string.alphanumeric(12).toLowerCase()}`,
        participantName: realisticCandidate?.name ?? candidate?.name,
        participantIdentity: `candidate:${candidateUserId}`,
        reconnectCount: faker.number.int({ min: 0, max: 2 }),
        activeDurationMs: faker.number.int({
          min: 3 * 60_000,
          max: 22 * 60_000,
        }),
        lastLiveStartedAt:
          state === 'live'
            ? faker.date.recent({ days: 1 }).toISOString()
            : undefined,
        startedAt,
        endedAt: state === 'live' ? undefined : endedAt,
        failureReason: state === 'failed' ? faker.lorem.sentence() : undefined,
        candidateUserId,
      })
      if (sampleReviewSessionIds.length < 5) {
        sampleReviewSessionIds.push(`${sessionId}`)
      }

      await ctx.db.insert('sessionEvents', {
        orgId,
        sessionId,
        type: 'session.bootstrap',
        detail: `Seeded session for ${realisticCandidate?.name ?? candidate?.name ?? 'candidate'}`,
        createdAt: startedAt,
      })

      if (candidateIndex === 0) {
        await ctx.db.insert('sessionEvents', {
          orgId,
          sessionId,
          type: 'teaching-simulation-started',
          detail: 'Child-persona fraction misconception simulation started.',
          createdAt: new Date(
            startedAtDate.getTime() + 7 * 60_000
          ).toISOString(),
        })
        await ctx.db.insert('sessionEvents', {
          orgId,
          sessionId,
          type: 'candidate-screen-share-started',
          detail: 'Candidate shared a whiteboard to draw equivalent fractions.',
          createdAt: new Date(
            startedAtDate.getTime() + 8 * 60_000
          ).toISOString(),
        })
        await ctx.db.insert('sessionEvents', {
          orgId,
          sessionId,
          type: 'teaching-simulation-completed',
          detail: 'Simulation completed with a follow-up check question.',
          createdAt: new Date(
            startedAtDate.getTime() + 14 * 60_000
          ).toISOString(),
        })
      }

      if (
        state !== 'live' &&
        (candidateIndex === 0 || faker.datatype.boolean())
      ) {
        const egressId = `egress_${faker.string.alphanumeric(12).toLowerCase()}`
        await ctx.db.insert('recordingArtifacts', {
          orgId,
          sessionId,
          provider: 'livekit',
          egressId,
          artifactKey: `${egressId}:seed-recording.mp4`,
          roomName: `room-${faker.string.alphanumeric(12).toLowerCase()}`,
          artifactType: 'composite',
          status: 'complete',
          filename: 'seed-recording.mp4',
          location: `s3://kyma-seed-recordings/${egressId}.mp4`,
          startedAt,
          endedAt,
          durationMs: Math.max(
            60_000,
            endedAtDate.getTime() - startedAtDate.getTime()
          ),
          sizeBytes: faker.number.int({ min: 4_000_000, max: 80_000_000 }),
          createdAt: startedAt,
          updatedAt: endedAt,
        })
      }

      const transcript = realisticCandidate?.transcript
      const transcriptLength = transcript?.length ?? 8
      for (
        let segmentIndex = 0;
        segmentIndex < transcriptLength;
        segmentIndex += 1
      ) {
        const segment = transcript?.[segmentIndex]
        await ctx.db.insert('transcriptSegments', {
          sessionId,
          sourceSegmentId: faker.string.uuid(),
          speaker:
            segment?.speaker ??
            (segmentIndex % 2 === 0 ? 'agent' : 'candidate'),
          text: segment?.text ?? faker.lorem.sentences({ min: 1, max: 3 }),
          status: 'final',
          startedAt:
            candidateIndex === 0
              ? new Date(
                  startedAtDate.getTime() + segmentIndex * 90_000
                ).toISOString()
              : faker.date
                  .between({ from: new Date(startedAt), to: new Date(endedAt) })
                  .toISOString(),
          endedAt:
            candidateIndex === 0
              ? new Date(
                  startedAtDate.getTime() + segmentIndex * 90_000 + 45_000
                ).toISOString()
              : faker.date
                  .between({ from: new Date(startedAt), to: new Date(endedAt) })
                  .toISOString(),
        })
      }

      const recommendation =
        candidateIndex === 0 ? 'yes' : randomRecommendation()
      const confidence = candidateIndex === 0 ? 'high' : randomConfidence()
      const reportId = await ctx.db.insert('assessmentReports', {
        orgId,
        sessionId,
        status:
          candidateIndex === 0
            ? 'completed'
            : faker.helpers.arrayElement([
                'completed',
                'manual_review',
                'processing',
              ] as const),
        overallRecommendation: recommendation,
        confidence,
        summary: realisticCandidate?.summary ?? faker.lorem.paragraph(),
        weightedScore:
          candidateIndex === 0
            ? 4.3
            : faker.number.float({
                min: 2.1,
                max: 4.9,
                fractionDigits: 2,
              }),
        hardGateTriggered:
          candidateIndex === 0 ? false : faker.datatype.boolean(),
        topStrengths: realisticCandidate?.strengths
          ? [...realisticCandidate.strengths]
          : [faker.lorem.words(2), faker.lorem.words(2)],
        topConcerns: realisticCandidate?.concerns
          ? [...realisticCandidate.concerns]
          : [faker.lorem.words(2), faker.lorem.words(2)],
        transcriptQualityNote:
          candidateIndex === 0
            ? 'Transcript is complete enough for review; whiteboard detail is summarized from session events.'
            : faker.lorem.sentence(),
        dimensionScores: dimensions.map((dimension) => {
          const goldenScore = GOLDEN_DIMENSION_SCORES[dimension]
          return {
            dimension,
            score:
              candidateIndex === 0
                ? goldenScore.score
                : faker.number.float({ min: 2, max: 5, fractionDigits: 1 }),
            rationale:
              candidateIndex === 0
                ? goldenScore.rationale
                : faker.lorem.sentence(),
          }
        }),
        generatedAt: endedAt,
        policySnapshot: {
          targetDurationMinutes: 18,
          allowsResume: true,
          maxAttempts: 2,
          rubricVersion: 'v3',
          templateId: `${templateId}`,
          templateName: 'AI Tutor Screener Default',
          interviewStyleMode: 'standard',
        },
        released: candidateIndex === 0 ? true : faker.datatype.boolean(),
      })

      const evidenceItems = realisticCandidate?.evidence
      const evidenceLength = evidenceItems?.length ?? 3
      for (let index = 0; index < evidenceLength; index += 1) {
        const evidence = evidenceItems?.[index]
        await ctx.db.insert('dimensionEvidence', {
          orgId,
          reportId,
          sessionId,
          dimension:
            evidence?.dimension ?? faker.helpers.arrayElement(dimensions),
          snippet: evidence?.snippet ?? faker.lorem.sentence(),
          rationale: evidence?.rationale ?? faker.lorem.sentence(),
          startedAt:
            candidateIndex === 0
              ? new Date(
                  startedAtDate.getTime() + (index + 1) * 120_000
                ).toISOString()
              : faker.date
                  .between({ from: new Date(startedAt), to: new Date(endedAt) })
                  .toISOString(),
          endedAt:
            candidateIndex === 0
              ? new Date(
                  startedAtDate.getTime() + (index + 1) * 120_000 + 60_000
                ).toISOString()
              : faker.date
                  .between({ from: new Date(startedAt), to: new Date(endedAt) })
                  .toISOString(),
          createdAt: endedAt,
        })
      }

      if (candidateIndex === 0 || faker.datatype.boolean()) {
        await ctx.db.insert('reviewDecisions', {
          orgId,
          reportId,
          sessionId,
          decision:
            candidateIndex === 0
              ? 'advance'
              : faker.helpers.arrayElement([
                  'advance',
                  'reject',
                  'manual_review',
                  'hold',
                ] as const),
          rationale:
            candidateIndex === 0
              ? 'Advance to live panel: strong conceptual explanation and calm misconception handling.'
              : faker.lorem.sentence(),
          reviewerId: `user:${faker.helpers.arrayElement(recruiterIds)}`,
          createdAt: faker.date.recent({ days: 2 }).toISOString(),
        })
      }

      await ctx.db.insert('recruiterNotes', {
        orgId,
        sessionId,
        reportId,
        authorId: `user:${faker.helpers.arrayElement(recruiterIds)}`,
        body:
          candidateIndex === 0
            ? 'Strong demo candidate. Follow up in panel on handling a quiet student and shortening explanations under time pressure.'
            : faker.lorem.sentences({ min: 1, max: 2 }),
        createdAt: faker.date.recent({ days: 2 }).toISOString(),
      })

      await ctx.db.insert('reportChatMessages', {
        orgId,
        sessionId,
        reportId,
        role: 'user',
        content: 'Summarize top risks before final decision.',
        createdAt: faker.date.recent({ days: 1 }).toISOString(),
      })

      await ctx.db.insert('reportChatMessages', {
        orgId,
        sessionId,
        reportId,
        role: 'assistant',
        content:
          candidateIndex === 0
            ? 'Top risk is not mathematical accuracy; it is pacing. Aarav explains clearly but should ask one more diagnostic question before giving the full correction.'
            : faker.lorem.sentences({ min: 2, max: 4 }),
        createdAt: faker.date.recent({ days: 1 }).toISOString(),
        answerSource: 'model',
        modelId: 'anthropic/claude-sonnet-4.6',
        citationsJson: JSON.stringify([
          { kind: 'evidence', ref: 'seed:1', label: 'Seeded evidence' },
        ]),
        groundingVersion: 'v1',
      })
    }

    await ctx.db.insert('workspaceSettings', {
      orgId,
      defaultModels: {
        stt: 'deepgram/nova-3',
        llm: 'openai/gpt-4.1-mini',
        tts: 'cartesia/sonic',
        reviewChat: 'anthropic/claude-sonnet-4.6',
      },
      updatedAt: now,
      updatedBy: `user:${adminId}`,
    })

    await ctx.db.insert('auditEvents', {
      orgId,
      actorId: `user:${adminId}`,
      action: 'seed.dev.completed',
      resource: 'workspace:dev',
      metadataJson: JSON.stringify({
        candidates: candidateCount,
        recruiters: recruiterCount,
      }),
      createdAt: nowIso(),
    })

    return {
      ok: true,
      orgId,
      templateId: `${templateId}`,
      batchId: `${batchId}`,
      candidates: candidateCount,
      recruiters: recruiterCount,
      sampleInviteTokens,
      sampleReviewSessionIds,
    }
  },
})
