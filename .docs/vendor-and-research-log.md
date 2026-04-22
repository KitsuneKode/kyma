# Vendor and research log

**Not product requirements.** Short, dated notes from web research or SDK validation. Official docs and repo code override this file if they disagree.

## Rules

1. One-line takeaway + primary URL; no full article paste.
2. Mark secondary sources `LOW_CONFIDENCE`.
3. Set **Invalidate when** (dependency major bump or review date).
4. Re-verify when touching the linked file or dependency.

## Log

| Date (UTC) | Topic              | Primary source  | Applies to | One-line takeaway                                                                                                 | Repo anchor                         | Invalidate when    |
| ---------- | ------------------ | --------------- | ---------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------ |
| 2026-04-22 | Convex path alias  | Convex bundling | convex dev | Convex bundler does not resolve Next `@/` paths; use `../lib/...` from `convex/*`.                                | `convex/interviews.ts`              | N/A (architecture) |
| 2026-04-22 | Convex file naming | Convex bundling | convex dev | Files under `convex/` must use `[a-zA-Z0-9_.]` only — no hyphens in module paths (e.g. use `interviewPolicy.ts`). | `convex/helpers/interviewPolicy.ts` | N/A                |
