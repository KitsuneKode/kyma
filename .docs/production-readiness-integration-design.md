# Production Readiness Integration Design

## Status

Approved in chat on 2026-09-01. This document defines the integration,
correctness, capacity, and verification work required before Kyma can be treated
as a production candidate.

## Goal

Turn the current stacked pull-request work into a coherent, reviewable release
candidate whose deterministic quality gates pass and whose remaining live
provider, deployment, and operational gates are explicitly documented.

## Current State

The active work is a stacked chain:

1. PR #21: `main` -> `fix/audit-remediation-phase-0`
2. PR #22: `fix/audit-remediation-phase-0` ->
   `fix/screenings-denormalized-counters`
3. PR #23: `fix/screenings-denormalized-counters` -> `fix/dashboard-charts`
4. PR #24: `fix/dashboard-charts` -> `fix/small-correctness-batch`
5. PR #25: `fix/small-correctness-batch` -> `fix/remaining-correctness`
6. PR #26: `fix/remaining-correctness` -> `fix/chat-shadcn-remotion`
7. PR #27: `fix/chat-shadcn-remotion` ->
   `fix/followup-policy-style-reconnect`
8. PR #28: `fix/followup-policy-style-reconnect` ->
   `fix/followup-rate-limit-byok`
9. PR #29: `fix/followup-rate-limit-byok` -> `fix/dev-leak-hardening`

PR #19, `cursor/convex-integration-consistency-ac65`, is still based on `main`
and conflicts with the newer stack. Its two intended changes have already been
rebased locally on top of PR #29 as commits `8a7ba5e` and `4cc0fcc`, but the
second commit contains unresolved conflict markers in
`convex/_generated/api.d.ts`.

The local checkout also contains `.worktrees/staff-audit-hardening`. Vitest's
current discovery pattern recursively runs that linked checkout's tests as part
of the parent project.

## Integration Strategy

Preserve the existing stacked review boundaries. Do not squash the nine newer
PRs into one change and do not merge them out of order.

Repair the PR #19 integration branch on top of `fix/dev-leak-hardening`, verify
the cumulative result, then update the existing PR rather than discarding its
history and review discussion. Use `--force-with-lease`, never an unconditional
force push.

PR #19 should temporarily target `fix/dev-leak-hardening` so its review diff
contains only the Convex API consolidation and the production-readiness repairs
that belong after PR #29. After PRs #21 through #29 merge bottom-up, retarget
PR #19 to `main`, recheck its diff and checks, and merge it last.

## Workstreams

### 1. Integration and CI integrity

- Regenerate `convex/_generated/api.d.ts` from current Convex sources so it
  includes all modules from both histories and contains no hand-edited conflict
  residue.
- Make Vitest ignore `.worktrees/**` so linked checkouts cannot contaminate the
  parent project's test discovery.
- Make Knip load project configuration without failing on the TypeScript path
  alias imported by `playwright.config.ts`.
- Add a deterministic repository check that fails when merge-conflict markers
  are present in tracked source or generated files.
- Keep CI and the local `check` command aligned so the cumulative head is tested
  the same way locally and remotely.

### 2. Processing reliability

- Enforce a durable Inngest processing timeout slightly above the scoring
  provider timeout.
- Preserve the existing retry and `markAssessmentFailed` behavior when the
  timeout or provider call fails.
- Add regression coverage for timeout configuration and failure-state handling.

### 3. Evidence-backed recruiter chat

- Parse model citation references into a typed reference format.
- Accept only evidence indices, transcript timestamps, and rubric dimensions
  that exist in the report context.
- Fall back to deterministic grounded citations when any model-supplied
  reference is malformed or unresolved.
- Add tests for valid, invalid, mixed, and empty citation lines.

### 4. Transcript and redispatch correctness

- Add a regression test that drives candidate transcript persistence through
  partial -> partial -> final updates and proves that the final stored transcript
  contains one finalized row per utterance without duplicate partials.
- Add regression coverage proving that redispatch/reconnect preserves accumulated
  candidate and agent turn counters.
- Change production logic only if those tests expose a real defect.

### 5. Convex capacity and transaction safety

- Replace the development seed-reset database filters with explicit indexed
  query strategies for each supported table family.
- Remove the unbounded eligibility collection from the live session-completion
  transaction. Counter initialization must be migration-safe and bounded; the
  hot path must perform constant or bounded work.
