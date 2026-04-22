# Env Model

## Canonical module

- Centralize Next.js runtime env reads in `lib/env.ts` using `@t3-oss/env-nextjs` + zod.
- Prefer importing `env` from `lib/env.ts` in app/lib/components codepaths.

## Boundary rules

- `NEXT_PUBLIC_*` values are client-safe and may be referenced by client code.
- Non-`NEXT_PUBLIC_*` values are server-only.
- Keep Convex runtime env handling separate when necessary (`convex/*` may keep direct `process.env` reads due to runtime constraints).

## Required vs optional

- Required values are validated by schema where needed.
- Optional values are explicit in schema and must have clear fallback behavior.
- Feature toggles use `"0" | "1"` and default-safe behavior.

## Local, CI, and production behavior

- Local: allow optional integrations (e.g. Clerk-disabled mode) without crashing.
- CI/production: fail fast when required variables for enabled surfaces are missing.
- Any new env key must be added to:
  1. `lib/env.ts` schema
  2. runtime mapping in `lib/env.ts`
  3. documentation in this file when behavior is non-obvious
