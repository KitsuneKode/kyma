import { fetchAction, fetchMutation, fetchQuery } from 'convex/nextjs'
import { NextRequest, NextResponse } from 'next/server'

import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import {
  buildGatewayByokOptions,
  resolveReviewChatAttempt,
} from '@/lib/providers/resolve-model'
import {
  answerRecruiterQuestion,
  GROUNDING_VERSION,
} from '@/lib/recruiter/report-chat'
import { requireOrgEntitlement } from '@/lib/auth/entitlements'
import { assertServerRateLimit } from '@/lib/http/server-rate-limit'
import { createRequestId } from '@/lib/interview/diagnostics'
import { reportError } from '@/lib/ops/error-reporting'
import { reportChatBodySchema } from '@/lib/validation/interview-api'
import { serverEnv } from '@/lib/env/server'

export async function POST(request: NextRequest) {
  const requestId = createRequestId('report-chat')
  try {
    const token = await getServerConvexAuthToken()
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    const body = reportChatBodySchema.parse(await request.json())
    const sessionId = body.sessionId as Id<'interviewSessions'>
    const reportId = body.reportId as Id<'assessmentReports'> | undefined
    await requireOrgEntitlement('recruiter:ai-report-chat')

    await assertServerRateLimit(
      'recruiterChat',
      `report-chat:${clientIp}:${sessionId}`
    )

    const [detail, workspaceSettings] = await Promise.all([
      fetchQuery(
        api.recruiter.reviews.getReportChatGrounding,
        {
          sessionId,
        },
        {
          token: token ?? undefined,
        }
      ),
      fetchAction(
        api.recruiter.workspace.getWorkspaceSettingsForReportChat,
        {},
        {
          token: token ?? undefined,
        }
      ).catch(() => null),
    ])

    if (!detail) {
      return NextResponse.json(
        { error: 'Candidate review detail is unavailable.' },
        { status: 404 }
      )
    }

    await fetchMutation(
      api.recruiter.reviews.addReportChatMessage,
      {
        sessionId,
        reportId,
        role: 'user',
        content: body.question,
      },
      {
        token: token ?? undefined,
      }
    )

    const reviewChatAttempt = resolveReviewChatAttempt({
      workspaceDefaults: workspaceSettings?.defaultModels,
      templateOverrides: detail.template.modelOverrides,
      envFallbacks: {
        reviewChat: serverEnv.KYMA_REVIEW_CHAT_MODEL,
      },
      providerKeys: workspaceSettings?.providerKeys,
      encryptionKey: serverEnv.KYMA_ENCRYPTION_KEY,
      aad: detail.orgId,
      platformEnv: {
        OPENAI_API_KEY: serverEnv.OPENAI_API_KEY,
        GOOGLE_API_KEY: serverEnv.GOOGLE_API_KEY,
        GEMINI_API_KEY: serverEnv.GEMINI_API_KEY,
        ANTHROPIC_API_KEY: serverEnv.ANTHROPIC_API_KEY,
      },
    })

    const modelId = reviewChatAttempt.canAttemptModel
      ? reviewChatAttempt.modelId
      : undefined
    const providerOptions = modelId
      ? buildGatewayByokOptions({
          modelId,
          providerKeys: workspaceSettings?.providerKeys,
          encryptionKey: serverEnv.KYMA_ENCRYPTION_KEY,
          aad: detail.orgId,
        })
      : undefined

    const answer = await answerRecruiterQuestion(body.question, detail, {
      modelId,
      providerOptions,
      degradedReason: reviewChatAttempt.degradedReason,
    })

    await fetchMutation(
      api.recruiter.reviews.addReportChatMessage,
      {
        sessionId,
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
      },
      {
        token: token ?? undefined,
      }
    )

    return NextResponse.json({
      answer: answer.text,
      source: answer.source,
      modelId: answer.modelId,
      degradedReason: answer.degradedReason,
      citations: answer.citations,
      requestId,
    })
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : ''
    const isRateLimit = rawMessage.includes('Rate limit')
    // S-12: never echo raw provider/zod messages to client; log full error server-side.
    const message = isRateLimit
      ? 'Rate limit exceeded. Please retry shortly.'
      : 'Unable to answer the recruiter question. Please try again.'
    await reportError(error, {
      route: '/api/recruiter/report-chat',
      requestId,
      tags: { surface: 'recruiter-report-chat' },
      extra: { rawMessage: rawMessage.slice(0, 500) },
    })
    return NextResponse.json(
      {
        error: message,
        requestId,
      },
      { status: isRateLimit ? 429 : 400 }
    )
  }
}
