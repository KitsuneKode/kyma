'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { quotasForPlan } from '@/lib/saas/plans'
import type { OrgPlanTier } from '@/lib/auth/entitlements'
import { PAID_PLAN_LABELS, type BillingInterval } from '@/lib/billing/plans'
import { cn } from '@/lib/utils'

export type OrgBillingView = {
  plan: OrgPlanTier
  status?: string
  productId?: string
  subscriptionId?: string
  customerId?: string
  currentPeriodEnd?: number
  cancelAtPeriodEnd?: boolean
  updatedAt?: number
  overrideActive: boolean
}

function formatPeriodEnd(ms?: number) {
  if (!ms) return null
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function BillingSettingsPanel({
  billing,
  catalogConfigured,
  dodoReady,
  readOnly = false,
}: {
  billing: OrgBillingView
  catalogConfigured: boolean
  dodoReady: boolean
  readOnly?: boolean
}) {
  const [busy, setBusy] = useState<'checkout' | 'portal' | null>(null)
  const quotas = quotasForPlan(billing.plan)

  async function startCheckout(
    plan: 'pro' | 'enterprise',
    interval: BillingInterval
  ) {
    setBusy('checkout')
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval }),
      })
      const payload = (await response.json()) as {
        checkoutUrl?: string
        error?: string
      }
      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error ?? 'Checkout failed.')
      }
      window.location.assign(payload.checkoutUrl)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to start checkout.'
      )
      setBusy(null)
    }
  }

  async function openPortal() {
    setBusy('portal')
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' })
      const payload = (await response.json()) as {
        portalUrl?: string
        error?: string
      }
      if (!response.ok || !payload.portalUrl) {
        throw new Error(payload.error ?? 'Portal failed.')
      }
      window.location.assign(payload.portalUrl)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to open billing portal.'
      )
      setBusy(null)
    }
  }

  return (
    <WorkspaceSurface id="billing" className="scroll-mt-24 space-y-5 p-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Billing
        </p>
        <h2 className="text-lg font-semibold tracking-tight">
          Plan & entitlements
        </h2>
        <p className="text-sm text-muted-foreground">
          Subscriptions are billed through Dodo Payments. Workspace BYOK and
          higher screening quotas unlock on Pro and Enterprise.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border/50 bg-foreground/[0.02] p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Current plan
          </p>
          <p className="mt-1 text-2xl font-semibold capitalize">
            {billing.plan}
          </p>
          {billing.overrideActive ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-200">
              Manual plan override is active for this deployment.
            </p>
          ) : null}
          {billing.status ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Status: {billing.status}
              {billing.cancelAtPeriodEnd ? ' · cancels at period end' : ''}
            </p>
          ) : null}
          {formatPeriodEnd(billing.currentPeriodEnd) ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Renews / ends {formatPeriodEnd(billing.currentPeriodEnd)}
            </p>
          ) : null}
        </div>
        <div className="rounded-xl border border-border/50 bg-foreground/[0.02] p-4 sm:col-span-2">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Quotas
          </p>
          <ul className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
            <li>
              <span className="font-medium text-foreground">
                {quotas.maxCandidatesPerBatch}
              </span>{' '}
              candidates / batch
            </li>
            <li>
              <span className="font-medium text-foreground">
                {quotas.maxBatchesPer30Days}
              </span>{' '}
              batches / 30d
            </li>
            <li>
              <span className="font-medium text-foreground">
                {quotas.maxActiveInvites}
              </span>{' '}
              active invites
            </li>
          </ul>
        </div>
      </div>

      {!dodoReady ? (
        <p className="text-sm text-muted-foreground">
          Dodo Payments is not configured on this deployment. Set{' '}
          <code className="text-xs">DODO_PAYMENTS_API_KEY</code> and{' '}
          <code className="text-xs">DODO_PAYMENTS_WEBHOOK_KEY</code> to enable
          checkout.
        </p>
      ) : null}

      {dodoReady && !catalogConfigured ? (
        <p className="text-sm text-muted-foreground">
          Product IDs are missing. Configure{' '}
          <code className="text-xs">DODO_PAYMENTS_PRODUCT_*</code> env vars for
          Pro / Enterprise.
        </p>
      ) : null}

      {!readOnly && dodoReady && catalogConfigured ? (
        <div className="flex flex-wrap gap-2">
          {(['pro', 'enterprise'] as const).map((plan) => (
            <Button
              key={plan}
              type="button"
              variant={billing.plan === plan ? 'outline' : 'default'}
              disabled={busy !== null || billing.plan === plan}
              onClick={() => startCheckout(plan, 'month')}
              className={cn(billing.plan === plan && 'opacity-70')}
            >
              {busy === 'checkout'
                ? 'Redirecting…'
                : billing.plan === plan
                  ? `On ${PAID_PLAN_LABELS[plan]}`
                  : `Upgrade to ${PAID_PLAN_LABELS[plan]}`}
            </Button>
          ))}
          {billing.customerId ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={openPortal}
            >
              {busy === 'portal' ? 'Opening…' : 'Manage billing'}
            </Button>
          ) : null}
        </div>
      ) : null}
    </WorkspaceSurface>
  )
}
