import { ConvexError, v } from 'convex/values'

import {
  recruiterMutation,
  recruiterQuery,
  templateWriteMutation,
} from '../lib/customFunctions'
import { getRecruiterActorId } from '../helpers/auth'
import { logAuditEvent } from '../helpers/audit'
import { migrateOrgAssessmentTemplates } from '../helpers/assessmentTemplateMigration'
import { ensureDefaultTemplate } from '../helpers/templates'
import {
  jobFamilyValidator,
  modelOverridesValidator,
  simulationModeValidator,
} from '../validators'
import { getJobFamilyStarter } from '../../lib/templates/job-family-starters'
import type { JobFamily } from '../../lib/templates/job-family-starters/types'
import { DEFAULT_INTERVIEW_DURATION_MINUTES } from '../helpers/interviewPolicy'

const MAX_ACTIVE_TEMPLATES = 200

const rubricConfigValidator = v.object({
  dimensions: v.array(
    v.object({
      name: v.string(),
      weight: v.number(),
      isHardGate: v.boolean(),
      keywords: v.optional(v.array(v.string())),
    })
  ),
})

/**
 * Rejects rubric input that would corrupt the weighted score.
 *
 * `resolveRubricDimensions` sanitizes defensively at scoring time, but silently
 * dropping a recruiter's dimension is worse than refusing the save: they would
 * believe a rubric is in force that is not. Fail loudly at the write boundary.
 */
function assertValidRubricConfig(rubricConfig?: {
  dimensions: Array<{ name: string; weight: number }>
}) {
  if (!rubricConfig) {
    return
  }

  const seen = new Set<string>()
  for (const dimension of rubricConfig.dimensions) {
    const name = dimension.name.trim()
    if (!name) {
      throw new ConvexError('Every rubric dimension needs a name.')
    }
    if (seen.has(name)) {
      throw new ConvexError(`Duplicate rubric dimension "${name}".`)
    }
    seen.add(name)

    if (!Number.isFinite(dimension.weight) || dimension.weight < 0) {
      throw new ConvexError(
        `Rubric weight for "${name}" must be a finite number of at least 0.`
      )
    }
  }

  const total = rubricConfig.dimensions.reduce(
    (sum, dimension) => sum + dimension.weight,
    0
  )
  if (rubricConfig.dimensions.length > 0 && total <= 0) {
    throw new ConvexError(
      'At least one rubric dimension must carry a weight above 0.'
    )
  }
}

function starterTemplateFields(jobFamily: JobFamily, now: number) {
  const starter = getJobFamilyStarter(jobFamily)

  return {
    jobFamily: starter.jobFamily,
    simulationMode: starter.simulationMode,
    role: starter.defaultRole,
    systemPrompt: starter.systemPrompt,
    simulationPersonaPrompt: starter.simulationPersonaPrompt,
    childPersonaPrompt: starter.simulationPersonaPrompt,
    wrapUpPrompt: starter.wrapUpPrompt,
    rubricConfig: starter.rubricConfig,
    updatedAt: now,
  }
}

export const bootstrapOrgTemplates = recruiterMutation({
  args: {},
  returns: v.object({ templateId: v.id('assessmentTemplates') }),
  handler: async (ctx) => {
    const { orgId } = ctx
    await migrateOrgAssessmentTemplates(ctx, orgId)
    const template = await ensureDefaultTemplate(ctx, orgId)
    return { templateId: template._id }
  },
})

export const createAssessmentTemplate = templateWriteMutation({
  args: {
    name: v.string(),
    role: v.optional(v.string()),
    jobFamily: v.optional(jobFamilyValidator),
    targetDurationMinutes: v.optional(v.number()),
    allowsResume: v.optional(v.boolean()),
    interviewStyleMode: v.optional(
      v.union(v.literal('standard'), v.literal('intensive'))
    ),
  },
  returns: v.id('assessmentTemplates'),
  handler: async (ctx, args) => {
    const { orgId } = ctx
    const actor = (await getRecruiterActorId(ctx)) ?? 'recruiter'
    const name = args.name.trim()
    if (!name) {
      throw new ConvexError('Template name is required.')
    }

    const jobFamily: JobFamily = args.jobFamily ?? 'tutor'
    const starter = getJobFamilyStarter(jobFamily)
    const now = Date.now()

    const templateId = await ctx.db.insert('assessmentTemplates', {
      orgId,
      name,
      status: 'active',
      createdBy: actor,
      rubricVersion: 'v1',
      targetDurationMinutes:
        args.targetDurationMinutes ?? DEFAULT_INTERVIEW_DURATION_MINUTES,
      allowsResume: args.allowsResume ?? true,
      interviewStyleMode: args.interviewStyleMode ?? 'standard',
      ...starterTemplateFields(jobFamily, now),
      role: args.role?.trim() || starter.defaultRole,
    })

    await logAuditEvent(ctx, {
      orgId,
      actorId: actor,
      action: 'template.created',
      resource: `template:${templateId}`,
      metadata: { name, jobFamily },
    })

    return templateId
  },
})

