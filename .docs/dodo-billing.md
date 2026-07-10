# Dodo Payments Billing

Kyma uses [Dodo Payments](https://docs.dodopayments.com) for subscription billing.

## Env

| Variable                                   | Purpose                                 |
| ------------------------------------------ | --------------------------------------- |
| `DODO_PAYMENTS_API_KEY`                    | Server API key                          |
| `DODO_PAYMENTS_WEBHOOK_KEY`                | Webhook signing secret                  |
| `DODO_PAYMENTS_ENVIRONMENT`                | `test_mode` or `live_mode`              |
| `DODO_PAYMENTS_RETURN_URL`                 | Optional checkout return URL            |
| `DODO_PAYMENTS_PRODUCT_PRO_MONTHLY`        | Dodo product id                         |
| `DODO_PAYMENTS_PRODUCT_PRO_YEARLY`         | Dodo product id                         |
| `DODO_PAYMENTS_PRODUCT_ENTERPRISE_MONTHLY` | Dodo product id                         |
| `DODO_PAYMENTS_PRODUCT_ENTERPRISE_YEARLY`  | Dodo product id                         |
| `KYMA_ORG_PLAN_OVERRIDE`                   | Manual `free\|pro\|enterprise` override |
| `KYMA_PROCESSING_WRITE_KEY`                | Required for webhook → Convex sync      |

## Routes

- `POST /api/billing/checkout` — create checkout session (metadata includes `clerkOrgId`)
- `POST /api/billing/portal` — open Dodo customer portal
- `POST /api/webhooks/dodo` — subscription lifecycle → `organizations.plan`

## Plan resolution

1. `KYMA_ORG_PLAN_OVERRIDE` if set
2. `organizations.plan` from Dodo webhooks
3. Default `free`

Quotas: `lib/saas/plans.ts` / `convex/helpers/orgPlan.ts`.  
Entitlements: `lib/auth/entitlements.ts` (includes `recruiter:byok` on Pro+).

## Dashboard setup

1. Create Pro / Enterprise subscription products in Dodo.
2. Copy product IDs into env.
3. Point webhook to `https://<host>/api/webhooks/dodo`.
4. Confirm `KYMA_PROCESSING_WRITE_KEY` is set on Vercel + Convex.
