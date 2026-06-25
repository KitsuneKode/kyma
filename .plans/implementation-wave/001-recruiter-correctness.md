# Plan 001: Recruiter correctness and triage UX

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `.plans/implementation-wave/README.md`.
>
> **Drift check (run first)**: `git diff --stat e1fa1d1..HEAD -- components/recruiter/candidates-table.tsx lib/recruiter/candidate-queue-filters.ts app/(admin)/recruiter/screenings/page.tsx app/(admin)/recruiter/candidates/page.tsx components/recruiter/rubric-verdict.tsx components/workspace/query-state.tsx components/auth/`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `e1fa1d1`, 2026-06-25

## Why this matters

Recruiter deep links and error surfaces were unreliable: queue filters ignored URL params, duplicate rubric charts cluttered review pages, and Convex failures looked like empty data. Fixing these restores trust in triage flows before chart or SSR work.

## Current state

- `components/recruiter/candidates-table.tsx` — client table; must sync `status` / `recommendation` query params.
- `lib/recruiter/candidate-queue-filters.ts` — shared parser for URL filters.
- `components/recruiter/rubric-verdict.tsx` — must not render radar (keep bars + dimension list only).
- `components/recruiter/review-assessment-bento.tsx` — primary radar location.
- `app/(admin)/recruiter/screenings/page.tsx` — distinguish query failure vs empty.
- `components/workspace/query-state.tsx` — shared loading/empty/error helper.
- Design: `.interface-design/system.md` — one focal raised surface per view, `max-w-7xl` recruiter canvas.

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

- `lib/recruiter/candidate-queue-filters.ts` (+ test)
- `components/recruiter/candidates-table.tsx`
- `components/recruiter/rubric-verdict.tsx`
- `app/(admin)/recruiter/screenings/page.tsx`
- `app/(admin)/recruiter/candidates/page.tsx`
- `components/workspace/query-state.tsx`
- `components/auth/auth-setup-required.tsx`, `components/auth/convex-auth-setup-panel.tsx`
- `components/auth/app-auth-gate.tsx` (skeleton, not blank)
- `app/(admin)/recruiter/loading.tsx`, screening create layout width fixes

**Out of scope**: Marketing pages, candidate interview track, Convex pagination refactors.

## Steps

### Step 1: URL-synced queue filters

Add `useSearchParams` + `router.replace` in `candidates-table.tsx`; wrap page in `<Suspense>`. Parser lives in `lib/recruiter/candidate-queue-filters.ts`.

**Verify**: `bun run test -- lib/recruiter/candidate-queue-filters.test.ts` → pass

### Step 2: Remove duplicate radar

Remove `RubricRadar` from `rubric-verdict.tsx`; keep radar in `review-assessment-bento.tsx` only.

**Verify**: `rg 'RubricRadar' components/recruiter/rubric-verdict.tsx` → no matches

### Step 3: Unified query states

Use `WorkspaceQueryState` on screenings list; show `Alert` for failed candidate stats; wire `Alert` on auth setup panels.

**Verify**: `bun run typecheck` → exit 0

## Done criteria

- [x] `/recruiter/candidates?status=manual_review` pre-selects filter
- [x] Review page shows one radar (assessment bento)
- [x] Failed Convex queries show error UI, not silent zeros/empty tables
- [x] `bun run test && bun run build` pass
- [x] `.plans/implementation-wave/README.md` row 001 = DONE

## STOP conditions

- Parser tests fail after URL sync changes
- `ReviewProvider` missing for review console children
- Build requires editing marketing routes

## Maintenance notes

- Extend URL filter pattern to screenings list when filters are added.
- Reviewers should confirm deep-link behavior manually in browser.
