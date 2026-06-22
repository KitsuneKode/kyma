import { ConvexError, v } from 'convex/values'

import {
  recruiterMutation,
  recruiterQuery,
  templateWriteMutation,
} from '../lib/customFunctions'
import { getRecruiterActorId } from '../helpers/auth'
import { logAuditEvent } from '../helpers/audit'
import { ensureDefaultTemplate } from '../helpers/templates'
import { modelOverridesValidator } from '../validators'
import { DEFAULT_TEMPLATE_STARTER_CONTENT } from '../../lib/templates/default-assessment-content'

export const bootstrapOrgTemplates = recruiterMutation({
  args: {},
  returns: v.object({ templateId: v.id('assessmentTemplates') }),
  handler: async (ctx) => {
    const { orgId } = ctx
    const template = await ensureDefaultTemplate(ctx, orgId)
    return { templateId: template._id }
  },
})

export const createAssessmentTemplate = templateWriteMutation({
  args: {
    name: v.string(),
    role: v.optional(v.string()),
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

    const templateId = await ctx.db.insert('assessmentTemplates', {
      orgId,
      name,
      role: args.role?.trim() || 'teacher',
      status: 'active',
      createdBy: actor,
      rubricVersion: 'v1',
      targetDurationMinutes: args.targetDurationMinutes,
      allowsResume: args.allowsResume ?? true,
      interviewStyleMode: args.interviewStyleMode ?? 'standard',
      systemPrompt: DEFAULT_TEMPLATE_STARTER_CONTENT.systemPrompt,
      childPersonaPrompt: DEFAULT_TEMPLATE_STARTER_CONTENT.childPersonaPrompt,
      wrapUpPrompt: DEFAULT_TEMPLATE_STARTER_CONTENT.wrapUpPrompt,
      rubricConfig: DEFAULT_TEMPLATE_STARTER_CONTENT.rubricConfig,
    })

    await logAuditEvent(ctx, {
      orgId,
      actorId: actor,
      action: 'template.created',
      resource: `template:${templateId}`,
      metadata: { name },
    })

    return templateId
  },
})

export const listActiveTemplates = recruiterQuery({
  args: {},
  handler: async (ctx) => {
    const { orgId } = ctx

    const templates = await ctx.db
      .query('assessmentTemplates')
      .withIndex('by_org_id_and_status', (q) =>
        q.eq('orgId', orgId).eq('status', 'active')
      )
      .collect()

    return templates
      .toSorted((left, right) => left.name.localeCompare(right.name))
      .map((template) => ({
        id: template._id,
        name: template.name,
        role: template.role,
        rubricVersion: template.rubricVersion,
        targetDurationMinutes: template.targetDurationMinutes,
        allowsResume: template.allowsResume,
        interviewStyleMode: template.interviewStyleMode,
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
    systemPrompt: v.optional(v.string()),
    childPersonaPrompt: v.optional(v.string()),
    wrapUpPrompt: v.optional(v.string()),
    rubricConfig: v.optional(
      v.object({
        dimensions: v.array(
          v.object({
            name: v.string(),
            weight: v.number(),
            isHardGate: v.boolean(),
            keywords: v.optional(v.array(v.string())),
          })
        ),
      })
    ),
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
    const nextVersion = Number.parseInt(
      template.rubricVersion.replace(/[^\d]/g, ''),
      10
    )
    const nextRubricVersion = `v${Number.isFinite(nextVersion) ? nextVersion + 1 : 2}`

    await ctx.db.patch(template._id, {
      ...(args.name?.trim() ? { name: args.name.trim() } : {}),
      systemPrompt: args.systemPrompt,
      childPersonaPrompt: args.childPersonaPrompt,
      wrapUpPrompt: args.wrapUpPrompt,
      rubricConfig: args.rubricConfig,
      modelOverrides: args.modelOverrides,
      rubricVersion: nextRubricVersion,
    })

    await ctx.db.insert('assessmentTemplateVersions', {
      orgId,
      templateId: template._id,
      rubricVersion: nextRubricVersion,
      savedAt: Date.now(),
      savedBy: actor,
      systemPrompt: args.systemPrompt,
      childPersonaPrompt: args.childPersonaPrompt,
      wrapUpPrompt: args.wrapUpPrompt,
      rubricConfig: args.rubricConfig,
      modelOverrides: args.modelOverrides,
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
