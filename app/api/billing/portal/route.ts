import { auth } from '@clerk/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { NextResponse } from 'next/server'

import { api } from '@/convex/_generated/api'
import { hasOrgPermission } from '@/lib/auth/access'
import { dodoBillingReady, getDodoClient } from '@/lib/billing/dodo'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { reportError } from '@/lib/ops/error-reporting'

export async function POST() {
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
        { error: 'Sign in with an active organization.' },
        { status: 401 }
      )
    }

    const canBill = await hasOrgPermission('recruiter:billing:write')
    const canSettings = await hasOrgPermission('recruiter:settings:write')
    if (!canBill && !canSettings) {
      return NextResponse.json(
        { error: 'Billing portal requires org admin permissions.' },
        { status: 403 }
      )
    }

    const token = await getServerConvexAuthToken()
    const billing = await fetchQuery(
      api.billing.getOrgBilling,
      {},
      { token: token ?? undefined }
    )

    const customerId = billing.customerId?.trim()
    if (!customerId) {
      return NextResponse.json(
        {
          error:
            'No Dodo customer is linked yet. Complete checkout first, then manage billing here.',
        },
        { status: 400 }
      )
    }

    const client = getDodoClient()
    const portal = await client.customers.customerPortal.create(customerId)

    if (!portal.link) {
      return NextResponse.json(
        { error: 'Customer portal session did not return a URL.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ portalUrl: portal.link })
  } catch (error) {
    void reportError(error, { route: 'billing.portal' })
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to open billing portal.',
      },
      { status: 500 }
    )
  }
}
