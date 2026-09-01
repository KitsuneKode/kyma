import { fetchMutation } from 'convex/nextjs'
import { Webhooks } from '@dodopayments/nextjs'
import { NextResponse } from 'next/server'

import { api } from '@/convex/_generated/api'
import { getConfiguredDodoCatalog } from '@/lib/billing/dodo'
import { billingPlanFromSubscriptionEvent } from '@/lib/billing/resolve-plan'
import { serverEnv } from '@/lib/env/server'
import { reportError } from '@/lib/ops/error-reporting'

type SubscriptionLike = {
  subscription_id?: string
  product_id?: string
  status?: string
  metadata?: Record<string, unknown>
  customer?: { customer_id?: string; metadata?: Record<string, unknown> }
  next_billing_date?: unknown
  cancel_at_next_billing_date?: boolean
}

function requireProcessingKey() {
  const key = serverEnv.KYMA_PROCESSING_WRITE_KEY?.trim()
  if (!key) {
    throw new Error(
      'KYMA_PROCESSING_WRITE_KEY is required to apply Dodo billing events.'
    )
  }
  return key
}

function metadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined
  const value = metadata[key]
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return undefined
}

function periodEndMs(value: unknown): number | undefined {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string' || typeof value === 'number') {
    const ms = new Date(value).getTime()
    return Number.isFinite(ms) ? ms : undefined
  }
  return undefined
}

function buildEventKey(
  type: string,
  data: SubscriptionLike,
  stamp: string | number | Date
) {
  const stampValue =
    stamp instanceof Date
      ? stamp.getTime()
      : typeof stamp === 'number'
        ? stamp
        : String(stamp)
  return `${type}:${data.subscription_id ?? 'unknown'}:${stampValue}`
}

async function syncSubscription(args: {
  eventAt?: number
  eventType: string
  eventKey: string
  data: SubscriptionLike
}) {
  const writeKey = requireProcessingKey()
  const catalog = getConfiguredDodoCatalog()
  const clerkOrgId =
    metadataString(args.data.metadata, 'clerkOrgId') ||
    metadataString(args.data.metadata, 'orgId') ||
    metadataString(args.data.customer?.metadata, 'clerkOrgId')

  if (!clerkOrgId) {
    console.warn('dodo.webhook.missing_org', {
      eventType: args.eventType,
      subscriptionId: args.data.subscription_id,
    })
    return
  }

  const status = args.data.status ?? 'pending'
  const plan = billingPlanFromSubscriptionEvent({
    status,
    productId: args.data.product_id,
    catalog,
  })

  const result = await fetchMutation(api.billing.applyDodoSubscriptionEvent, {
    writeKey,
    eventKey: args.eventKey,
    eventType: args.eventType,
    clerkOrgId,
    plan,
    status,
    customerId: args.data.customer?.customer_id,
    subscriptionId: args.data.subscription_id,
    productId: args.data.product_id,
    currentPeriodEnd: periodEndMs(args.data.next_billing_date),
    cancelAtPeriodEnd: args.data.cancel_at_next_billing_date,
    eventAt: args.eventAt,
  })

  // The org has not been mirrored from Clerk yet (a subscription webhook can
  // arrive before organization.created). Throwing makes the adapter return a
  // non-2xx so Dodo redelivers; the event was intentionally not recorded, so
  // the retry will apply cleanly once the org exists. A `duplicate` result is
  // benign and must NOT trigger a retry.
  if (!result.applied && result.reason === 'org_not_mirrored') {
    throw new Error(
      `Organization ${clerkOrgId} is not mirrored yet; retry this billing event.`
    )
  }
}

async function handleSubscriptionPayload(payload: {
  type: string
  timestamp: Date | string
  data: SubscriptionLike
}) {
  try {
    await syncSubscription({
      eventType: payload.type,
      eventKey: buildEventKey(payload.type, payload.data, payload.timestamp),
      eventAt: new Date(payload.timestamp).getTime(),
      data: payload.data,
    })
  } catch (error) {
    await reportError(error, {
      route: 'dodo.webhook',
      extra: { type: payload.type },
    })
    throw error
  }
}

const webhookKey = serverEnv.DODO_PAYMENTS_WEBHOOK_KEY?.trim()

export const POST = webhookKey
  ? Webhooks({
      webhookKey,
      onSubscriptionActive: handleSubscriptionPayload,
      onSubscriptionUpdated: handleSubscriptionPayload,
      onSubscriptionRenewed: handleSubscriptionPayload,
      onSubscriptionPlanChanged: handleSubscriptionPayload,
      onSubscriptionOnHold: handleSubscriptionPayload,
      onSubscriptionCancelled: handleSubscriptionPayload,
      onSubscriptionExpired: handleSubscriptionPayload,
      onSubscriptionFailed: handleSubscriptionPayload,
    })
  : async () =>
      NextResponse.json(
        { error: 'DODO_PAYMENTS_WEBHOOK_KEY is not configured.' },
        { status: 503 }
      )
