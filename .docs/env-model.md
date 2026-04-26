# Env Model

## Canonical modules

- Shared schema definitions: `lib/env/shared.ts`
- Next.js server env: `lib/env/server.ts`
- Next.js client env: `lib/env/client.ts`
- Standalone runtime env for Convex, agents, and scripts: `lib/env/runtime.ts`
- Prefer importing the boundary-specific module directly from the runtime that owns the code.

## Boundary rules

- `NEXT_PUBLIC_*` values are client-safe and may be referenced by client code via `lib/env/client.ts`.
- Non-`NEXT_PUBLIC_*` values are server-only and should come from either `lib/env/server.ts` or `lib/env/runtime.ts`.
- Use `lib/env/server.ts` only inside Next.js server code.
- Use `lib/env/runtime.ts` only inside standalone runtimes such as Convex, agent workers, or scripts.
- Avoid direct `process.env` reads outside the env modules unless explicitly documented.

## Required vs optional

- Required values are validated by schema where needed.
- Optional values are explicit in schema and must have clear fallback behavior.
- Feature toggles use `"0" | "1"` and default-safe behavior.

## Practical matrix

Use this when deciding whether a missing env var is a real blocker or just a
feature toggle.

### Core local interview stack

Required for the main local product loop (`Next.js` + `Convex` + `LiveKit`):

- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

Without these, the main interview and recruiter-review paths degrade or stay
disconnected.

### Clerk-backed admin auth

Only required when testing recruiter/admin auth surfaces:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET` (required when using `/api/webhooks/clerk`)
- one of:
  - `CLERK_FRONTEND_API_URL`
  - `CLERK_JWT_ISSUER_DOMAIN`

If these are absent, local public candidate work should still be able to run in
Clerk-disabled mode.

### LiveKit agent tuning

Optional because the worker has defaults or safe fallbacks:

- `LIVEKIT_AGENT_NAME`
- `LIVEKIT_AGENT_STT_MODEL`
- `LIVEKIT_AGENT_LLM_MODEL`
- `LIVEKIT_AGENT_TTS_MODEL`
- `LIVEKIT_AGENT_CHILD_TTS_MODEL`
- `LIVEKIT_AGENT_WRAP_TTS_MODEL`
- `LIVEKIT_AGENT_INSTRUCTIONS`
- `LIVEKIT_AGENT_CHILD_INSTRUCTIONS`
- `LIVEKIT_AGENT_WRAP_UP_INSTRUCTIONS`
- `LIVEKIT_AGENT_LOG_LEVEL`

These shape behavior but should not be treated as boot blockers for the base
stack.

### Recruiter copilot

Optional:

- `KYMA_REVIEW_CHAT_MODEL`

If missing, recruiter chat should fall back to deterministic grounded answers
instead of crashing.

### Recording and egress

Only required when room recording is explicitly enabled:

- `LIVEKIT_RECORDING_ENABLED='1'`
- `LIVEKIT_RECORDING_AUDIO_ONLY`
- `LIVEKIT_RECORDING_TEMPLATE_URL`
- `LIVEKIT_RECORDING_STORAGE_BUCKET`
- `LIVEKIT_RECORDING_STORAGE_REGION`
- `LIVEKIT_RECORDING_STORAGE_ACCESS_KEY`
- `LIVEKIT_RECORDING_STORAGE_SECRET_KEY`

If these are incomplete, recording should be skipped with a clear log message.

### Inngest

Only required for the deployed or fully wired background-job path:

- `INNGEST_APP_ID`
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`

## Convex auth config note

Keep `convex/auth.config.ts` env usage intentionally narrow.

- Do not import the full shared runtime env into `convex/auth.config.ts`.
- Read only the Clerk-related env keys used to build the auth provider config.

Convex inspects that file directly during startup, and broad env imports can
make unrelated keys look like auth requirements, which leads to misleading
errors.

## Local, CI, and production behavior

- Local: allow optional integrations (e.g. Clerk-disabled mode) without crashing.
- CI/production: fail fast when required variables for enabled surfaces are missing.
- Any new env key must be added to:
  1. `lib/env/shared.ts`
  2. `lib/env/client.ts` if it is `NEXT_PUBLIC_*`
  3. documentation in this file when behavior is non-obvious
