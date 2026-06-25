import { ConvexError } from 'convex/values'

import type { Doc } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

import { tutorStarter } from '../../lib/templates/job-family-starters/tutor'

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

  const now = Date.now()
  const templateId = await ctx.db.insert('assessmentTemplates', {
    orgId,
    name: tutorStarter.defaultName,
    role: tutorStarter.defaultRole,
    status: 'active',
    createdBy: 'system',
    rubricVersion: 'v1',
    targetDurationMinutes: DEFAULT_INTERVIEW_DURATION_MINUTES,
    allowsResume: true,
    interviewStyleMode: 'standard',
    jobFamily: tutorStarter.jobFamily,
    simulationMode: tutorStarter.simulationMode,
    systemPrompt: tutorStarter.systemPrompt,
    simulationPersonaPrompt: tutorStarter.simulationPersonaPrompt,
    childPersonaPrompt: tutorStarter.simulationPersonaPrompt,
    wrapUpPrompt: tutorStarter.wrapUpPrompt,
    rubricConfig: tutorStarter.rubricConfig,
    updatedAt: now,
  })

  const template = await ctx.db.get(templateId)

  if (!template) {
    throw new ConvexError('Unable to create default template.')
  }

  return template
}
