import { ConvexError } from 'convex/values'

import type { Doc } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

import { DEFAULT_TEMPLATE_STARTER_CONTENT } from '../../lib/templates/default-assessment-content'

import { DEFAULT_INTERVIEW_DURATION_MINUTES } from './interviewPolicy'

export async function ensureDefaultTemplate(
  ctx: MutationCtx,
  orgId = 'org_demo'
): Promise<Doc<'assessmentTemplates'>> {
  const existingTemplate = await ctx.db
    .query('assessmentTemplates')
    .withIndex('by_org_id_and_status', (q) =>
      q.eq('orgId', orgId).eq('status', 'active')
    )
    .first()

  if (existingTemplate) {
    return existingTemplate
  }

  const templateId = await ctx.db.insert('assessmentTemplates', {
    orgId,
    name: 'AI Tutor Screener',
    role: 'teacher',
    status: 'active',
    createdBy: 'system',
    rubricVersion: 'v1',
    targetDurationMinutes: DEFAULT_INTERVIEW_DURATION_MINUTES,
    allowsResume: true,
    interviewStyleMode: 'standard',
    systemPrompt: DEFAULT_TEMPLATE_STARTER_CONTENT.systemPrompt,
    childPersonaPrompt: DEFAULT_TEMPLATE_STARTER_CONTENT.childPersonaPrompt,
    wrapUpPrompt: DEFAULT_TEMPLATE_STARTER_CONTENT.wrapUpPrompt,
    rubricConfig: DEFAULT_TEMPLATE_STARTER_CONTENT.rubricConfig,
  })

  const template = await ctx.db.get(templateId)

  if (!template) {
    throw new ConvexError('Unable to create default template.')
  }

  return template
}
