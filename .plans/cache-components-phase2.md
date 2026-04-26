# Cache Components Phase 2 Migration Plan

## Goal

Adopt Next.js Cache Components incrementally for UX/perf wins without
breaking existing dynamic API handlers or auth-sensitive pages.

## Current Constraints

- Enabling `cacheComponents` globally currently breaks route handlers that export:
  - `dynamic = 'force-dynamic'`
  - `revalidate = 0`
- These patterns exist across multiple `app/api/*` routes and must be
  migrated deliberately.

## Migration Strategy

### Step 1 - Baseline and Safety

- Keep `cacheComponents` disabled.
- Keep current ISR on `app/(marketing)/page.tsx` (`revalidate = 3600`).
- Maintain dynamic behavior for:
  - `app/(admin)/*`
  - `app/(app)/dashboard/*`
  - `app/interviews/[inviteId]`
  - `app/api/*`

### Step 2 - Route Handler Compatibility Sweep

- For each `app/api/*/route.ts`:
  - Remove segment config exports incompatible with Cache Components.
  - Preserve runtime semantics using explicit request-time APIs and logic.
- Verify each route with integration tests and `bun run build`.

### Step 3 - Enable `cacheComponents`

- Add `cacheComponents: true` in `next.config.mjs` once API routes are compatible.
- Build and run full test suite:
  - `bun run typecheck`
  - `bun run lint`
  - `bun run test`
  - `bun run build`

### Step 4 - Apply `use cache` Selectively

- Start with static/public shells only:
  - `app/(marketing)/page.tsx`
  - `app/not-found.tsx`
  - `app/interviews/page.tsx`
- Use:
  - `'use cache'`
  - `cacheLife('hours')` or `cacheLife('max')` based on content volatility.

### Step 5 - Tagging and Invalidation

- Add tags where content is CMS/config driven:
  - `cacheTag('marketing')`
  - `cacheTag('pricing')` (if added later)
- Add targeted invalidation hooks with `updateTag()` only where needed.

### Step 6 - Guardrails for Auth/Personalized Data

- Do **not** cache user-specific dashboard data in shared cache.
- If private caching is introduced later:
  - use `'use cache: private'`
  - scope by user/session inputs
  - validate no leakage across users

### Step 7 - Observability and Rollback

- Track build output route modes before/after migration.
- Record TTFB/LCP deltas on marketing routes.
- Keep a revert-ready commit for `cacheComponents` toggle + route updates.

## Acceptance Criteria

- `cacheComponents` enabled with clean build.
- No regression in API route behavior.
- Marketing/static routes benefit from cache directives and retain correctness.
- Auth and live interview flows remain request-accurate and uncached where required.
