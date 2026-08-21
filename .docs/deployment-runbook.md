# Deployment Runbook — kyma.kitsunelabs.xyz

Practical checklist for deploying Kyma on **Vercel (Next.js)** + **Convex** +
**LiveKit agent worker** + optional **Inngest** / **Clerk**.

Canonical env model: [`.docs/env-model.md`](./env-model.md).  
Templates: [`.env.example`](../.env.example), [`convex/.env.example`](../convex/.env.example).

Production host: `https://kyma.kitsunelabs.xyz`

---

## 1. Pre-deploy checklist

- [ ] `bun run fmt:check && bun run lint && bun run typecheck && bun run test`
- [ ] Confirm target Convex deployment (prod vs preview) — never run `db:reset:dev` / `db:seed:dev` against prod
- [ ] Confirm Vercel project env matches the matrix below for **Production**
- [ ] LiveKit agent worker image/process ready to run with the same LiveKit + provider keys
- [ ] Clerk production instance (if recruiter auth enabled): JWT templates + webhook URL

---

## 2. Environment matrix

### Core (required for interview loop)

| Variable                                 | Where           | Notes                                                            |
| ---------------------------------------- | --------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_CONVEX_URL`                 | Vercel          | Convex HTTP URL for the **prod** deployment                      |
| `NEXT_PUBLIC_LIVEKIT_URL`                | Vercel          | LiveKit Cloud / self-hosted WS URL                               |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | Vercel + agent  | Token mint + room APIs                                           |
| `KYMA_PROCESSING_WRITE_KEY`              | Vercel + Convex | **Required in production** for report writes / worker heartbeats |
| `KYMA_DEPLOYMENT_ENV`                    | Vercel / Convex | **Required** `production` on the live site — see note below      |
| `NODE_ENV`                               | Convex          | **Required** `production` on the Convex prod deployment          |

> **Why both are required.** `NODE_ENV` is declared with `.default('development')`
> in `lib/env/shared.ts`, and Convex deployments do not set it automatically. The
> dev-seed/reset guard (`convex/devSeed.ts`) and the processing-key fallback
> (`convex/helpers/processingAuth.ts`) both treat an unset value as untrusted, so
> leaving these blank on a production Convex deployment previously left a
> destructive seeding path reachable. Set both explicitly.

### Clerk (recruiter / admin)

| Variable                                              | Where           | Notes                 |
| ----------------------------------------------------- | --------------- | --------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`                   | Vercel          | Production Clerk app  |
| `CLERK_SECRET_KEY`                                    | Vercel          | Server                |
| `CLERK_FRONTEND_API_URL` or `CLERK_JWT_ISSUER_DOMAIN` | Vercel + Convex | Convex JWT validation |
| `CLERK_WEBHOOK_SIGNING_SECRET`                        | Vercel          | `/api/webhooks/clerk` |

Sync Clerk-related keys into Convex with `bun run convex:sync-env:prod` (or dashboard).

### Provider / scoring

| Variable                                                  | Where          | Notes                                                          |
| --------------------------------------------------------- | -------------- | -------------------------------------------------------------- |
| `OPENAI_API_KEY` / `GOOGLE_API_KEY` / `ANTHROPIC_API_KEY` | Vercel + agent | Platform fallbacks; org BYOK still needs `KYMA_ENCRYPTION_KEY` |
| `KYMA_SCORING_MODEL` / `KYMA_REVIEW_CHAT_MODEL`           | Vercel         | Optional overrides                                             |
| `LIVEKIT_AGENT_*_MODEL`                                   | Agent worker   | STT / LLM / TTS                                                |

### Background jobs

| Variable                                                       | Where                       | Notes                                           |
| -------------------------------------------------------------- | --------------------------- | ----------------------------------------------- |
| `INNGEST_APP_ID` / `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | Vercel (+ Convex event key) | Without event key, processing falls back inline |

### Optional SaaS ops (scaffolded)

| Variable                        | Where  | Notes                                                                    |
| ------------------------------- | ------ | ------------------------------------------------------------------------ |
| `RESEND_API_KEY` / `EMAIL_FROM` | Vercel | See [email-notifications.md](./email-notifications.md)                   |
| `SENTRY_DSN`                    | Vercel | Only after installing `@sentry/nextjs`; see `lib/ops/error-reporting.ts` |

### Recording (only if enabled)

Set `LIVEKIT_RECORDING_ENABLED=1` plus storage + template vars from `.env.example`.

### Public URL

| Variable              | Notes                                                          |
| --------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL` | Prefer `https://kyma.kitsunelabs.xyz` (absolute links / email) |
| `VERCEL_URL`          | Injected by Vercel; do not rely on it for canonical links      |

