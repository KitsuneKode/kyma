import type { FunctionReturnType } from 'convex/server'
import { api } from '@/convex/_generated/api'

export type CandidateReviewDetail = NonNullable<
  FunctionReturnType<typeof api.recruiter.reviews.getCandidateReviewDetail>
>

export type DashboardNeedsAttention = {
  manualReviewCandidates: Array<{
    reportId: string
    sessionId: string
    candidateName: string
  }>
  invitesExpiringSoon: Array<{
    inviteId: string
    inviteToken: string
    expiresAt: string
    candidateName?: string
  }>
  staleSessions: Array<{
    sessionId: string
    startedAt?: string
  }>
}

export type DashboardSummary = {
  counts: {
    pendingReviews: number
    manualReviews: number
    activeSessions: number
    expiringInvites: number
    sessionsToday: number
  }
  needsAttention: DashboardNeedsAttention
  recentActivity: Array<{
    id: string
    type: string
    detail: string
    sessionId?: string
    createdAt?: string
  }>
}
