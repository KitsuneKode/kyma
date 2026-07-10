// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'

import schema from '../schema'
import {
  DEFAULT_INTERVIEW_DURATION_MINUTES,
  resolveInterviewPolicyFromInvite,
} from './interviewPolicy'

const modules = import.meta.glob('../**/*.ts')

function harness() {
  return convexTest(schema, modules)
}

describe('resolveInterviewPolicyFromInvite', () => {
  test('uses defaults when template and batch omit policy fields', async () => {
    const t = harness()

    const inviteId = await t.run(async (ctx) => {
      const templateId = await ctx.db.insert('assessmentTemplates', {
        orgId: 'org_policy',
        name: 'Bare template',
        role: 'engineer',
        status: 'active',
        createdBy: 'seed',
        rubricVersion: 'v1',
      })

      return await ctx.db.insert('candidateInvites', {
        orgId: 'org_policy',
        templateId,
        inviteToken: 'invite-defaults',
        candidateName: 'Alex',
        candidateEmail: 'alex@example.com',
        status: 'created',
        expiresAt: '2026-08-01T00:00:00.000Z',
      })
    })

    const result = await t.run(async (ctx) => {
      const invite = await ctx.db.get(inviteId)
      if (!invite) throw new Error('invite missing')
      return resolveInterviewPolicyFromInvite(ctx, invite)
    })

    expect(result.policy).toMatchObject({
      durationMode: 'timed',
      targetDurationMinutes: DEFAULT_INTERVIEW_DURATION_MINUTES,
      allowsResume: true,
      maxAttempts: 1,
      rubricVersion: 'v1',
      interviewStyleMode: 'standard',
      templateName: 'Bare template',
      expiresAt: '2026-08-01T00:00:00.000Z',
    })
    expect(result.snapshot).toMatchObject({
      targetDurationMinutes: DEFAULT_INTERVIEW_DURATION_MINUTES,
      allowsResume: true,
      maxAttempts: 1,
      rubricVersion: 'v1',
      interviewStyleMode: 'standard',
      templateName: 'Bare template',
    })
    expect(result.snapshot.templateId).toBeTruthy()
  })

  test('inherits duration, resume, style, and rubric from template', async () => {
    const t = harness()

    const inviteId = await t.run(async (ctx) => {
      const templateId = await ctx.db.insert('assessmentTemplates', {
        orgId: 'org_policy',
        name: 'Template policy',
        role: 'engineer',
        status: 'active',
        createdBy: 'seed',
        rubricVersion: 'v3',
        targetDurationMinutes: 25,
        allowsResume: false,
        interviewStyleMode: 'intensive',
      })

      return await ctx.db.insert('candidateInvites', {
        orgId: 'org_policy',
        templateId,
        inviteToken: 'invite-template',
        candidateName: 'Blair',
        candidateEmail: 'blair@example.com',
        status: 'created',
        expiresAt: '2026-08-01T00:00:00.000Z',
      })
    })

    const result = await t.run(async (ctx) => {
      const invite = await ctx.db.get(inviteId)
      if (!invite) throw new Error('invite missing')
      return resolveInterviewPolicyFromInvite(ctx, invite)
    })

    expect(result.policy.targetDurationMinutes).toBe(25)
    expect(result.policy.allowsResume).toBe(false)
    expect(result.policy.maxAttempts).toBe(1)
    expect(result.policy.rubricVersion).toBe('v3')
    expect(result.policy.interviewStyleMode).toBe('intensive')
    expect(result.snapshot.targetDurationMinutes).toBe(25)
    expect(result.snapshot.allowsResume).toBe(false)
    expect(result.snapshot.rubricVersion).toBe('v3')
    expect(result.snapshot.interviewStyleMode).toBe('intensive')
  })

  test('batch overrides template for duration and resume; eligibility overrides attempts', async () => {
    const t = harness()

    const inviteId = await t.run(async (ctx) => {
      const templateId = await ctx.db.insert('assessmentTemplates', {
        orgId: 'org_policy',
        name: 'Overridable template',
        role: 'engineer',
        status: 'active',
        createdBy: 'seed',
        rubricVersion: 'v2',
        targetDurationMinutes: 20,
        allowsResume: true,
        interviewStyleMode: 'standard',
      })

      const batchId = await ctx.db.insert('screeningBatches', {
        orgId: 'org_policy',
        name: 'Override batch',
        templateId,
        status: 'active',
        createdBy: 'seed',
        createdAt: new Date().toISOString(),
        allowedAttempts: 2,
        targetDurationMinutes: 30,
        allowsResume: false,
      })

      const invite = await ctx.db.insert('candidateInvites', {
        orgId: 'org_policy',
        templateId,
        batchId,
        inviteToken: 'invite-batch',
        candidateName: 'Casey',
        candidateEmail: 'casey@example.com',
        status: 'created',
        expiresAt: '2026-08-01T00:00:00.000Z',
      })

      const eligibilityId = await ctx.db.insert('candidateEligibility', {
        orgId: 'org_policy',
        batchId,
        inviteId: invite,
        candidateName: 'Casey',
        candidateEmail: 'casey@example.com',
        allowedAttempts: 3,
        attemptCount: 0,
        status: 'invited',
        createdAt: new Date().toISOString(),
      })

      await ctx.db.patch(invite, { eligibilityId })
      return invite
    })

    const result = await t.run(async (ctx) => {
      const invite = await ctx.db.get(inviteId)
      if (!invite) throw new Error('invite missing')
      return resolveInterviewPolicyFromInvite(ctx, invite)
    })

    expect(result.policy.targetDurationMinutes).toBe(30)
    expect(result.policy.allowsResume).toBe(false)
    expect(result.policy.maxAttempts).toBe(3)
    expect(result.policy.rubricVersion).toBe('v2')
    expect(result.policy.interviewStyleMode).toBe('standard')
    expect(result.snapshot.maxAttempts).toBe(3)
    expect(result.snapshot.targetDurationMinutes).toBe(30)
    expect(result.snapshot.allowsResume).toBe(false)
  })

  test('falls back to batch allowedAttempts when eligibility is absent', async () => {
    const t = harness()

    const inviteId = await t.run(async (ctx) => {
      const templateId = await ctx.db.insert('assessmentTemplates', {
        orgId: 'org_policy',
        name: 'Batch attempts template',
        role: 'engineer',
        status: 'active',
        createdBy: 'seed',
        rubricVersion: 'v1',
        targetDurationMinutes: 18,
        allowsResume: true,
      })

      const batchId = await ctx.db.insert('screeningBatches', {
        orgId: 'org_policy',
        name: 'Attempts batch',
        templateId,
        status: 'active',
        createdBy: 'seed',
        createdAt: new Date().toISOString(),
        allowedAttempts: 4,
      })

      return await ctx.db.insert('candidateInvites', {
        orgId: 'org_policy',
        templateId,
        batchId,
        inviteToken: 'invite-batch-attempts',
        candidateName: 'Dana',
        candidateEmail: 'dana@example.com',
        status: 'created',
        expiresAt: '2026-08-01T00:00:00.000Z',
      })
    })

    const result = await t.run(async (ctx) => {
      const invite = await ctx.db.get(inviteId)
      if (!invite) throw new Error('invite missing')
      return resolveInterviewPolicyFromInvite(ctx, invite)
    })

    expect(result.policy.maxAttempts).toBe(4)
    expect(result.snapshot.maxAttempts).toBe(4)
  })
})
