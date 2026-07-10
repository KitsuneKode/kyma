import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import {
  dodoBillingReady,
  getDodoClient,
  getDodoReturnUrl,
  resolveProductIdForCheckout,
} from '@/lib/billing/dodo'
import type { BillingInterval, PaidPlanTier } from '@/lib/billing/plans'
import { hasOrgPermission } from '@/lib/auth/access'
import { reportError } from '@/lib/ops/error-reporting'

const bodySchema = z.object({
  plan: z.enum(['pro', 'enterprise']),
  interval: z.enum(['month', 'year']).default('month'),
})

export async function POST(request: Request) {
  try {
    if (!dodoBillingReady()) {
      return NextResponse.json(
        { error: 'Dodo Payments is not configured for this deployment.' },
        { status: 503 }
      )
    }

    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Sign in with an active organization to upgrade.' },
        { status: 401 }
      )
    }

    const canBill = await hasOrgPermission('recruiter:billing:write')
    const canSettings = await hasOrgPermission('recruiter:settings:write')
    if (!canBill && !canSettings) {
      return NextResponse.json(
        { error: 'Billing changes require org admin permissions.' },
        { status: 403 }
      )
    }

    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid checkout request. Choose plan and interval.' },
        { status: 400 }
      )
    }

    const plan = parsed.data.plan as PaidPlanTier
    const interval = parsed.data.interval as BillingInterval
    const productId = resolveProductIdForCheckout(plan, interval)
    if (!productId) {
      return NextResponse.json(
        {
          error: `No Dodo product configured for ${plan} (${interval}). Set DODO_PAYMENTS_PRODUCT_* env vars.`,
        },
        { status: 503 }
      )
    }

    const user = await currentUser()
    const email =
      user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress
    const name =
      [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
      email ||
      'Recruiter'

    if (!email) {
      return NextResponse.json(
        { error: 'A verified email is required to start checkout.' },
        { status: 400 }
      )
    }

    const client = getDodoClient()
    const returnUrl = getDodoReturnUrl()
    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email, name },
      return_url: returnUrl,
      metadata: {
        clerkOrgId: orgId,
        clerkUserId: userId,
        kymaPlan: plan,
        kymaInterval: interval,
      },
    })

    if (!session.checkout_url) {
      return NextResponse.json(
        { error: 'Checkout session did not return a URL.' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      checkoutUrl: session.checkout_url,
      sessionId: session.session_id,
    })
  } catch (error) {
    void reportError(error, { route: 'billing.checkout' })
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to start checkout. Try again.',
      },
      { status: 500 }
    )
  }
}
