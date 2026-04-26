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
  'candidateEligibility',
  'candidateInvites',
  'screeningBatches',
  'assessmentTemplateVersions',
  'assessmentTemplates',
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
  },
  handler: async (ctx, args) => {
    const recruiterCount = Math.max(1, Math.min(args.recruiters ?? 3, 12))
    const candidateCount = Math.max(5, Math.min(args.candidates ?? 24, 200))
    const now = Date.now()
    const createdAtIso = nowIso()

    const adminId = await ctx.db.insert('users', {
      clerkId: `clerk_admin_${faker.string.alphanumeric(10)}`,
      email: `admin+${faker.string.alphanumeric(6).toLowerCase()}@kyma.local`,
      name: faker.person.fullName(),
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    })

    const recruiterIds: Array<DataModel['users']['document']['_id']> = []
    for (let index = 0; index < recruiterCount; index += 1) {
      const recruiterId = await ctx.db.insert('users', {
        clerkId: `clerk_recruiter_${faker.string.alphanumeric(10)}`,
        email: `recruiter${index + 1}@kyma.local`,
        name: faker.person.fullName(),
        role: 'recruiter',
        createdAt: now,
        updatedAt: now,
      })
      recruiterIds.push(recruiterId)
    }

    const candidateIds: Array<DataModel['users']['document']['_id']> = []
    for (let index = 0; index < candidateCount; index += 1) {
      const candidateId = await ctx.db.insert('users', {
        clerkId: `clerk_candidate_${faker.string.alphanumeric(10)}`,
        email: `candidate${index + 1}@kyma.local`,
        name: faker.person.fullName(),
        role: 'candidate',
        createdAt: now,
        updatedAt: now,
      })
      candidateIds.push(candidateId)
    }

    const templateId = await ctx.db.insert('assessmentTemplates', {
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

    for (const candidateUserId of candidateIds) {
      const candidate = await ctx.db.get(candidateUserId)
      const inviteToken = `seed-${faker.string.alphanumeric(18).toLowerCase()}`
      const inviteId = await ctx.db.insert('candidateInvites', {
        inviteToken,
        candidateName: candidate?.name,
        candidateEmail: candidate?.email,
        userId: candidateUserId,
        templateId,
        batchId,
        status: faker.helpers.arrayElement([
          'created',
          'opened',
          'in_progress',
          'completed',
        ] as const),
        expiresAt: faker.date.soon({ days: 7 }).toISOString(),
      })

      const eligibilityId = await ctx.db.insert('candidateEligibility', {
        batchId,
        inviteId,
        candidateName: candidate?.name ?? faker.person.fullName(),
        candidateEmail: candidate?.email,
        allowedAttempts: 2,
        attemptCount: faker.number.int({ min: 0, max: 1 }),
        status: faker.helpers.arrayElement([
          'invited',
          'in_progress',
          'submitted',
        ] as const),
        createdAt: createdAtIso,
      })

      await ctx.db.patch(inviteId, { eligibilityId })

      const startedAt = faker.date.recent({ days: 10 }).toISOString()
      const endedAt = faker.date
        .between({
          from: new Date(startedAt),
          to: faker.date.recent({ days: 1 }),
        })
        .toISOString()
      const state = faker.helpers.arrayElement([
        'processing',
        'completed',
        'failed',
        'live',
      ] as const)
      const sessionId = await ctx.db.insert('interviewSessions', {
        inviteId,
        state,
        provider: 'livekit',
        roomName: `room-${faker.string.alphanumeric(12).toLowerCase()}`,
        participantName: candidate?.name,
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

      await ctx.db.insert('sessionEvents', {
        sessionId,
        type: 'session.bootstrap',
        detail: `Seeded session for ${candidate?.name ?? 'candidate'}`,
        createdAt: startedAt,
      })

      for (let segmentIndex = 0; segmentIndex < 8; segmentIndex += 1) {
        await ctx.db.insert('transcriptSegments', {
          sessionId,
          sourceSegmentId: faker.string.uuid(),
          speaker: segmentIndex % 2 === 0 ? 'agent' : 'candidate',
          text: faker.lorem.sentences({ min: 1, max: 3 }),
          status: 'final',
          startedAt: faker.date
            .between({ from: new Date(startedAt), to: new Date(endedAt) })
            .toISOString(),
          endedAt: faker.date
            .between({ from: new Date(startedAt), to: new Date(endedAt) })
            .toISOString(),
        })
      }

      const recommendation = randomRecommendation()
      const confidence = randomConfidence()
      const reportId = await ctx.db.insert('assessmentReports', {
        sessionId,
        status: faker.helpers.arrayElement([
          'completed',
          'manual_review',
          'processing',
        ] as const),
        overallRecommendation: recommendation,
        confidence,
        summary: faker.lorem.paragraph(),
        weightedScore: faker.number.float({
          min: 2.1,
          max: 4.9,
          fractionDigits: 2,
        }),
        hardGateTriggered: faker.datatype.boolean(),
        topStrengths: [faker.lorem.words(2), faker.lorem.words(2)],
        topConcerns: [faker.lorem.words(2), faker.lorem.words(2)],
        transcriptQualityNote: faker.lorem.sentence(),
        dimensionScores: dimensions.map((dimension) => ({
          dimension,
          score: faker.number.float({ min: 2, max: 5, fractionDigits: 1 }),
          rationale: faker.lorem.sentence(),
        })),
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
        released: faker.datatype.boolean(),
      })

      for (let index = 0; index < 3; index += 1) {
        await ctx.db.insert('dimensionEvidence', {
          reportId,
          sessionId,
          dimension: faker.helpers.arrayElement(dimensions),
          snippet: faker.lorem.sentence(),
          rationale: faker.lorem.sentence(),
          startedAt: faker.date
            .between({ from: new Date(startedAt), to: new Date(endedAt) })
            .toISOString(),
          endedAt: faker.date
            .between({ from: new Date(startedAt), to: new Date(endedAt) })
            .toISOString(),
          createdAt: endedAt,
        })
      }

      if (faker.datatype.boolean()) {
        await ctx.db.insert('reviewDecisions', {
          reportId,
          sessionId,
          decision: faker.helpers.arrayElement([
            'advance',
            'reject',
            'manual_review',
            'hold',
          ] as const),
          rationale: faker.lorem.sentence(),
          reviewerId: `user:${faker.helpers.arrayElement(recruiterIds)}`,
          createdAt: faker.date.recent({ days: 2 }).toISOString(),
        })
      }

      await ctx.db.insert('recruiterNotes', {
        sessionId,
        reportId,
        authorId: `user:${faker.helpers.arrayElement(recruiterIds)}`,
        body: faker.lorem.sentences({ min: 1, max: 2 }),
        createdAt: faker.date.recent({ days: 2 }).toISOString(),
      })

      await ctx.db.insert('reportChatMessages', {
        sessionId,
        reportId,
        role: 'user',
        content: 'Summarize top risks before final decision.',
        createdAt: faker.date.recent({ days: 1 }).toISOString(),
      })

      await ctx.db.insert('reportChatMessages', {
        sessionId,
        reportId,
        role: 'assistant',
        content: faker.lorem.sentences({ min: 2, max: 4 }),
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
      candidates: candidateCount,
      recruiters: recruiterCount,
    }
  },
})
