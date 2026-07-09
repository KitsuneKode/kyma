import 'server-only'

import type { KymaEmail, SendEmailResult } from '@/lib/email/types'

type ResendSendArgs = {
  apiKey: string
  from: string
  email: KymaEmail
}

function subjectFor(email: KymaEmail): string {
  switch (email.kind) {
    case 'candidate_invite':
      return email.roleTitle
        ? `You're invited to interview for ${email.roleTitle}`
        : `You're invited to a Kyma interview — ${email.workspaceName}`
    case 'report_ready':
      return `Interview report ready: ${email.candidateName}`
  }
}

function textBodyFor(email: KymaEmail): string {
  switch (email.kind) {
    case 'candidate_invite': {
      const greeting = email.candidateName
        ? `Hi ${email.candidateName},`
        : 'Hi,'
      const lines = [
        greeting,
        '',
        `${email.workspaceName} invited you to complete a voice screening interview on Kyma.`,
      ]
      if (email.roleTitle) {
        lines.push(`Role: ${email.roleTitle}`)
      }
      lines.push(`Start here: ${email.inviteUrl}`)
      if (email.expiresAt) {
        lines.push(`This invite expires at ${email.expiresAt}.`)
      }
      lines.push('', 'If you were not expecting this email, you can ignore it.')
      return lines.join('\n')
    }
    case 'report_ready': {
      const greeting = email.recruiterName
        ? `Hi ${email.recruiterName},`
        : 'Hi,'
      return [
        greeting,
        '',
        `The assessment report for ${email.candidateName} is ready.`,
        `Workspace: ${email.workspaceName}`,
        `Session: ${email.sessionId}`,
        `Open report: ${email.reportUrl}`,
      ].join('\n')
    }
  }
}

/**
 * Fetch-based Resend adapter (no SDK dependency).
 * @see https://resend.com/docs/api-reference/emails/send-email
 */
export async function sendWithResend(
  args: ResendSendArgs
): Promise<SendEmailResult> {
  const { apiKey, from, email } = args

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email.to],
        subject: subjectFor(email),
        text: textBodyFor(email),
        tags: [{ name: 'kyma_email_kind', value: email.kind }],
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error('[email:resend] send failed', {
        status: response.status,
        detail: detail.slice(0, 500),
        kind: email.kind,
      })
      return {
        ok: false,
        provider: 'resend',
        error: `Resend HTTP ${response.status}`,
      }
    }

    const payload = (await response.json()) as { id?: string }
    return {
      ok: true,
      provider: 'resend',
      id: payload.id,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[email:resend] request error', { message, kind: email.kind })
    return {
      ok: false,
      provider: 'resend',
      error: message,
    }
  }
}