export const duplicateTemplateFromStarter = templateWriteMutation({
  args: {
    jobFamily: jobFamilyValidator,
    name: v.optional(v.string()),
  },
  returns: v.id('assessmentTemplates'),
  handler: async (ctx, args) => {
    const { orgId } = ctx
    const actor = (await getRecruiterActorId(ctx)) ?? 'recruiter'
    const starter = getJobFamilyStarter(args.jobFamily)
    const now = Date.now()
    const name = args.name?.trim() || `${starter.defaultName} (copy)`

    const templateId = await ctx.db.insert('assessmentTemplates', {
      orgId,
      name,
      status: 'active',
      createdBy: actor,
      rubricVersion: 'v1',
      targetDurationMinutes: DEFAULT_INTERVIEW_DURATION_MINUTES,
      allowsResume: true,
      interviewStyleMode: 'standard',
      ...starterTemplateFields(args.jobFamily, now),
    })

    await logAuditEvent(ctx, {
      orgId,
      actorId: actor,
      action: 'template.duplicated_from_starter',
      resource: `template:${templateId}`,
      metadata: { name, jobFamily: args.jobFamily },
    })

    return templateId
  },
})

export const listActiveTemplates = recruiterQuery({
  args: {},
  returns: v.array(
    v.object({
      id: v.id('assessmentTemplates'),
      name: v.string(),
      role: v.string(),
      status: v.union(
        v.literal('draft'),
        v.literal('active'),
        v.literal('archived')
      ),
      jobFamily: v.optional(jobFamilyValidator),
      rubricVersion: v.string(),
      targetDurationMinutes: v.optional(v.number()),
      allowsResume: v.optional(v.boolean()),
      interviewStyleMode: v.optional(
        v.union(v.literal('standard'), v.literal('intensive'))
      ),
      updatedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const { orgId } = ctx

    const templates = await ctx.db
      .query('assessmentTemplates')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .take(MAX_ACTIVE_TEMPLATES)

    return templates
      .filter((template) => template.status !== 'archived')
      .toSorted((left, right) => left.name.localeCompare(right.name))
      .map((template) => ({
        id: template._id,
        name: template.name,
        role: template.role,
        status: template.status,
        jobFamily: template.jobFamily,
        rubricVersion: template.rubricVersion,
        targetDurationMinutes: template.targetDurationMinutes,
        allowsResume: template.allowsResume,
        interviewStyleMode: template.interviewStyleMode,
        updatedAt: template.updatedAt,
      }))
  },
})

export const getTemplateById = recruiterQuery({
  args: {
    templateId: v.id('assessmentTemplates'),
  },
  handler: async (ctx, args) => {
    const { orgId } = ctx
    const template = await ctx.db.get(args.templateId)
    if (!template || template.orgId !== orgId) {
      return null
    }
    return template
  },
})

export const updateAssessmentTemplate = templateWriteMutation({
  args: {
    templateId: v.id('assessmentTemplates'),
    name: v.optional(v.string()),
    jobFamily: v.optional(jobFamilyValidator),
    simulationMode: v.optional(simulationModeValidator),
    targetDurationMinutes: v.optional(v.number()),
    allowsResume: v.optional(v.boolean()),
    interviewStyleMode: v.optional(
      v.union(v.literal('standard'), v.literal('intensive'))
    ),
    systemPrompt: v.optional(v.string()),
    childPersonaPrompt: v.optional(v.string()),
    simulationPersonaPrompt: v.optional(v.string()),
    wrapUpPrompt: v.optional(v.string()),
    rubricConfig: v.optional(rubricConfigValidator),
    modelOverrides: v.optional(modelOverridesValidator),
  },
  returns: v.id('assessmentTemplates'),
  handler: async (ctx, args) => {
    const { orgId } = ctx
    const actor = (await getRecruiterActorId(ctx)) ?? 'admin'
    const template = await ctx.db.get(args.templateId)
    if (!template || template.orgId !== orgId) {
      throw new ConvexError('Template not found.')
    }
    if (
      args.targetDurationMinutes !== undefined &&
      (!Number.isFinite(args.targetDurationMinutes) ||
        args.targetDurationMinutes < 5 ||
        args.targetDurationMinutes > 120)
    ) {
      throw new ConvexError(
        'Target duration must be between 5 and 120 minutes.'
      )
    }
    assertValidRubricConfig(args.rubricConfig)
    const nextVersion = Number.parseInt(
      template.rubricVersion.replace(/[^\d]/g, ''),
      10
    )
    const nextRubricVersion = `v${Number.isFinite(nextVersion) ? nextVersion + 1 : 2}`
    const simulationPersonaPrompt =
      args.simulationPersonaPrompt ?? args.childPersonaPrompt
    // Prompts and model overrides change interview and scoring behaviour just
    // as much as the rubric does. Versioning only on `rubricConfig` let two
    // reports carry the same `rubricVersion` while being produced by different
    // prompts and different models - which breaks report reviewability.
    const behaviourChanged =
      args.rubricConfig !== undefined ||
      args.systemPrompt !== undefined ||
      args.wrapUpPrompt !== undefined ||
      simulationPersonaPrompt !== undefined ||
      args.modelOverrides !== undefined
    const now = Date.now()

    await ctx.db.patch(template._id, {
      ...(args.name?.trim() ? { name: args.name.trim() } : {}),
      ...(args.jobFamily ? { jobFamily: args.jobFamily } : {}),
      ...(args.simulationMode ? { simulationMode: args.simulationMode } : {}),
      ...(args.targetDurationMinutes !== undefined
        ? { targetDurationMinutes: args.targetDurationMinutes }
        : {}),
      ...(args.allowsResume !== undefined
        ? { allowsResume: args.allowsResume }
        : {}),
      ...(args.interviewStyleMode
        ? { interviewStyleMode: args.interviewStyleMode }
        : {}),
      // Convex deletes any field patched to `undefined`, so every optional
      // field must be spread conditionally. Writing these unconditionally let a
      // name-only save erase the prompts and rubric for every later interview.
      ...(args.systemPrompt !== undefined
        ? { systemPrompt: args.systemPrompt }
        : {}),
      ...(simulationPersonaPrompt !== undefined
        ? {
            childPersonaPrompt: simulationPersonaPrompt,
            simulationPersonaPrompt,
          }
        : {}),
      ...(args.wrapUpPrompt !== undefined
        ? { wrapUpPrompt: args.wrapUpPrompt }
        : {}),
      ...(args.rubricConfig !== undefined
        ? { rubricConfig: args.rubricConfig }
        : {}),
      ...(behaviourChanged ? { rubricVersion: nextRubricVersion } : {}),
      ...(args.modelOverrides !== undefined
        ? { modelOverrides: args.modelOverrides }
        : {}),
      updatedAt: now,
    })

    // A version row is a rubric snapshot; only record one when the rubric
    // actually changed, so name-only saves stop creating phantom versions.
    if (behaviourChanged) {
      await ctx.db.insert('assessmentTemplateVersions', {
        orgId,
        templateId: template._id,
        rubricVersion: behaviourChanged
          ? nextRubricVersion
          : template.rubricVersion,
        savedAt: now,
        savedBy: actor,
        jobFamily: args.jobFamily ?? template.jobFamily,
        simulationMode: args.simulationMode ?? template.simulationMode,
        systemPrompt: args.systemPrompt ?? template.systemPrompt,
        childPersonaPrompt:
          simulationPersonaPrompt ?? template.childPersonaPrompt,
        simulationPersonaPrompt:
          simulationPersonaPrompt ?? template.simulationPersonaPrompt,
        wrapUpPrompt: args.wrapUpPrompt ?? template.wrapUpPrompt,
        rubricConfig: args.rubricConfig ?? template.rubricConfig,
        modelOverrides: args.modelOverrides ?? template.modelOverrides,
      })
    }

    await logAuditEvent(ctx, {
      orgId,
      actorId: actor,
      action: 'template.updated',
      resource: `template:${template._id}`,
      metadata: {
        rubricVersion: nextRubricVersion,
        ...(args.targetDurationMinutes !== undefined
          ? { targetDurationMinutes: args.targetDurationMinutes }
          : {}),
        ...(args.allowsResume !== undefined
          ? { allowsResume: args.allowsResume }
          : {}),
        ...(args.interviewStyleMode
          ? { interviewStyleMode: args.interviewStyleMode }
          : {}),
      },
    })

    return template._id
  },
})

export const listTemplateVersions = recruiterQuery({
  args: {
    templateId: v.id('assessmentTemplates'),
  },
  handler: async (ctx, args) => {
    const { orgId } = ctx
    const template = await ctx.db.get(args.templateId)
    if (!template || template.orgId !== orgId) {
      return []
    }
    const versions = await ctx.db
      .query('assessmentTemplateVersions')
      .withIndex('by_template_and_saved_at', (q) =>
        q.eq('templateId', args.templateId)
      )
      .order('desc')
      .take(50)

    return versions.map((version) => ({
      id: version._id,
      rubricVersion: version.rubricVersion,
      savedAt: version.savedAt,
      savedBy: version.savedBy,
    }))
  },
})
