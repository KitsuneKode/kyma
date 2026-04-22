# Env Model

## Canonical module

- Single source of truth: `lib/env/schema.ts`.
- Compatibility re-export: `lib/env.ts`.
- Runtime distribution wrappers:
  - `lib/env/public.ts` for `NEXT_PUBLIC_*` keys only.
  - `lib/env/server.ts` for app server keys (includes `server-only` guard).
  - `lib/env/agent.ts` for standalone agent runtime.
  - `lib/env/convex.ts` for Convex runtime.
- Prefer importing boundary wrappers directly based on callsite runtime.

## Boundary rules

- `NEXT_PUBLIC_*` values are client-safe and may be referenced by client code.
- Non-`NEXT_PUBLIC_*` values are server-only.
- Keep agent config separate from app runtime config (`agent.ts` is agent-only).
- Keep Convex runtime env handling separate via `lib/env/convex.ts`.
- Avoid direct `process.env` reads outside `lib/env/schema.ts` unless explicitly documented.

## Required vs optional

- Required values are validated by schema where needed.
- Optional values are explicit in schema and must have clear fallback behavior.
- Feature toggles use `"0" | "1"` and default-safe behavior.

## Local, CI, and production behavior

- Local: allow optional integrations (e.g. Clerk-disabled mode) without crashing.
- CI/production: fail fast when required variables for enabled surfaces are missing.
- Any new env key must be added to:
  1. schema/runtime mapping in `lib/env/schema.ts`
  2. distribution wrappers (`public.ts`, `server.ts`, `agent.ts`, `convex.ts`) based on runtime ownership
  3. documentation in this file when behavior is non-obvious
