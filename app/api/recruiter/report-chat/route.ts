import { fetchMutation, fetchQuery } from "convex/nextjs"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { answerRecruiterQuestion } from "@/lib/recruiter/report-chat"

export const dynamic = "force-dynamic"
export const revalidate = 0

const bodySchema = z.object({
  sessionId: z.string(),
  reportId: z.string().optional(),
  question: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json())
    const sessionId = body.sessionId as Id<"interviewSessions">
    const reportId = body.reportId as Id<"assessmentReports"> | undefined

    const detail = await fetchQuery(api.recruiter.getCandidateReviewDetail, {
      sessionId,
    })

    if (!detail) {
      return NextResponse.json(
        { error: "Candidate review detail is unavailable." },
        { status: 404 }
      )
    }

    await fetchMutation(api.admin.addReportChatMessage, {
      sessionId,
      reportId,
      role: "user",
      content: body.question,
    })

    const answer = await answerRecruiterQuestion(body.question, detail)

    await fetchMutation(api.admin.addReportChatMessage, {
      sessionId,
      reportId,
      role: "assistant",
      content: answer,
    })

    return NextResponse.json({ answer })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to answer the recruiter question.",
      },
      { status: 400 }
    )
  }
}
