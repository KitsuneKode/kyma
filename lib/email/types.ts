/**
 * Product email payloads. Keep these structured so adapters stay thin and
 * templates can be swapped without changing call sites.
 */

export type CandidateInviteEmail = {
  kind: 'candidate_invite'
  to: string
  /** Absolute invite URL (`/i/[token]` or equivalent). */
  inviteUrl: string
  workspaceName: string
  candidateName?: string
  roleTitle?: string
  /** ISO-8601 expiry when the invite has a deadline. */
  expiresAt?: string
}

export type ReportReadyEmail = {
  kind: 'report_ready'
  to: string
  /** Absolute recruiter report URL. */
  reportUrl: string
  workspaceName: string
  candidateName: string
  sessionId: string
  recruiterName?: string
}

export type KymaEmail = CandidateInviteEmail | ReportReadyEmail

export type EmailProviderId = 'noop' | 'log' | 'resend'

export type SendEmailResult = {
  ok: boolean
  provider: EmailProviderId
  /** Provider message id when available. */
  id?: string
  skippedReason?: string
  error?: string
}

export type SendEmailOptions = {
  /** Override From header (defaults to EMAIL_FROM / product default). */
  from?: string
}
