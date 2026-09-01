import { faker } from '@faker-js/faker'
import type { TableNamesInDataModel } from 'convex/server'
import { ConvexError, v } from 'convex/values'

import type { DataModel } from './_generated/dataModel'
import { internalMutation } from './_generated/server'
import {
  DIMENSIONS,
  initDeterministicFaker,
  seedBatches,
  seedFullSpectrumCohort,
  type SampleIndex,
} from './helpers/devSeedSpectrum'
import { convexEnv } from '../lib/env/convex'
import {
  SEED_ORG_TABLES,
  SEED_TABLES,
  assertDevSeedAllowed,
} from './devSeedTables'

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

export const clearTableChunk = internalMutation({
  args: {
    table: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx, args) => {
    assertDevSeedAllowed(convexEnv)
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

export const clearOrgTableChunk = internalMutation({
  args: {
    table: v.string(),
    orgId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx, args) => {
    assertDevSeedAllowed(convexEnv)
    const limit = Math.max(1, Math.min(args.limit ?? 200, 1000))
    if (
      !SEED_TABLES.includes(args.table as (typeof SEED_TABLES)[number]) ||
      !(SEED_ORG_TABLES as readonly string[]).includes(args.table)
    ) {
      throw new ConvexError(
        `Table "${args.table}" is not allowed for org-scoped reset.`
      )
    }
    const table = args.table as (typeof SEED_ORG_TABLES)[number]
    const docs = await (async () => {
      switch (table) {
        case 'organizations':
          return await ctx.db
            .query('organizations')
            .withIndex('by_clerk_org_id', (q) => q.eq('clerkOrgId', args.orgId))
            .take(limit)
        case 'orgMemberships':
          return await ctx.db
            .query('orgMemberships')
            .withIndex('by_clerk_org_id', (q) => q.eq('clerkOrgId', args.orgId))
            .take(limit)
        case 'orgUsageRollups':
          return await ctx.db
            .query('orgUsageRollups')
            .withIndex('by_org_id_and_period', (q) => q.eq('orgId', args.orgId))
            .take(limit)
        case 'reportChatMessages':
          return await ctx.db
            .query('reportChatMessages')
            .withIndex('by_org_id', (q) => q.eq('orgId', args.orgId))
            .take(limit)
        case 'recruiterNotes':
          return await ctx.db
            .query('recruiterNotes')
            .withIndex('by_org_id', (q) => q.eq('orgId', args.orgId))
            .take(limit)
        case 'reviewDecisions':
          return await ctx.db
            .query('reviewDecisions')
            .withIndex('by_org_id', (q) => q.eq('orgId', args.orgId))
            .take(limit)
        case 'dimensionEvidence':
          return await ctx.db
            .query('dimensionEvidence')
            .withIndex('by_org_id', (q) => q.eq('orgId', args.orgId))
            .take(limit)
        case 'assessmentReports':
          return await ctx.db
            .query('assessmentReports')
            .withIndex('by_org_id', (q) => q.eq('orgId', args.orgId))
            .take(limit)
        case 'recordingArtifacts':
          return await ctx.db
            .query('recordingArtifacts')
            .withIndex('by_org_id', (q) => q.eq('orgId', args.orgId))
            .take(limit)
        case 'sessionEvents':
          return await ctx.db
            .query('sessionEvents')
            .withIndex('by_org_id', (q) => q.eq('orgId', args.orgId))
            .take(limit)
        case 'interviewSessions':
          return await ctx.db
            .query('interviewSessions')
            .withIndex('by_org_id', (q) => q.eq('orgId', args.orgId))
            .take(limit)
        case 'visualObservations':
          return await ctx.db
            .query('visualObservations')
            .withIndex('by_org_id', (q) => q.eq('orgId', args.orgId))
            .take(limit)
        case 'candidateEligibility':
          return await ctx.db
            .query('candidateEligibility')
            .withIndex('by_org_id', (q) => q.eq('orgId', args.orgId))
            .take(limit)
        case 'candidateInvites':
          return await ctx.db
            .query('candidateInvites')
            .withIndex('by_org_id', (q) => q.eq('orgId', args.orgId))
            .take(limit)
        case 'screeningBatches':
          return await ctx.db
            .query('screeningBatches')
            .withIndex('by_org_id', (q) => q.eq('orgId', args.orgId))
            .take(limit)
        case 'assessmentTemplateVersions':
          return await ctx.db
            .query('assessmentTemplateVersions')
            .withIndex('by_org_id', (q) => q.eq('orgId', args.orgId))
            .take(limit)
        case 'assessmentTemplates':
          return await ctx.db
            .query('assessmentTemplates')
            .withIndex('by_org_id', (q) => q.eq('orgId', args.orgId))
            .take(limit)
        case 'workspaceSettings':
          return await ctx.db
            .query('workspaceSettings')
            .withIndex('by_org_id', (q) => q.eq('orgId', args.orgId))
            .take(limit)
        case 'auditEvents':
          return await ctx.db
            .query('auditEvents')
            .withIndex('by_org_id', (q) => q.eq('orgId', args.orgId))
            .take(limit)
        default:
          table satisfies never
          throw new ConvexError('Unsupported org-scoped seed table.')
      }
    })()
    let deleted = 0
    for (const doc of docs) {
      await ctx.db.delete(doc._id)
      deleted += 1
    }
    return { deleted }
  },
})

export const seedData = internalMutation({
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
    assertDevSeedAllowed(convexEnv)
    initDeterministicFaker()
    const orgId = args.targetOrgId?.trim() || SEED_ORG_ID
    const orgName = args.targetOrgName?.trim() || SEED_ORG_NAME
    const recruiterCount = Math.max(1, Math.min(args.recruiters ?? 3, 12))
    const candidateCount = Math.max(5, Math.min(args.candidates ?? 24, 200))
    const now = Date.now()
    const createdAtIso = nowIso()
    const sampleIndex: SampleIndex = {}

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

    const batchIds = await seedBatches(ctx, {
      orgId,
      templateId,
      recruiterId: recruiterIds[0]!,
      createdAtIso,
    })
    const batchId = batchIds.active

    await seedFullSpectrumCohort(
      ctx,
      {
        orgId,
        templateId,
        batchIds,
        recruiterIds,
        adminId,
        createdAtIso,
      },
      sampleIndex,
      candidateIds
    )

    const spectrumCount = Object.keys(sampleIndex).length
    for (
      let candidateIndex = spectrumCount;
      candidateIndex < candidateCount;
      candidateIndex += 1
    ) {
      const candidateUserId =
        candidateIds[candidateIndex % candidateIds.length]!
      const candidate = await ctx.db.get('users', candidateUserId)
      const inviteToken = `seed-bulk-${faker.string.alphanumeric(18).toLowerCase()}`
      const inviteId = await ctx.db.insert('candidateInvites', {
        orgId,
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
        orgId,
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
      const state = faker.helpers.arrayElement([
        'processing',
        'completed',
        'failed',
        'live',
        'ready',
      ] as const)
      const sessionId = await ctx.db.insert('interviewSessions', {
        orgId,
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
        orgId,
        sessionId,
        type: 'session.bootstrap',
        detail: `Seeded bulk session for ${candidate?.name ?? 'candidate'}`,
        createdAt: startedAt,
      })

      if (state !== 'live' && faker.datatype.boolean()) {
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

      const transcriptLength = 6
      for (
        let segmentIndex = 0;
        segmentIndex < transcriptLength;
        segmentIndex += 1
      ) {
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
        orgId,
        sessionId,
        status: faker.helpers.arrayElement([
          'completed',
          'manual_review',
          'processing',
          'pending',
          'failed',
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
        dimensionScores: DIMENSIONS.map((dimension) => ({
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

      for (let index = 0; index < 2; index += 1) {
        await ctx.db.insert('dimensionEvidence', {
          orgId,
          reportId,
          sessionId,
          dimension: faker.helpers.arrayElement(DIMENSIONS),
          snippet: faker.lorem.sentence(),
          rationale: faker.lorem.sentence(),
          createdAt: endedAt,
        })
      }

      if (faker.datatype.boolean()) {
        await ctx.db.insert('reviewDecisions', {
          orgId,
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
        orgId,
        sessionId,
        reportId,
        authorId: `user:${faker.helpers.arrayElement(recruiterIds)}`,
        body: faker.lorem.sentences({ min: 1, max: 2 }),
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
        content: faker.lorem.sentences({ min: 2, max: 4 }),
        createdAt: faker.date.recent({ days: 1 }).toISOString(),
        answerSource: 'model',
        modelId: 'anthropic/claude-sonnet-4.6',
        citationsJson: JSON.stringify([
          { kind: 'evidence', ref: 'seed:bulk', label: 'Bulk seed evidence' },
        ]),
        groundingVersion: 'v1',
      })
    }

    for (const candidateUserId of candidateIds.slice(0, 3)) {
      await ctx.db.insert('candidateReadinessRuns', {
        candidateUserId,
        ranAt: faker.date.recent({ days: 1 }).toISOString(),
        checks: {
          browserSupported: true,
          audioInputAvailable: true,
          videoInputAvailable: true,
          networkOnline: true,
          secureContext: true,
          mediaPermissionsGranted: true,
        },
        notes: 'Seeded passing readiness run',
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

    const sampleInviteTokens = Object.values(sampleIndex).map(
      (entry) => entry.inviteToken
    )
    const sampleReviewSessionIds = Object.values(sampleIndex).map(
      (entry) => entry.sessionId
    )

    return {
      ok: true,
      orgId,
      templateId: `${templateId}`,
      batchId: `${batchId}`,
      candidates: candidateCount,
      recruiters: recruiterCount,
      sampleIndex,
      sampleInviteTokens,
      sampleReviewSessionIds,
    }
  },
})
