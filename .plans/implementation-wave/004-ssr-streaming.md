# Plan 004: SSR streaming (recruiter routes)

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `.plans/implementation-wave/README.md`.
>
> **Drift check (run first)**: `git diff --stat e1fa1d1..HEAD -- app/(admin)/recruiter/page.tsx components/recruiter/recruiter-dashboard-loader.tsx components/auth/app-auth-gate.tsx app/(admin)/recruiter/candidates/page.tsx`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: .plans/implementation-wave/002-review-charts-evidence.md
- **Category**: perf
- **Planned at**: commit `e1fa1d1`, 2026-06-25

## Why this matters

Recruiter pages blocked on full Convex fetches and `AppAuthGate` showed a blank shell until client hydration. Streaming shells improve perceived performance without caching auth-scoped data unsafely.

## Current state

- `app/(admin)/recruiter/page.tsx` — static shell + `<Suspense>` around `RecruiterDashboardLoader`.
- `components/recruiter/recruiter-dashboard-loader.tsx` — must call `await connection()` before `Date.now()` (Next 16 PPR rule).
- `components/auth/app-auth-gate.tsx` — layout skeleton instead of `null`.
- `app/(admin)/recruiter/candidates/page.tsx` — header static, queue in Suspense.
- Review page parallelizes detail + observations queries.

## Commands you will need

| Purpose | Command         | Expected on success              |
| ------- | --------------- | -------------------------------- |
| Build   | `bun run build` | exit 0, `/recruiter` shows ◐ PPR |

## Scope

**In scope**: recruiter dashboard, candidates page Suspense, auth gate skeleton, parallel Convex on templates/review

**Out of scope**: `'use cache'` on user-specific aggregates without `userId` key; `preloadQuery` unless Suspense insufficient

## Steps

### Step 1: Dashboard streaming

Extract `RecruiterDashboardLoader`; wrap in Suspense with skeleton fallback.

### Step 2: Auth gate skeleton

`AppAuthGate` shows `PageSkeleton` while Convex auth resolves.

### Step 3: Parallel fetches

`Promise.all` for independent server queries (templates bootstrap, review detail).

**Verify**: `bun run build` → no `Date.now()` prerender error on `/recruiter`

## Done criteria

- [x] `/recruiter` builds with PPR (◐) not hard error
- [x] Dashboard skeleton visible during stream
- [x] Auth gate no longer flashes empty shell
- [x] `.plans/implementation-wave/README.md` row 004 = DONE

## STOP conditions

- Build fails on `Date.now()` without `connection()` in loader
- Suspense boundary missing for `useSearchParams` pages

## Maintenance notes

- Any new recruiter loader using time must `await connection()` first.
