'use server'

import { auth } from '@clerk/nextjs/server'
import { fetchMutation, fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { sendEmail } from '@/lib/email'
import { reportError } from '@/lib/ops/error-reporting'
import { getAppBaseUrl } from '@/lib/url/app-base-url'

export type SendBatchInviteEmailsResult =
  | {
      ok: true
      sent: number
      failed: number
      skipped: number
    }
  | { ok: false; error: string }

function redactToken(token: string): string {
  if (token.length <= 8) {
    return '***'
  }
  return `${token.slice(0, 4)}…${token.slice(-4)}`
}

/**
 * Send candidate invite emails for a screening batch.
 * Soft-fails per recipient; never logs full invite tokens.
 */
export async function sendBatchInviteEmails(
  batchId: string
): Promise<SendBatchInviteEmailsResult> {
  const { userId, orgId } = await auth()
  if (!userId) {
    return { ok: false, error: 'You must be signed in.' }
  }
  if (!orgId) {
    return {
      ok: false,
      error: 'Select an organization before sending invites.',
    }
  }

  const token = await getServerConvexAuthToken()
  if (!token) {
    return { ok: false, error: 'Unable to authenticate with Convex.' }
  }

  try {
    const detail = await fetchQuery(
      api.recruiter.screenings.getScreeningBatchDetail,
      {
        batchId: batchId as Id<'screeningBatches'>,
        nowMs: Date.now(),
      },
      { token }
    )

    if (!detail) {
      return { ok: false, error: 'Screening batch not found.' }
    }

    const baseUrl = await getAppBaseUrl()
    const workspaceName = detail.batch.templateName || detail.batch.name
    let sent = 0
    let failed = 0
    let skipped = 0

    for (const candidate of detail.candidates) {
      const email = candidate.candidateEmail?.trim().toLowerCase()
      const inviteToken = candidate.inviteToken
      if (!email || !inviteToken) {
        skipped += 1
        continue
      }

      if (
        candidate.inviteStatus === 'completed' ||
        candidate.inviteStatus === 'expired'
      ) {
        skipped += 1
        continue
      }

      const inviteUrl = `${baseUrl}/i/${inviteToken}`
      const result = await sendEmail({
        kind: 'candidate_invite',
        to: email,
        inviteUrl,
        workspaceName,
        candidateName: candidate.candidateName,
        roleTitle: detail.batch.templateName,
        expiresAt: candidate.expiresAt,
      })

      const deliveryStatus = result.ok
        ? result.provider === 'noop' || result.provider === 'log'
          ? ('skipped' as const)
          : ('sent' as const)
        : ('failed' as const)

      await fetchMutation(
        api.recruiter.screenings.recordInviteEmailDelivery,
        {
          inviteId: candidate.inviteId as Id<'candidateInvites'>,
          status: deliveryStatus,
          provider: result.provider,
          providerMessageId: result.id,
          error: result.error
            ? result.error.slice(0, 200)
            : result.skippedReason?.slice(0, 200),
        },
        { token }
      )

      if (deliveryStatus === 'sent') {
        sent += 1
      } else if (deliveryStatus === 'failed') {
        failed += 1
        await reportError(new Error(result.error ?? 'invite email failed'), {
          route: 'sendBatchInviteEmails',
          tags: { surface: 'candidate-invite-email' },
          extra: {
            batchId,
            inviteTokenRedacted: redactToken(inviteToken),
          },
        })
      } else {
        skipped += 1
      }
    }

    return { ok: true, sent, failed, skipped }
  } catch (error) {
    await reportError(error, {
      route: 'sendBatchInviteEmails',
      tags: { surface: 'candidate-invite-email' },
      extra: { batchId },
    })
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unable to send candidate invite emails.',
    }
  }
}
