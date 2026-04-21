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

### 4. BYOK must not leak tenant keys to our server runtime longer than necessary

Target architecture for BYOK:

- workspace admin provides provider credentials through a dedicated server-only settings flow
- credentials are encrypted at rest with a KMS-managed envelope key or equivalent secret-management layer
- runtime retrieves decrypted credentials only when needed for the request/job
- decrypted credentials are never shipped to the client
- redact keys from logs, traces, and error messages

Until that exists, keep BYOK out of the critical path.

## Current Maintainability Priorities

### 1. Split by domain, not by page whim

Preferred backend domain boundaries:

- `convex/interviews.ts`
- `convex/livekit.ts`
- `convex/recruiter.ts`
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
2. Add a dedicated workspace settings boundary before BYOK.
3. Encrypt BYOK secrets at rest instead of storing them as ordinary records.
4. Add rate limiting or abuse controls on public invite and recruiter chat routes.
5. Add a central audit trail for recruiter actions and sensitive admin changes.
