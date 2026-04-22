# Contributing to Kyma

Thanks for your interest. Kyma is a small codebase with a clear split between **candidate flow**, **recruiter/admin**, and **backend** (Convex + API routes).

## Principles

- **Reliability over demos** — predictable session lifecycle, no silent data loss.
- **Server-only secrets** — never commit API keys; use env on the host or CI.
- **Docs follow behavior** — if you change routes, env, or product behavior, update [`.docs/current-findings.md`](.docs/current-findings.md) in the same change when practical.

## Local development

```bash
bun install
bun run convex:once
bun run dev
# optional: second terminal
bun run convex:dev
# optional: agent worker
bun run agent:dev
```

See [README](README.md) for environment variables and stack overview.

## Quality checks

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

## Pull requests

1. **Scope:** One logical change per PR when possible.
2. **Description:** What changed, why, and how to test (or link to a manual path).
3. **Breaking changes:** Call out Convex schema or env renames explicitly.

## Convex

- Do not use the Next.js `@/` path alias from `convex/*` for shared code — use **relative** imports into `lib/` (see `convex/interviews.ts`).
- New helpers under `convex/helpers/` must use **valid** filenames for Convex (alphanumeric, underscore, period only in path components).

## Where to look

- Product direction: [`.docs/next-phase-prd.md`](.docs/next-phase-prd.md)
- Architecture: [`.docs/architecture.md`](.docs/architecture.md) and [`.docs/route-and-api-architecture.md`](.docs/route-and-api-architecture.md)

## Code of conduct

Be respectful and constructive. This is an open-source–style repository for collaboration and review.
