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

## Local, CI, and production behavior

- Local: allow optional integrations (e.g. Clerk-disabled mode) without crashing.
- CI/production: fail fast when required variables for enabled surfaces are missing.
- Any new env key must be added to:
  1. `lib/env/shared.ts`
  2. `lib/env/client.ts` if it is `NEXT_PUBLIC_*`
  3. documentation in this file when behavior is non-obvious
