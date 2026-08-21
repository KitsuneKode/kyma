// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { beforeEach, describe, expect, test } from 'vitest'

import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

const ORG_ID = 'org_template_patch'

const TEMPLATE_EDITOR = {
  subject: 'user_template_editor',
  org_id: ORG_ID,
  org_role: 'org:admin',
  org_permissions: ['org:recruiter:access', 'org:recruiter:templates:write'],
}

const RUBRIC = {
  dimensions: [
    { name: 'clarity', weight: 2, isHardGate: true },
    { name: 'warmth', weight: 1, isHardGate: false },
  ],
}

function harness() {
  return convexTest(schema, modules)
}

async function seedTemplate(t: ReturnType<typeof harness>) {
  return await t.run(async (ctx) =>
    ctx.db.insert('assessmentTemplates', {
      orgId: ORG_ID,
      name: 'Original name',
      role: 'engineer',
      status: 'active',
      createdBy: 'seed',
      rubricVersion: 'v1',
      systemPrompt: 'You are a careful interviewer.',
      wrapUpPrompt: 'Thank the candidate warmly.',
      rubricConfig: RUBRIC,
    })
  )
}

describe('updateAssessmentTemplate patch semantics', () => {
  beforeEach(() => {
    // Recruiter auth fails closed without Clerk config, so the suite must
    // present a configured deployment before exercising the mutation.
    process.env.CLERK_SECRET_KEY = 'sk_test'
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test'
    process.env.CLERK_JWT_ISSUER_DOMAIN = 'https://clerk.test'
  })

  test('renaming a template preserves prompts and rubric', async () => {
    const t = harness()
    const templateId = await seedTemplate(t)
    const asEditor = t.withIdentity(TEMPLATE_EDITOR)

    await asEditor.mutation(api.recruiter.templates.updateAssessmentTemplate, {
      templateId,
      name: 'Renamed',
    })

    const after = await t.run((ctx) => ctx.db.get(templateId))

    expect(after?.name).toBe('Renamed')
    expect(after?.systemPrompt).toBe('You are a careful interviewer.')
    expect(after?.wrapUpPrompt).toBe('Thank the candidate warmly.')
    expect(after?.rubricConfig?.dimensions).toHaveLength(2)
  })

  test('a name-only save does not bump the rubric version', async () => {
    const t = harness()
    const templateId = await seedTemplate(t)
    const asEditor = t.withIdentity(TEMPLATE_EDITOR)

    await asEditor.mutation(api.recruiter.templates.updateAssessmentTemplate, {
      templateId,
      name: 'Renamed',
    })

    const after = await t.run((ctx) => ctx.db.get(templateId))
    expect(after?.rubricVersion).toBe('v1')
  })

  test('a name-only save does not record a phantom rubric version', async () => {
    const t = harness()
    const templateId = await seedTemplate(t)
    const asEditor = t.withIdentity(TEMPLATE_EDITOR)

    await asEditor.mutation(api.recruiter.templates.updateAssessmentTemplate, {
      templateId,
      name: 'Renamed',
    })

    const versions = await t.run((ctx) =>
      ctx.db
        .query('assessmentTemplateVersions')
        .withIndex('by_template', (q) => q.eq('templateId', templateId))
        .collect()
    )

    expect(versions).toHaveLength(0)
  })

  test('an explicit rubric edit still applies and bumps the version', async () => {
    const t = harness()
    const templateId = await seedTemplate(t)
    const asEditor = t.withIdentity(TEMPLATE_EDITOR)

    await asEditor.mutation(api.recruiter.templates.updateAssessmentTemplate, {
      templateId,
      rubricConfig: {
        dimensions: [{ name: 'accuracy', weight: 5, isHardGate: true }],
      },
    })

    const after = await t.run((ctx) => ctx.db.get(templateId))

    expect(after?.rubricConfig?.dimensions).toHaveLength(1)
    expect(after?.rubricConfig?.dimensions[0]?.name).toBe('accuracy')
    expect(after?.rubricVersion).toBe('v2')
    // The untouched prompt must survive a rubric-only edit too.
    expect(after?.systemPrompt).toBe('You are a careful interviewer.')
  })

  test('an explicit empty-string prompt is still writable', async () => {
    const t = harness()
    const templateId = await seedTemplate(t)
    const asEditor = t.withIdentity(TEMPLATE_EDITOR)

    await asEditor.mutation(api.recruiter.templates.updateAssessmentTemplate, {
      templateId,
      systemPrompt: '',
    })

    const after = await t.run((ctx) => ctx.db.get(templateId))
    expect(after?.systemPrompt).toBe('')
  })
})
