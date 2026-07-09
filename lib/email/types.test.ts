import { describe, expect, test } from 'vitest'

import type { CandidateInviteEmail, ReportReadyEmail } from './types'

describe('email payload types', () => {
  test('candidate invite shape is assignable', () => {
    const payload: CandidateInviteEmail = {
      kind: 'candidate_invite',
      to: 'candidate@example.com',
      inviteUrl: 'https://kyma.kitsunelabs.xyz/i/token',
      workspaceName: 'Acme',
      roleTitle: 'Tutor',
    }
    expect(payload.kind).toBe('candidate_invite')
  })

  test('report ready shape is assignable', () => {
    const payload: ReportReadyEmail = {
      kind: 'report_ready',
      to: 'recruiter@example.com',
      reportUrl: 'https://kyma.kitsunelabs.xyz/recruiter/sessions/abc',
      workspaceName: 'Acme',
      candidateName: 'Alex',
      sessionId: 'abc',
    }
    expect(payload.kind).toBe('report_ready')
  })
})
