# Security + Maintainability Guide

Read this when working on auth, provider keys, recruiter data, webhook routes, AI providers, or large refactors.

## Current Security Priorities

### 1. Protect provider secrets

The current stack uses server-side env vars for:

- LiveKit server keys
- Clerk secrets
- Inngest signing/event keys
- future report-chat or BYOK model credentials

Rules:

- never expose provider secrets to the browser
- never place raw provider keys in client components
- never log secrets, bearer tokens, or full webhook headers
- do not persist workspace BYOK secrets in plaintext

### 2. Treat webhook routes as hostile input

The following routes must remain server-only and signature-validated:

- `/api/livekit/webhook`
- `/api/inngest`
- future third-party callback routes

Rules:

- verify signatures before trusting payloads
- work from raw request bodies when providers require it
- normalize and validate payloads before writing to Convex
- do not let webhook payloads directly decide recruiter-facing outcomes without a product-layer check

### 3. Keep recruiter AI grounded

Recruiter chat must answer only from:

- transcript
- evidence
- report summary
- session metadata

Rules:

- no free-form “judge the candidate from vibes” prompts
- always ground on report/transcript context
- prefer explicit uncertainty over hallucination
- store chat history separately from the report itself

### 5. Protect background assessment writes

Assessment/report writes currently originate from server-side processing flows.

Rules:

- prefer recruiter auth for recruiter-initiated writes
- protect background report writes with `KYMA_PROCESSING_WRITE_KEY` in deployed environments
- do not expose the processing key to the browser
- if the key is unset, treat that as a local/dev convenience only, not the intended production posture
- production / non-dev Convex deployments must never trust an empty or missing processing key; local empty-key fallback is limited to clear `NODE_ENV=development`
- HTTP rate-limit helpers (`lib/http/server-rate-limit.ts`) throw in production when the processing key is missing — they must not silently no-op

### 4. BYOK must not leak tenant keys to our server runtime longer than necessary

Canonical design: **[`.docs/byok-architecture.md`](./byok-architecture.md)** (encrypt at rest, decrypt only in server/job/agent, never client, log redaction, platform vs BYOK).

Shipped BYOK posture:

- workspace admin provides provider credentials through `/recruiter/settings` (server mutations only)
- credentials are encrypted at rest with AES-256-GCM via `KYMA_ENCRYPTION_KEY` (`convex/helpers/encryption.ts`; longer-term KMS/envelope rotation still open)
- runtime decrypts only in server/job paths (`lib/providers/resolve-model.ts`, agent worker, report-chat)
- decrypted credentials are never shipped to the client; UI shows masked tails only
- redact keys from logs, traces, and error messages
- adding BYOK keys requires Pro/Enterprise (Dodo billing or `KYMA_ORG_PLAN_OVERRIDE`)
- until remaining BYOK gaps in that doc are closed, keep expanding BYOK off the critical path; platform env keys remain fine for fallbacks

### 4b. Billing (Dodo Payments)

- Checkout + customer portal: `/api/billing/checkout`, `/api/billing/portal`
- Webhooks: `/api/webhooks/dodo` (signature-verified via `@dodopayments/nextjs`)
- Org plan mirrored on `organizations` and applied to quotas / entitlements
- Manual override remains `KYMA_ORG_PLAN_OVERRIDE` for design partners

### ADR: shipped hardening (Kyma next-phase)

- **HTTP rate limits:** `lib/http/server-rate-limit.ts` (Convex `@convex-dev/rate-limiter` via `assertServerRateLimit`) guards `/api/interviews/bootstrap` (`publicSnapshot` + `livekitToken`), `/api/interviews/process`, and `/api/recruiter/report-chat`. Production requires `KYMA_PROCESSING_WRITE_KEY` or the helper throws.
- **Convex throttles:** `appendSessionEvent` and `upsertTranscriptSegment` reject excessive per-session write volume (rolling minute window).
- **Capability-bound public writes:** candidate browser writes must include a matching `inviteToken` + `sessionId`; server paths use internal mutations.
- **Webhook idempotency:** webhook event writes are deduped per session via `dedupeKey` to avoid duplicate timeline mutations from retries.
- **Audit trail:** `auditEvents` table written via `convex/helpers/audit.ts` for review decisions, recruiter notes, screening batch create/expiry extend, and workspace BYOK/settings changes (never raw keys).
- **BYOK design:** `.docs/byok-architecture.md` — encrypt at rest, server-only decrypt, platform vs org keys.
- **Server model boundary:** `lib/providers/resolve-model.ts` — keep all provider resolution server-side.
- **Review reads are JWT-only:** `getCandidateReviewDetail` uses `candidateReadQuery` and never accepts a processing key. Pipeline session reads use `loadSessionReviewBaseForPipeline` inside `pipelineQuery` after the key is validated by the wrapper.
- **Assessment writes are pipeline-only:** `processing/assessment.saveAssessmentReport` is the sole write path; the dual recruiter/dev write entry was removed.

## Current Maintainability Priorities

### 1. Split by domain, not by page whim

Preferred backend domain boundaries:

- `convex/interviews/*`
- `convex/livekit.ts`
- `convex/processing/assessment.ts`
- `convex/recruiter/*`
- `convex/admin.ts`

Preferred frontend domain boundaries:

- `components/interview/*`
- `components/recruiter/*`
- `components/admin/*`
- `lib/assessment/*`
- `lib/livekit/*`

If a feature crosses these boundaries, first look for a shared abstraction.

### 2. Keep product logic out of page files

Pages should primarily:

- fetch data
- compose sections
- hand off to domain components

They should not become the main home for:

- scoring logic
- provider SDK logic
- payload normalization
- reusable state machines

### 3. Prefer explicit contracts

Important contracts should live in one place:

- report generation: `lib/assessment/report-engine.ts`
- processing orchestration: `lib/assessment/process-session.ts`
- interview snapshot normalization: `lib/interview/snapshot.ts`

Do not duplicate report-shaping logic in UI routes, API routes, and Inngest handlers.

### 4. Generated and vendor-like files should not drive local quality noise

Primary repo tooling should focus on app code.

Ignore or isolate:

- `convex/_generated/**`
- `.agents/**`
- `.context/**`
- build output

### 5. Keep automated scoring conservative

The first-pass report engine should:

- be evidence-backed
- be reviewable
- degrade confidence when transcript quality is weak
- avoid pretending certainty where the signal is thin

Only add model-based grading on top of that stable contract.

## Immediate Bad-Practice Watchlist

- server routes silently falling back without recording the failure reason
- duplicated validators and enums across multiple files
- page files growing into orchestration layers
- direct provider SDK usage from random components instead of shared server boundaries
- storing invite/session/report child data as unbounded arrays inside parent records
- shipping recruiter or workspace secrets into client-side env vars

## Best Next Hardening Steps

1. Move more repeated validators/constants into shared domain modules.
2. Close remaining BYOK gaps in `.docs/byok-architecture.md` (KMS rotation, owner-run item 6) before broadening provider UI.
3. Keep shared Convex rate-limit budgets tuned under load (`livekitToken` / `publicSnapshot` / chat / report).
4. Extend audit coverage to any new sensitive admin mutations as they land.
5. Keep strengthening the teaching-simulation evidence model so recruiter claims map cleanly to transcript and session events.
