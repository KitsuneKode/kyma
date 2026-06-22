import { v } from 'convex/values'

import { recruiterMutation, recruiterQuery } from './lib/customFunctions'
import { getRecruiterActorId } from './helpers/auth'

const onboardingStepValidator = v.union(
  v.literal('template'),
  v.literal('batch'),
  v.literal('invite_preview'),
  v.literal('example_report')
)

const ALL_ONBOARDING_STEPS = [
  'template',
  'batch',
  'invite_preview',
  'example_report',
] as const

export const getRecruiterOnboardingStatus = recruiterQuery({
  args: {},
  returns: v.object({
    isComplete: v.boolean(),
    completedSteps: v.array(onboardingStepValidator),
    exampleReportSessionId: v.union(v.string(), v.null()),
    templateId: v.union(v.string(), v.null()),
    activeBatchId: v.union(v.string(), v.null()),
  }),
  handler: async (ctx) => {
    const { orgId } = ctx

    const settings = await ctx.db
      .query('workspaceSettings')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .first()

    const completedSteps = settings?.recruiterOnboarding?.steps ?? []
    const isComplete =
      Boolean(settings?.recruiterOnboarding?.completedAt) ||
      ALL_ONBOARDING_STEPS.every((step) => completedSteps.includes(step))

    const template = await ctx.db
      .query('assessmentTemplates')
      .withIndex('by_org_id_and_status', (q) =>
        q.eq('orgId', orgId).eq('status', 'active')
      )
      .first()

    const activeBatch = await ctx.db
      .query('screeningBatches')
      .withIndex('by_org_id_and_status', (q) =>
        q.eq('orgId', orgId).eq('status', 'active')
      )
      .first()

    const exampleReport = await ctx.db
      .query('assessmentReports')
      .withIndex('by_org_id_and_status', (q) =>
        q.eq('orgId', orgId).eq('status', 'completed')
      )
      .first()

    return {
      isComplete,
      completedSteps,
      exampleReportSessionId: exampleReport
        ? `${exampleReport.sessionId}`
        : null,
      templateId: template ? `${template._id}` : null,
      activeBatchId: activeBatch ? `${activeBatch._id}` : null,
    }
  },
})

export const completeRecruiterOnboarding = recruiterMutation({
  args: {
    step: v.optional(onboardingStepValidator),
    markAllComplete: v.optional(v.boolean()),
  },
  returns: v.object({
    isComplete: v.boolean(),
    completedSteps: v.array(onboardingStepValidator),
  }),
  handler: async (ctx, args) => {
    const { orgId } = ctx
    const actorId = await getRecruiterActorId(ctx)
    const now = Date.now()

    const settings = await ctx.db
      .query('workspaceSettings')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .first()

    const existingSteps = settings?.recruiterOnboarding?.steps ?? []
    const nextSteps = args.markAllComplete
      ? [...ALL_ONBOARDING_STEPS]
      : args.step && !existingSteps.includes(args.step)
        ? [...existingSteps, args.step]
        : existingSteps

    const isComplete = ALL_ONBOARDING_STEPS.every((step) =>
      nextSteps.includes(step)
    )

    const recruiterOnboarding = {
      steps: nextSteps,
      completedAt: isComplete
        ? now
        : settings?.recruiterOnboarding?.completedAt,
    }

    if (settings) {
      await ctx.db.patch(settings._id, {
        recruiterOnboarding,
        updatedAt: now,
        updatedBy: actorId,
      })
    } else {
      await ctx.db.insert('workspaceSettings', {
        orgId,
        recruiterOnboarding,
        updatedAt: now,
        updatedBy: actorId,
      })
    }

    return {
      isComplete,
      completedSteps: nextSteps,
    }
  },
})