- Rename incorrectly named indexes and update every caller through a
  widen/migrate/narrow-compatible rollout if deployed data depends on them.
- Inspect sibling readers and writers for candidate eligibility, screening
  counters, recruiter dashboard summaries, transcript persistence, and worker
  heartbeats for the same unbounded-read or high-contention patterns.
- Do not add digest tables, new denormalized state, or migrations without either
  a demonstrated unbounded path or measured runtime evidence.

### 6. Maintainability

- Consolidate repeated LiveKit webhook ingestion payload construction behind a
  small shared helper while preserving event-specific fields.
- Keep shared behavior in existing domain, assessment, interview, and Convex
  helper modules instead of adding route-local patches.
- Preserve the documented Next/Convex boundary: `/api/inngest` remains on Next;
  interview bootstrap, report chat, LiveKit webhooks, and Clerk webhooks remain
  Convex-owned.

## Verification Model

### Deterministic repository gates

The cumulative head must pass, in order:

1. `bun install --frozen-lockfile`
2. `bun run fmt`
3. `bun run fmt:check`
4. `bun run lint`
5. `bun run test`
6. `bun run convex:ci`
7. `git diff --exit-code -- convex/_generated`
8. `bunx next typegen`
9. `bun run typecheck`
10. `bun run build`
11. `bun run test:e2e`
12. `bun run knip`
13. `bun run test:convex-integration`

Targeted regression tests should be run first during each change's red-green
cycle. The complete sequence is required before updating the remote PR.

### Live and deployment gates

The following cannot be inferred from local tests or historical green CI:

- production Convex schema/function deployment
- production environment synchronization
- Clerk organization/JWT and webhook behavior
- LiveKit room, reconnect, worker dispatch, and webhook behavior
- Inngest event delivery, retries, and timeout behavior
- model-provider BYOK and platform-key execution
- Dodo billing webhooks and account configuration
- production observability, alert routing, backup, and incident response
- representative load and concurrency behavior

Run the existing live-path preflight and local Convex integration harness where
credentials permit. Record every skipped gate with its required account,
credential, or owner action; a skipped live gate is not a pass.

## Production Use Cases to Exercise

- Candidate signs in, claims an invite, completes preflight, joins a LiveKit
  interview, reconnects after interruption, completes the interview, and sees
  released results.
- Candidate completes a mock interview and receives practice feedback without
  consuming or exposing another organization's data.
- Recruiter creates a template and screening batch, sends or copies invite
  links, monitors progress, reviews evidence-backed scoring, asks grounded report
  questions, and records a human decision.
- Processing is idempotent across duplicate events, provider failures, retries,
  worker restarts, and stale-session recovery.
- Plan limits, usage rollups, billing events, provider-key rotation, and webhook
  replay protection remain organization-scoped.
- Data export and deletion complete in bounded batches without orphaning child
  records.
- Dashboard and screening-list reads remain bounded as organizations, batches,
  candidates, sessions, transcript segments, and reports grow.

## Safety and Change Control

- Preserve the existing `.worktrees/` directory and unrelated user changes.
- Do not rewrite or push any remote branch until the cumulative local gates pass.
- Before force-updating PR #19, verify that its remote head is still the expected
  old two-commit branch and use `--force-with-lease`.
- Before every merge, refresh PR mergeability, approvals, required checks, and
  base/head SHAs.
- Merge PRs #21 through #29 only in ascending order, then retarget and merge
  PR #19.
- Stop before any production deployment, environment mutation, billing change,
  or data migration that requires credentials or operator approval not already
  in scope.

## Completion Criteria

The integration work is complete only when:

- the cumulative branch has no conflict markers and no unresolved Git state;
- all deterministic repository gates pass from the exact commit proposed for
  merge;
- every confirmed audit defect is fixed or documented as a separately owned
  blocker with evidence;
- PR #19 shows only its intended incremental diff on the correct base;
- each stacked PR is mergeable and its current required checks pass;
- production use cases have deterministic coverage where feasible;
- live/deployment gates have fresh results or are explicitly marked outstanding;
- capacity risks have bounded-query, transaction, or load-test evidence rather
  than unsupported readiness claims.

## Non-Goals

- Adding video-first interview scope.
- Replacing LiveKit, Convex, Clerk, Inngest, Dodo, or AI SDK.
- Rebuilding the user interface unrelated to a confirmed correctness or
  production-readiness defect.
- Claiming production readiness solely from local tests or preview deployments.
