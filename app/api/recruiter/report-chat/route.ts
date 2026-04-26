import { fetchAction, fetchMutation, fetchQuery } from 'convex/nextjs'
import { NextRequest, NextResponse } from 'next/server'

import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import {
  buildGatewayByokOptions,
  resolveReviewChatModelId,
} from '@/lib/providers/resolve-model'
import {
  answerRecruiterQuestion,
  GROUNDING_VERSION,
} from '@/lib/recruiter/report-chat'
import { reportChatBodySchema } from '@/lib/validation/interview-api'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const token = await getServerConvexAuthToken()
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    const body = reportChatBodySchema.parse(await request.json())
    const sessionId = body.sessionId as Id<'interviewSessions'>
    const reportId = body.reportId as Id<'assessmentReports'> | undefined

    await fetchAction(api.rateLimiter.checkLimit, {
      name: 'recruiterChat',
      key: `report-chat:${clientIp}:${sessionId}`,
    })

    const detail = await fetchQuery(
      api.recruiter.getCandidateReviewDetail,
      {
        sessionId,
      },
      {
        token: token ?? undefined,
      }
    )
    const workspaceSettings = await fetchQuery(
      api.admin.getWorkspaceSettingsRaw,
      {},
      {
        token: token ?? undefined,
      }
    ).catch(() => null)

    if (!detail) {
      return NextResponse.json(
        { error: 'Candidate review detail is unavailable.' },
        { status: 404 }
      )
    }

    await fetchMutation(
      api.admin.addReportChatMessage,
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

    const reviewChatModelId = resolveReviewChatModelId(
      workspaceSettings?.defaultModels
    )
    const providerOptions = buildGatewayByokOptions({
      modelId: reviewChatModelId,
      providerKeys: workspaceSettings?.providerKeys,
    })

    const answer = await answerRecruiterQuestion(body.question, detail, {
      modelId: reviewChatModelId,
      providerOptions,
    })

    await fetchMutation(
      api.admin.addReportChatMessage,
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
      citations: answer.citations,
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to answer the recruiter question.'
    return NextResponse.json(
      {
        error: message,
      },
      { status: message.includes('Rate limit') ? 429 : 400 }
    )
  }
}