---

## 3. Deploy sequence

1. **Convex functions** — deploy schema/functions to the production Convex deployment (`npx convex deploy` from CI or an owner-run prod pipeline; agents should not deploy prod casually).
2. **Sync Convex env** — `bun run convex:sync-env:prod` or set keys in the Convex dashboard (`KYMA_PROCESSING_WRITE_KEY`, Clerk JWT issuer, Inngest event key, encryption key).
3. **Vercel** — promote / deploy the Next.js app; confirm Production env vars.
4. **Inngest** — ensure the app points at `https://kyma.kitsunelabs.xyz/api/inngest` (or the Vercel production URL) with matching signing keys.
5. **LiveKit agent** — start/restart `bun run agent:start` (or your process manager) with production LiveKit + provider env; confirm `LIVEKIT_AGENT_NAME` matches token dispatch.
6. **Clerk webhook** — production endpoint `https://kyma.kitsunelabs.xyz/api/webhooks/clerk`.

---

## 4. Smoke tests (post-deploy)

Run in order; stop on first hard failure.

### A. Static / health

- [ ] `GET https://kyma.kitsunelabs.xyz/` returns 200
- [ ] Open recruiter ops/health surface if available (platform health uses `lib/ops/platform-health.ts`) — Convex, LiveKit, processing key, agent liveness should not be `error`
- [ ] `bun run test:e2e` against production only if intentionally configured (`PLAYWRIGHT_BASE_URL`)

### B. Auth (when Clerk enabled)

- [ ] `/sign-in/recruiter` → sign in → lands on `/recruiter`
- [ ] Candidate sign-in path still works for invite claim flows
- [ ] Cross-org isolation: recruiter A cannot open recruiter B session URLs (see auth cutover checklist)

### C. Interview path

- [ ] Create or reuse a screening invite
- [ ] Open `/i/<token>` → bootstrap succeeds (network: `POST /api/interviews/bootstrap` 200)
- [ ] Join LiveKit room; agent joins within ~30s
- [ ] Speak briefly; transcript segments appear
- [ ] Submit / end session → `POST /api/interviews/process` succeeds (queued or inline fallback)
- [ ] Report appears on recruiter session detail; scores are structured + evidence-backed

### D. Webhooks / jobs

- [ ] LiveKit webhook deliveries succeed (`/api/livekit/webhook`)
- [ ] Inngest dashboard shows processing events (or confirm intentional inline fallback in logs)

---

## 5. Rollback

### Vercel (Next.js)

1. Vercel Dashboard → Project → Deployments → previous healthy Production deployment → **Promote to Production**.
2. Confirm `https://kyma.kitsunelabs.xyz` serves the prior build.
3. Re-run smoke A + C bootstrap at minimum.

### Convex

1. Prefer forward-fix for schema; if a function regression shipped, redeploy the previous known-good Convex commit to the **same** production deployment.
2. Do **not** reset or reseed production data.
3. If env was changed, restore prior `KYMA_PROCESSING_WRITE_KEY` / Clerk issuer values before traffic returns.

### Agent / Inngest

1. Roll agent worker back to the previous container/commit; keep LiveKit credentials unchanged if possible.
2. Pause or revert Inngest app sync if a bad function was published; processing may temporarily use inline fallback.

### Decision guide

| Symptom                         | First action                                                         |
| ------------------------------- | -------------------------------------------------------------------- |
| UI broken, API OK               | Vercel promote previous deployment                                   |
| Bootstrap / Convex query errors | Check Convex deploy + env; redeploy prior functions                  |
| Room connects, no agent         | Restart / roll back agent worker; check `LIVEKIT_AGENT_NAME`         |
| Report never appears            | Check Inngest + `KYMA_PROCESSING_WRITE_KEY`; inspect processing logs |

---

## 6. Related docs

- [env-model.md](./env-model.md) — required vs optional keys
- [email-notifications.md](./email-notifications.md) — Resend scaffold
- [auth-org-rbac-cutover-checklist.md](./auth-org-rbac-cutover-checklist.md) — Clerk / org QA
- [security-and-maintainability.md](./security-and-maintainability.md) — processing key + BYOK
- [current-findings.md](./current-findings.md) — live engineering state
