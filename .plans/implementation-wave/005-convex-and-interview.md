# Plan 005: Convex query hygiene + interview track

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `.plans/implementation-wave/README.md`.
>
> **Drift check (run first)**: `git diff --stat e1fa1d1..HEAD -- convex/interviews/candidatePortal.ts lib/convex/server-query.ts components/interview/ app/(app)/candidate/`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: .plans/implementation-wave/004-ssr-streaming.md
- **Category**: perf
- **Planned at**: commit `e1fa1d1`, 2026-06-25

## Why this matters

Candidate portal listed interviews with per-session N+1 fetches; server helpers collapsed real errors into empty states; lobby time and readiness UX were stale or opaque.

## Current state

- `convex/interviews/candidatePortal.ts` — batch invite/template lookups in `listCandidateInterviews`.
- `lib/convex/server-query.ts` — `serverConvexPortalQuery` discriminant (`ok` | `empty` | `error`).
- `components/candidate/candidate-invite-email-linker.tsx` — client-side invite link (once per session).
- `components/interview/interview-workspace.tsx` — refresh `nowMs` on prejoin view.
- `components/interview/invite-lobby.tsx` — per-check readiness rows, live expiry countdown.
- `components/interview/meeting-shell.tsx` — transcript `Sheet` on `< lg`.
- `components/candidate/readiness-panel.tsx` — per-check breakdown.

## Commands you will need

| Purpose | Command         | Expected on success |
| ------- | --------------- | ------------------- |
| Tests   | `bun run test`  | all pass            |
| Build   | `bun run build` | exit 0              |

## Scope

**In scope**: candidate portal query batching, portal error UI, invite linker move, interview lobby/meeting/readiness fixes

**Out of scope**: LiveKit agent internals, full pagination of recruiter queue (already paginated)

## Steps

### Step 1: Batch candidate portal reads

Refactor `listCandidateInterviews` to batch `db.get` for invites/templates and parallel indexed report lookups.

### Step 2: Portal error discriminant

Add `serverConvexPortalQuery`; update candidate home/interviews/readiness pages to show error vs empty.

### Step 3: Interview UX

Live `nowMs` interval in workspace; readiness breakdown; mobile transcript sheet; move `linkCandidateInviteByEmail` out of layout.

**Verify**: `bun run test && bun run build` → pass

## Done criteria

- [x] Candidate pages show error alert on Convex failure
- [x] Invite email link runs once client-side per session
- [x] Lobby expiry text updates while on page
- [x] Mobile meeting shows transcript sheet
- [x] `.plans/implementation-wave/README.md` rows 005 + 006 = DONE

## STOP conditions

- Convex handler type errors after batching refactor
- `sessionStorage` unavailable breaks linker in SSR (must stay client-only)

## Maintenance notes

- Reviewers should verify invite linking still works for new sign-ins (sessionStorage cleared).
