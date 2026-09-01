import 'server-only'

import { sendWithResend } from '@/lib/email/resend'
import type {
  KymaEmail,
  SendEmailOptions,
  SendEmailResult,
} from '@/lib/email/types'
import { serverEnv } from '@/lib/env/server'
import { isProductionDeployment } from '@/lib/env/deployment-mode'

const DEFAULT_FROM = 'Kyma <noreply@kyma.kitsunelabs.xyz>'

function resolveFrom(override?: string): string {
  return override?.trim() || serverEnv.EMAIL_FROM?.trim() || DEFAULT_FROM
}

/**
 * Send a product email through the configured provider.
 *
 * - No `RESEND_API_KEY`: logs in non-production, no-ops (ok) in production with a warn.
 * - With `RESEND_API_KEY`: uses the fetch-based Resend adapter.
 *
 * Call sites should treat `ok: false` as a soft failure unless the product
 * flow requires delivery confirmation.
 */
export async function sendEmail(
  email: KymaEmail,
  options?: SendEmailOptions
): Promise<SendEmailResult> {
  const apiKey = serverEnv.RESEND_API_KEY?.trim()
  const from = resolveFrom(options?.from)

  if (!apiKey) {
    const skippedReason = 'RESEND_API_KEY not configured'
    const isProd = isProductionDeployment({
      deploymentEnv: serverEnv.KYMA_DEPLOYMENT_ENV,
      nodeEnv: serverEnv.NODE_ENV,
    })
    if (isProd) {
      console.warn('[email:noop]', {
        kind: email.kind,
        to: email.to,
        reason: skippedReason,
      })
      return { ok: true, provider: 'noop', skippedReason }
    }

    console.info('[email:dev-log]', {
      kind: email.kind,
      to: email.to,
      from,
      payload: email,
    })
    return { ok: true, provider: 'log', skippedReason }
  }

  return await sendWithResend({ apiKey, from, email })
}
