# Plan 011: Peak polish + performance

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `.plans/implementation-wave/README.md`.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: .plans/implementation-wave/010-tier3-differentiation.md (partial; perf/auth can ship independently)
- **Category**: perf
- **Planned at**: horizontal hiring roadmap, 2026-06-25

## Why this matters

Recruiter and candidate surfaces must feel fast and premium without animation noise. Auth failures should use one consistent recovery pattern.

## Current state

- `convex/recruiter/templates.ts` — `listActiveTemplates` bounded with `.take()`
- `convex/recruiter/reviews.ts` — session-scoped lists bounded with `.take()`
- `lib/convex/preload-query.ts` — server `preloadQuery` helper
- `app/(admin)/recruiter/candidates/page.tsx` — `preloadQuery` + `usePreloadedQuery`
- `components/recruiter/recruiter-access-state.tsx` — shared recruiter auth/error UI
- `components/auth/app-auth-gate.tsx` — `WorkspaceEmptyState` + retry
- `app/(admin)/layout.tsx` — `WorkspaceShell`
- `lib/motion/use-motion-presets.ts` — reduced-motion aware presets

## Commands you will need

| Purpose   | Command             | Expected on success |
| --------- | ------------------- | ------------------- |
| Format    | `bun run fmt`       | exit 0              |
| Lint      | `bun run lint`      | exit 0              |
| Typecheck | `bun run typecheck` | exit 0              |
| Tests     | `bun run test`      | all pass            |
| Build     | `bun run build`     | exit 0              |

## Scope

**In scope**:

- P-2: Audit `.collect()` in `convex/recruiter/`; `preloadQuery` for review queue; fill `loading.tsx` gaps
- P-1: Dashboard stagger, table row hover/press, practice hub card hover, portal timeline stagger via `lib/motion/presets.ts`
- P-3: `AppAuthGate` + `RecruiterAccessState`; admin layout `WorkspaceShell`

**Out of scope**: Marketing `'use cache'` on auth-scoped routes

## Steps

### Step 1: Convex query bounds

Replace unbounded `.collect()` in recruiter handlers with `.take()` or pagination.

**Verify**: `rg '\\.collect\\(' convex/recruiter/` → no unbounded org-wide collects

### Step 2: Review queue preload

`serverPreloadConvexQuery` on candidates page; client hydrates with `usePreloadedQuery`.

**Verify**: `bun run typecheck` → exit 0

### Step 3: Motion peak pass

Apply `useMotionPresets()` to dashboard, `DataTable`, practice hub, candidate portal timeline.

**Verify**: `prefers-reduced-motion: reduce` removes transforms in browser

### Step 4: Auth consistency

`RecruiterAccessState` for dashboard, candidates, review failures; `AppAuthGate` empty states + retry.

**Verify**: signed-out recruiter shows consistent copy + recovery actions

### Step 5: Route loading shells

Add `loading.tsx` for health, template create/edit, screening create.

**Verify**: navigate recruiter sub-routes show skeletons during transition

## Done criteria

- [x] Recruiter convex handlers avoid unbounded `.collect()`
- [x] Candidates queue uses `preloadQuery` + `usePreloadedQuery`
- [x] Motion presets respect `prefers-reduced-motion`
- [x] Shared `RecruiterAccessState` wired on recruiter failure surfaces
- [x] Admin layout uses `WorkspaceShell`
- [x] Missing recruiter `loading.tsx` routes filled
- [x] `bun run fmt && bun run lint && bun run typecheck && bun run test && bun run build` pass
- [x] `.plans/implementation-wave/README.md` row 011 = DONE

## STOP conditions

- `preloadQuery` throws on unauthenticated SSR without fallback
- `WorkspaceShell` double-wraps padding on nested layouts

## Maintenance notes

- When plan 010 lands server-side queue filters, extend preload args to include filter params.
- Keep motion on property-specific transitions only; avoid `transition-all` on ops controls.
