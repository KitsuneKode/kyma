'use node'

import { ConvexError, v } from 'convex/values'

import { api, internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import { action } from '../_generated/server'
import { assertOrgPlanAllowsFeature } from '../../lib/auth/entitlements-core'
import { convexEnv } from '../../lib/env/convex'
import {
  buildGatewayByokOptions,
  resolveReviewChatModelId,
} from '../../lib/providers/resolve-model'
import {
  answerRecruiterQuestion,
  GROUNDING_VERSION,
} from '../../lib/recruiter/report-chat'
import { rateLimiter } from '../rateLimiter'

const citationValidator = v.object({
  kind: v.union(
    v.literal('evidence'),
    v.literal('transcript'),
    v.literal('dimension')
  ),
  ref: v.string(),
  label: v.string(),
})

/**
 * Grounded recruiter report chat. Replaces `/api/recruiter/report-chat`.
 */
export const askReportChat = action({
  args: {
    sessionId: v.id('interviewSessions'),
    reportId: v.optional(v.id('assessmentReports')),
    question: v.string(),
  },
  returns: v.object({
    answer: v.string(),
    source: v.union(v.literal('fallback'), v.literal('model')),
    citations: v.array(citationValidator),
    modelId: v.optional(v.string()),
    degradedReason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const question = args.question.trim()
    if (!question) {
      throw new ConvexError('Question is required.')
    }

    const { orgId } = await ctx.runQuery(
      api.recruiter.workspace.assertCandidateReviewAccessForAction,
      {}
    )

    assertOrgPlanAllowsFeature(
      'recruiter:ai-report-chat',
      convexEnv.KYMA_ORG_PLAN_OVERRIDE
    )

    await rateLimiter.limit(ctx, 'recruiterChat', {
      key: `report-chat:${orgId}:${args.sessionId}`,
      throws: true,
    })

    const [detail, workspaceSettings] = await Promise.all([
      ctx.runQuery(api.recruiter.reviews.getReportChatGrounding, {
        sessionId: args.sessionId,
      }),
      ctx.runQuery(internal.recruiter.workspace.getWorkspaceSettingsRaw, {
        orgId,
      }),
    ])

    if (!detail) {
      throw new ConvexError('Candidate review detail is unavailable.')
    }

    const reportId = args.reportId as Id<'assessmentReports'> | undefined

    await ctx.runMutation(api.recruiter.reviews.addReportChatMessage, {
      sessionId: args.sessionId,
      reportId,
      role: 'user',
      content: question,
    })

    const reviewChatModelId = resolveReviewChatModelId(
      workspaceSettings?.defaultModels,
      detail.template.modelOverrides,
      {
        reviewChat: convexEnv.KYMA_REVIEW_CHAT_MODEL,
      }
    )
    const providerOptions = buildGatewayByokOptions({
      modelId: reviewChatModelId,
      providerKeys: workspaceSettings?.providerKeys,
      encryptionKey: convexEnv.KYMA_ENCRYPTION_KEY,
    })

    const answer = await answerRecruiterQuestion(question, detail, {
      modelId: reviewChatModelId,
      providerOptions,
    })

    await ctx.runMutation(api.recruiter.reviews.addReportChatMessage, {
      sessionId: args.sessionId,
      reportId,
      role: 'assistant',
      content: answer.text,
      answerSource: answer.source,
      modelId: answer.modelId,
      citationsJson:
        answer.citations.length > 0
          ? JSON.stringify(answer.citations)
          : undefined,
      groundingVersion: GROUNDING_VERSION,
    })

    return {
      answer: answer.text,
      source: answer.source,
      citations: answer.citations,
      modelId: answer.modelId,
      degradedReason: answer.degradedReason,
    }
  },
})
