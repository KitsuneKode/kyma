import type { Doc } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import type {
  JobFamily,
  SimulationMode,
} from '../../lib/templates/job-family-starters/types'

const JS_JUNIOR_ROLES = new Set([
  'javascript-junior-engineer',
  'software_engineer',
  'practice-software',
])

const PRACTICE_ROLE_TO_FAMILY: Record<string, JobFamily> = {
  'practice-tutor': 'tutor',
  'practice-product': 'product',
  'practice-support': 'customer_support',
  'practice-sales': 'sales',
  'practice-general': 'general',
}

export function inferJobFamilyFromTemplate(
  template: Pick<Doc<'assessmentTemplates'>, 'role' | 'name'>
): JobFamily {
  if (template.role === 'teacher' || template.role === 'tutor') {
    return 'tutor'
  }

  if (JS_JUNIOR_ROLES.has(template.role)) {
    return 'software_engineering'
  }

  const practiceFamily = PRACTICE_ROLE_TO_FAMILY[template.role]
  if (practiceFamily) {
    return practiceFamily
  }

  if (template.name.toLowerCase().includes('tutor')) {
    return 'tutor'
  }

  if (template.name.toLowerCase().includes('javascript')) {
    return 'software_engineering'
  }

  return 'custom'
}

export function resolveTemplateSimulationMode(
  template: Pick<
    Doc<'assessmentTemplates'>,
    'simulationMode' | 'childPersonaPrompt' | 'simulationPersonaPrompt'
  >
): SimulationMode {
  if (template.simulationMode) {
    return template.simulationMode
  }

  if (
    template.simulationPersonaPrompt?.trim() ||
    template.childPersonaPrompt?.trim()
  ) {
    return 'teaching'
  }

  return 'none'
}

export function resolveTemplateSimulationPersonaPrompt(
  template: Pick<
    Doc<'assessmentTemplates'>,
    'simulationPersonaPrompt' | 'childPersonaPrompt'
  >
) {
  return (
    template.simulationPersonaPrompt?.trim() ||
    template.childPersonaPrompt?.trim() ||
    undefined
  )
}

export async function migrateAssessmentTemplateHorizontalFields(
  ctx: MutationCtx,
  template: Doc<'assessmentTemplates'>
) {
  const needsJobFamily = template.jobFamily === undefined
  const needsSimulationMode = template.simulationMode === undefined
  const personaPrompt = resolveTemplateSimulationPersonaPrompt(template)
  const needsPersonaMigration =
    personaPrompt !== undefined &&
    template.simulationPersonaPrompt === undefined

  if (!needsJobFamily && !needsSimulationMode && !needsPersonaMigration) {
    return false
  }

  const patch: Partial<Doc<'assessmentTemplates'>> = {
    updatedAt: template.updatedAt ?? Date.now(),
  }

  if (needsJobFamily) {
    patch.jobFamily = inferJobFamilyFromTemplate(template)
  }

  if (needsSimulationMode) {
    patch.simulationMode = resolveTemplateSimulationMode(template)
  }

  if (needsPersonaMigration && personaPrompt) {
    patch.simulationPersonaPrompt = personaPrompt
  }

  await ctx.db.patch(template._id, patch)
  return true
}

export async function migrateOrgAssessmentTemplates(
  ctx: MutationCtx,
  orgId: string
) {
  const templates = await ctx.db
    .query('assessmentTemplates')
    .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
    .collect()

  let migratedCount = 0
  for (const template of templates) {
    const migrated = await migrateAssessmentTemplateHorizontalFields(
      ctx,
      template
    )
    if (migrated) {
      migratedCount += 1
    }
  }

  return { migratedCount, totalCount: templates.length }
}
