import { internalMutation } from '../_generated/server'
import { v } from 'convex/values'

import { migrateOrgAssessmentTemplates } from '../helpers/assessmentTemplateMigration'

export const migrateAssessmentTemplatesHorizontal = internalMutation({
  args: {
    orgId: v.optional(v.string()),
  },
  returns: v.object({
    migratedCount: v.number(),
    totalCount: v.number(),
  }),
  handler: async (ctx, args) => {
    if (args.orgId) {
      return await migrateOrgAssessmentTemplates(ctx, args.orgId)
    }

    const templates = await ctx.db.query('assessmentTemplates').collect()
    const orgIds = [...new Set(templates.map((template) => template.orgId))]

    let migratedCount = 0
    let totalCount = 0
    for (const orgId of orgIds) {
      const result = await migrateOrgAssessmentTemplates(ctx, orgId)
      migratedCount += result.migratedCount
      totalCount += result.totalCount
    }

    return { migratedCount, totalCount }
  },
})
