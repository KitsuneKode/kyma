# Production Qualification Close Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans (this session already has the worktree and
> uncommitted PR 1 draft). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the already-drafted correctness/CI follow-ups, collapse stale
docs so they match `main`, attempt the live path without claiming a pass, then
run an independent agent review before opening a PR.

**Architecture:** Keep deterministic code verification separate from real
provider evidence. Land one PR on `fix/production-qualification-followups`.
Do not close GitHub issue #31. Do not start UI/accessibility polish, Dodo,
backup, load, or JSON-LD work.

**Tech Stack:** Next.js 16, Convex, Vitest, Playwright, Inngest, GitHub
Actions, Bun.

## Global Constraints

- Work only in `/home/kitsunekode/Projects/assignments/kyma/.worktrees/production-qualification-followups` on branch `fix/production-qualification-followups`.
- Do not create a second worktree. The isolated workspace already exists.
- Read `convex/_generated/ai/guidelines.md` before every Convex edit.
- `bun run fmt` before lint, typecheck, or commit.
- Use `bun run test`, never plain `bun test`.
- Never schedule public `api.*` functions. Auth helpers used from actions must stay `internalQuery` / `internalMutation`.
- Recruiter queries that filter by time must use caller `nowMs` validated by `requireValidQueryNowMs`. Mutations may use `Date.now()`.
- A skipped live-provider gate is an outstanding gate, never a pass.
- Do not push, merge, deploy, or mutate production data until local gates pass.
- Do not claim issue #31 complete. Comment the split; leave the issue open.
- Do not rebase obsolete local feature branches.

---

## Why this plan exists

Issue #31 is an owner-run evidence matrix. Completing it as one coding sprint
would not make the repo better. The approved close is:

1. Finish the unfinished correctness/CI PR already sitting in the worktree.
2. Collapse stale docs so the next agent is not lied to.
3. Attempt the live path if credentials exist; record skip if they do not.
4. Independent agent review, then PR.

Issue #32 (JSON-LD), UI accessibility polish, Dodo checkout, backup/restore,
and representative load are **out of scope**.

## Current inventory (do not redo)

The worktree is **ahead of `origin/main` by 1 commit** (`0212d3b` docs plan)
plus a large uncommitted draft. Treat the uncommitted files as the
implementation. Verify them. Fill the remaining gaps below. Do not rewrite
working code from scratch.

Already drafted in the worktree (uncommitted unless noted):

| Item | Files | Status |
| --- | --- | --- |
| Design + thin plan | `.docs/production-qualification-followups-design.md`, `.plans/2026-09-02-production-qualification-followups.md` | Committed in `0212d3b` |
| Query time validation | `convex/helpers/sessionOps.ts`, `sessionOps.test.ts` | Drafted |
| Dashboard uses validated `nowMs` | `convex/recruiter/dashboard.ts` | Drafted |
| Email summary uses validated `nowMs` | `convex/recruiter/screenings.ts` | Drafted |
| Action auth is internal-only | `convex/recruiter/workspace.ts` | Drafted |
| Report chat persistence internal | `convex/recruiter/reviews.ts`, `reportChat.ts` | Drafted |
| Auth-boundary source tests | `convex/recruiter/workspace.auth-boundary.test.ts`, `reportChat.auth-boundary.test.ts` | Untracked |
| Cursor dispatcher | `convex/screeningBatchOps.ts` + test with 101 archived batches | Drafted |
| Inngest failure transition | `inngest/functions/process-interview-assessment.ts` + test | Drafted |
| Harness without tmux | `scripts/run-convex-integration.sh`, `scripts/inngest-event-sink.ts` | Drafted |
| CI knip + integration job | `.github/workflows/ci.yml`, `package.json` `check` / `check:quality` | Drafted |
| Contract tests | `lib/ci/qualification-contract.test.ts`, `lib/ci/convex-integration-harness.test.ts` | Untracked |
| Partial doc route fixes | `.docs/next-phase-prd.md`, `.docs/deployment-runbook.md`, `.docs/redesign-handoff.md`, `.docs/security-and-maintainability.md` | Drafted, still incomplete |

## Remaining gaps this plan must close

- `TODO.md` still lists shipped policy/copilot work as active engineering.
- `.docs/current-findings.md` still lists `convex/admin.ts` (file does not exist) and still frames issue #31 as the next engineering sprint.
- `.docs/byok-architecture.md` still documents deleted `getWorkspaceSettingsForReportChat`.
- `.docs/next-phase-prd.md` still lists `convex/admin.ts` in Key Files.
- `.docs/verification-pending.md` does not yet record this close or the issue #31 split.
- `.plans/README.md` does not index this plan.
- Live-path preflight has not been run for this close.
- No independent agent review has been run on the draft.
- Nothing is committed, pushed, or opened as a PR.

## File structure

- Modify: `convex/helpers/sessionOps.ts` — keep `requireValidQueryNowMs`.
- Modify: `convex/recruiter/{dashboard,screenings,workspace,reviews,reportChat}.ts` — keep drafted auth/time changes.
- Modify: `convex/screeningBatchOps.ts` — keep cursor continuation dispatcher.
- Modify: `inngest/functions/process-interview-assessment.ts` — keep injectable handler.
- Modify: `scripts/run-convex-integration.sh`, `scripts/inngest-event-sink.ts`.
- Modify: `.github/workflows/ci.yml`, `package.json`, `next.config.mjs`, `playwright.config.ts`.
- Modify: `.docs/current-findings.md`, `.docs/verification-pending.md`, `TODO.md`, `.docs/byok-architecture.md`, `.docs/next-phase-prd.md`.
- Modify: `.plans/README.md` — index this plan.
- Create/keep: auth-boundary and qualification contract tests already in the worktree.
- Do not add new plan files besides this one.

---

### Task 1: Confirm workspace and freeze the remaining gap list

**Files:** none (read-only)

**Interfaces:**

- Consumes: existing worktree at `.worktrees/production-qualification-followups`
- Produces: confirmation that `git branch --show-current` is `fix/production-qualification-followups`

- [ ] **Step 1: Confirm the worktree**

Run from the worktree:

```bash
pwd
git branch --show-current
git status -sb
```

Expected:

- cwd is `/home/kitsunekode/Projects/assignments/kyma/.worktrees/production-qualification-followups`
- branch is `fix/production-qualification-followups`
- status shows modified Convex/CI/docs files plus untracked auth-boundary and qualification tests

If cwd is the main checkout, switch with `move_agent_to_cloned_root` to the worktree path. Do not create another worktree.

- [ ] **Step 2: Confirm Convex guidelines are in context**

Read `convex/_generated/ai/guidelines.md` before any Convex edit in later tasks.

---

### Task 2: Prove the drafted correctness tests fail on `main` and pass on the worktree

**Files:**

- Test: `convex/helpers/sessionOps.test.ts`
- Test: `convex/screeningBatchOps.test.ts`
- Test: `inngest/functions/process-interview-assessment.test.ts`
- Test: `convex/recruiter/workspace.auth-boundary.test.ts`
- Test: `convex/recruiter/reportChat.auth-boundary.test.ts`
- Test: `lib/ci/qualification-contract.test.ts`
- Test: `lib/ci/convex-integration-harness.test.ts`

**Interfaces:**

- Consumes: drafted implementations in the worktree
- Produces: focused Vitest evidence that the follow-up tests exist and pass here

- [ ] **Step 1: Run the focused follow-up tests in the worktree**

```bash
bun run test -- convex/helpers/sessionOps.test.ts convex/screeningBatchOps.test.ts inngest/functions/process-interview-assessment.test.ts convex/recruiter/workspace.auth-boundary.test.ts convex/recruiter/reportChat.auth-boundary.test.ts lib/ci/qualification-contract.test.ts lib/ci/convex-integration-harness.test.ts
```

Expected: PASS.

If any fail, fix in this task before continuing. Likely failure modes:

- dispatcher test does not wait for continuation (`t.finishAllScheduledFunctions(vi.runAllTimers)` must run)
- `requireValidQueryNowMs` rejects `Number.MAX_SAFE_INTEGER` because it is larger than `MAX_DATE_TIMESTAMP_MS`
- source-string auth tests fail if a leftover `api.recruiter.workspace.assert*` call remains
- qualification contract fails if `package.json` `check` / `check:quality` or CI job names drift

- [ ] **Step 2: Confirm `main` does not already contain these tests**

```bash
git show origin/main:convex/helpers/sessionOps.ts | rg -n 'requireValidQueryNowMs' || true
git show origin/main:inngest/functions/process-interview-assessment.ts | rg -n 'createAssessmentProcessingHandler' || true
git show origin/main:convex/recruiter/workspace.ts | rg -n 'export const assertAdminForAction = query' || true
```

Expected:

- `requireValidQueryNowMs` absent on `main`
- `createAssessmentProcessingHandler` absent on `main`
- `assertAdminForAction` still a public `query(` on `main`

Do not switch branches to run the full suite against `main`. The `git show` checks are enough.

---

### Task 3: Close remaining code gaps in the draft

**Files:**

- Modify: `convex/recruiter/reviews.ts` only if `addReportChatMessage` still spreads extra fields unsafely
- Modify: `convex/recruiter/reportChat.ts` only if auth or persistence still uses `api.*`
- Modify: `.docs/byok-architecture.md` in Task 5, not here, unless a runtime caller remains

**Interfaces:**

- Consumes: `internal.recruiter.workspace.assertCandidateReviewAccessForAction` returning `{ orgId: string }`
- Consumes: `internal.recruiter.reviews.addReportChatMessage` with `orgId: string` plus chat fields
- Produces: no public action that returns encrypted workspace keys

- [ ] **Step 1: Confirm no leftover public auth helpers or key-leaking action**

```bash
rg -n "assertAdminForAction = query|assertCandidateReviewAccessForAction = query|getWorkspaceSettingsForReportChat" convex
rg -n "api\.recruiter\.workspace\.assert|api\.recruiter\.reviews\.addReportChatMessage" convex
```

Expected: no matches in `convex/` except comments/tests that assert the *absence* of those strings.

- [ ] **Step 2: Confirm `addReportChatMessage` insert does not write unknown fields**

In `convex/recruiter/reviews.ts`, the insert currently spreads `...args`. That is valid because args match `reportChatMessages` plus `createdAt`. If a later edit adds a non-schema arg, stop spreading and pick fields explicitly:

```ts
return await ctx.db.insert('reportChatMessages', {
  orgId: args.orgId,
  sessionId: args.sessionId,
  reportId: args.reportId,
  role: args.role,
  content: args.content,
  answerSource: args.answerSource,
  modelId: args.modelId,
  citationsJson: args.citationsJson,
  groundingVersion: args.groundingVersion,
  createdAt: new Date().toISOString(),
})
```

Only make this change if spreading would write a non-schema field. Do not churn a working insert.

- [ ] **Step 3: Re-run auth-boundary tests after any edit**

```bash
bun run test -- convex/recruiter/workspace.auth-boundary.test.ts convex/recruiter/reportChat.auth-boundary.test.ts
```

Expected: PASS.

---

### Task 4: Collapse stale operational docs

**Files:**

- Modify: `.docs/current-findings.md`
- Modify: `.docs/verification-pending.md`
- Modify: `TODO.md`
- Modify: `.docs/byok-architecture.md`
- Modify: `.docs/next-phase-prd.md`
- Modify: `.plans/README.md`
- Modify: `.docs/redesign-handoff.md` only if the worktree draft still lists `/admin` as canonical recruiter IA

**Interfaces:**

- Produces: one truth file (`.docs/current-findings.md`) that says live-path proof is owner-run, issue #31 is evidence not a coding sprint, and `convex/admin.ts` is gone

- [ ] **Step 1: Remove the dead `convex/admin.ts` pointer**

In `.docs/current-findings.md` Important Files, replace the `convex/admin.ts` bullet with:

```md
- `convex/recruiter/*`: recruiter workspace queries, screening writes, review surfaces, report chat
```

In `.docs/next-phase-prd.md` Key Files, delete the `- \`convex/admin.ts\`` line. Keep `convex/recruiter/*`.

- [ ] **Step 2: Rewrite Current Blockers so they stop contradicting shipped work**

Replace the Current Blockers section in `.docs/current-findings.md` with:

```md
## Current Blockers

These are operational proofs, not missing product features:

- Clerk env is required for recruiter/auth testing
- LiveKit room connection needs `NEXT_PUBLIC_LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`
- conversational agent behavior needs a running LiveKit agent worker and STT/LLM/TTS keys
- transcript quality depends on the chosen STT/runtime provider
- recording URLs depend on LiveKit egress plus object storage
- structured LLM scoring falls back to deterministic `manual_review` when the provider is unavailable or invalid
- issue #31 real-provider evidence is still pending owner-run (configuration presence and seeded UI do not count)
- native collaborative whiteboard is deferred; screen share remains the teaching visual path
```

Do **not** say template policy is still app-level defaults. Policy snapshot, lobby duration, and screening create inputs already shipped.

- [ ] **Step 3: Rewrite Next Best Work so agents stop rebuilding shipped slices**

Replace Immediate owner work / Still open product/tech debt in `.docs/current-findings.md` with:

```md
Immediate owner work:

1. **Phase A (owner-run):** one real invite → room → transcript → report. `bun run live-path:preflight` + `bun run dev:full`. See `.plans/operational-credibility-next.md`.
2. Owner-run `.docs/verification-pending.md` items 1–4 and 6.
3. Real invite email (`RESEND_API_KEY` + `NEXT_PUBLIC_APP_URL`) when sending to candidates.
4. Live Dodo products/webhooks only when charging; `KYMA_ORG_PLAN_OVERRIDE` remains the local quota path.

Still open after this PR:

- issue #31 live evidence (Clerk isolation, LiveKit audio, STT, TTS, recording, Inngest, then later billing/alerts/backup/load)
- BYOK KMS rotation (`.docs/byok-architecture.md`)
- UI/accessibility polish (separate PR, not this branch)
```

Append a validation-log row dated `2026-09-09` after verification in Task 6, not before.

- [ ] **Step 4: Rewrite `TODO.md` Active engineering**

```md
## Active engineering

- Owner-run LiveKit path proof (`.docs/verification-pending.md` items 3–4; GitHub issue #31).
- Finish and land `fix/production-qualification-followups` (deterministic CI/correctness). This is code, not provider evidence.
- BYOK KMS rotation + broader lifecycle after E6 owner-run validation.

Shipped; do not rebuild:

- Template-driven screening policy (duration, resume, attempts, `policySnapshot`).
- Recruiter copilot citations + durable chat metadata.
- HTTP + Convex throttles and audit trail.
- Encrypted per-workspace provider keys and `testProviderConnection`.
```

Keep SaaS ops scaffolds and non-goals.

- [ ] **Step 5: Fix BYOK doc for the deleted report-chat action**

In `.docs/byok-architecture.md`, replace the paragraph that starts with `` `getWorkspaceSettingsForReportChat` `` with:

```md
Report chat decrypts workspace keys only inside the Convex action
`recruiter.reportChat.askReportChat` after
`internal.recruiter.workspace.assertCandidateReviewAccessForAction`. Encrypted
key records must never be returned to the browser or to a public query/action.
```

- [ ] **Step 6: Record the issue #31 split in verification-pending**

At the top of `.docs/verification-pending.md`, after the update rule, add:

```md
**2026-09-09 split:** GitHub issue #31 remains the owner-run provider evidence
matrix. Deterministic correctness/CI follow-ups live on
`fix/production-qualification-followups` and do not mark any row in the
evidence matrix as Passed. Seeded UI, mocked providers, and anonymous Convex
loopback checks still do not count as provider evidence.
```

Do not flip items 1–7 to Passed.

- [ ] **Step 7: Index this plan**

Add a row to `.plans/README.md`:

```md
| [2026-09-09-production-qualification-close.md](./2026-09-09-production-qualification-close.md) | Close remaining correctness/CI follow-ups, collapse stale docs, attempt live-path, agent review |
```

Keep `operational-credibility-next.md` as the live-path owner plan.

---

### Task 5: Format and run deterministic quality gates

**Files:** whatever `bun run fmt` touches

**Interfaces:**

- Consumes: `package.json` scripts `fmt`, `check:quality` (or current `check` if `check:quality` is not yet saved)
- Produces: green local evidence before review

- [ ] **Step 1: Format**

```bash
bun run fmt
```

Expected: exit 0.

- [ ] **Step 2: Focused tests again after format**

```bash
bun run test -- convex/helpers/sessionOps.test.ts convex/screeningBatchOps.test.ts inngest/functions/process-interview-assessment.test.ts convex/recruiter/workspace.auth-boundary.test.ts convex/recruiter/reportChat.auth-boundary.test.ts lib/ci/qualification-contract.test.ts lib/ci/convex-integration-harness.test.ts
```

Expected: PASS.

- [ ] **Step 3: Full unit suite**

```bash
bun run test
```

Expected: exit 0, 0 failed. Record the pass count from the summary line.

- [ ] **Step 4: Lint, Knip, Convex generated cleanliness, typecheck, build**

```bash
bun run fmt:check
bun run check:conflicts
bun run lint
bun run knip
bun run convex:ci
git diff --exit-code -- convex/_generated
bunx next typegen
bun run typecheck
bun run build
```

If `check:quality` exists after the package.json draft, `bun run check:quality` may replace the sequence above. Expected: every command exit 0.

If Knip reports the new sink/harness files as unused, they are used from bash; keep them. Only delete a file if it is truly unreferenced.

- [ ] **Step 5: Playwright smoke**

```bash
bun run test:e2e
```

Expected: exit 0. If browsers are missing, `bunx playwright install chromium` then rerun. Do not skip and claim pass.

---

### Task 6: Attempt live-path and integration without converting skips into passes

**Files:**

- Modify: `.docs/current-findings.md` Validation log
- Modify: `.docs/verification-pending.md` only to record the attempt, not to mark Passed

**Interfaces:**

- Consumes: `.env.local` if present
- Produces: dated pass/skip rows with the exact missing keys or command output

- [ ] **Step 1: Run live-path preflight**

```bash
bun run live-path:preflight
```

If it fails on missing env, record the exact missing keys in `.docs/verification-pending.md`:

```md
**2026-09-09 agent preflight:** `bun run live-path:preflight` failed — missing `<keys>`. Issue #31 items 3–4 remain Pending.
```

Do not invent credentials. Do not open `/recruiter/health` against production.

If it passes, open `/recruiter/health` only when `bun run dev:full` is already running and Clerk allows it. Record each provider check. Still do not mark issue #31 complete unless a real invite produced transcript + report.

- [ ] **Step 2: Run the Convex integration harness if loopback Convex is available**

```bash
bun run test:convex-integration
```

Expected: either all local checks pass, or a clear skip/fail with logs under `/tmp/kyma-convex-integration.*`.

If the harness cannot start because Convex login/agent-mode is unavailable, record the failure text. Do not delete the harness to make CI green unless the failure is a real bug in `scripts/run-convex-integration.sh`.

- [ ] **Step 3: Append the validation-log row**

In `.docs/current-findings.md`:

```md
- 2026-09-09 — Correctness/CI follow-ups verified locally (`bun run test` N/N, lint, typecheck, build). Live-path preflight: <pass | failed missing KEYS>. Issue #31 remains owner-run evidence.
```

Replace `N/N` and the preflight clause with the actual evidence from this task.

---

### Task 7: Independent agent review, then fix findings

**Files:** whatever the review proves is wrong

**Interfaces:**

- Consumes: `git diff origin/main`
- Produces: review notes plus required fixes before commit

- [ ] **Step 1: Launch two review agents in parallel**

Use Task tool, `run_in_background: false`, `subagent_type: convex-reviewer` for Convex/CI changes, and `subagent_type: generalPurpose` for spec/docs/scope.

Convex reviewer prompt must include:

- Full repository path: `/home/kitsunekode/Projects/assignments/kyma/.worktrees/production-qualification-followups`
- Diff: uncommitted changes plus `0212d3b`
- Ask it to check: public vs internal functions, `Date.now()` in queries, unbounded `.collect()`, scheduled `api.*`, missing validators, auth on recruiter actions, dispatcher continuation correctness

Spec/docs reviewer prompt must include:

- Spec files: `.docs/production-qualification-followups-design.md`, this plan, GitHub issue #31
- Ask: did we mix provider evidence with deterministic checks? Did we claim #31 passed? Did stale docs still say `/admin` is canonical or `convex/admin.ts` exists? Any scope creep into UI polish / Dodo / JSON-LD?

- [ ] **Step 2: Apply only high-severity fixes**

Fix:

- auth/data leaks
- query non-determinism
- dispatcher starvation
- tests that do not fail on `main` behavior
- docs that still contradict `main`

Do not take style-only or speculative refactors from the review.

- [ ] **Step 3: Re-run the focused tests and `bun run fmt` after fixes**

```bash
bun run fmt
bun run test -- convex/helpers/sessionOps.test.ts convex/screeningBatchOps.test.ts inngest/functions/process-interview-assessment.test.ts convex/recruiter/workspace.auth-boundary.test.ts convex/recruiter/reportChat.auth-boundary.test.ts
```

Expected: PASS.

If the review found a full-suite regression, re-run `bun run test` and `bun run typecheck` too.

---

### Task 8: Commit, comment on issue #31, open the PR

**Files:** all remaining worktree changes for this close

**Interfaces:**

- Produces: one commit on `fix/production-qualification-followups`
- Produces: PR targeting `main`
- Produces: issue #31 comment that the evidence matrix is still Pending

- [ ] **Step 1: Review git status/diff/log**

```bash
git status
git diff
git log origin/main..HEAD --oneline
```

Do not commit `.env`, credentials, or worktree internals.

- [ ] **Step 2: Commit**

Stage only the qualification close files, then:

```bash
git add convex/helpers/sessionOps.ts convex/helpers/sessionOps.test.ts \
  convex/recruiter/dashboard.ts convex/recruiter/screenings.ts \
  convex/recruiter/workspace.ts convex/recruiter/reviews.ts \
  convex/recruiter/reportChat.ts \
  convex/recruiter/workspace.auth-boundary.test.ts \
  convex/recruiter/reportChat.auth-boundary.test.ts \
  convex/screeningBatchOps.ts convex/screeningBatchOps.test.ts \
  inngest/functions/process-interview-assessment.ts \
  inngest/functions/process-interview-assessment.test.ts \
  scripts/run-convex-integration.sh scripts/inngest-event-sink.ts \
  lib/ci/qualification-contract.test.ts lib/ci/convex-integration-harness.test.ts \
  .github/workflows/ci.yml package.json next.config.mjs playwright.config.ts \
  .docs/current-findings.md .docs/verification-pending.md \
  .docs/next-phase-prd.md .docs/deployment-runbook.md \
  .docs/redesign-handoff.md .docs/security-and-maintainability.md \
  .docs/byok-architecture.md TODO.md .plans/README.md \
  .plans/2026-09-09-production-qualification-close.md

git commit -m "$(cat <<'EOF'
fix(production): close correctness and CI qualification follow-ups

Keep recruiter queries deterministic, hide action auth behind internal
Convex functions, and stop mixing synthetic CI checks with issue #31
provider evidence.
EOF
)"
```

If the commit is rejected by a hook, fix and create a **new** commit. Do not amend unless the hook only modified files and HEAD is still this unpublished commit.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin HEAD
gh pr create --title "fix(production): close correctness and CI qualification follow-ups" --body "$(cat <<'EOF'
## Summary
- Keep recruiter time handling deterministic and move action authorization behind internal Convex functions.
- Page screening-batch operational-stat refresh so old active batches cannot starve.
- Split local/CI qualification gates from GitHub issue #31 real-provider evidence.

## Test plan
- [ ] `bun run test`
- [ ] `bun run lint` and `bun run typecheck`
- [ ] `bun run knip`
- [ ] `bun run test:convex-integration` (or recorded skip with reason)
- [ ] `bun run test:e2e`
- [ ] Confirm issue #31 evidence matrix is still Pending

EOF
)"
```

- [ ] **Step 4: Comment on issue #31, do not close it**

```bash
gh issue comment 31 --repo KitsuneKode/kyma --body "$(cat <<'EOF'
Deterministic correctness/CI follow-ups are on PR <url>. That work does **not** count as provider evidence.

The evidence matrix in this issue remains Pending until an owner-run invite produces real Clerk isolation, LiveKit audio both ways, STT finals, structured report, and (later) billing/alerts/backup/load.

Seeded UI, mocked providers, and anonymous Convex loopback checks still do not close any row.
EOF
)"
```

Replace `<url>` with the PR URL from Step 3.

---

## Out of scope (explicit)

- `fix/ui-accessibility-polish`
- GitHub issue #32 JSON-LD
- Dodo checkout / webhook replay
- Backup/restore drill
- Representative load
- Closing issue #31
- Rebasing merged local feature branches

## Coverage check

| Requirement | Task |
| --- | --- |
| Recruiter query `nowMs` validation | 2, 3 |
| Internal action auth | 2, 3 |
| Bounded dispatcher continuation | 2 |
| Inngest failure transition test | 2 |
| Harness without tmux | 2, 6 |
| CI/local qualification parity | 2, 5 |
| Stale route/docs collapse | 4 |
| Live-path attempt, skip ≠ pass | 6 |
| Agent review | 7 |
| PR + issue #31 comment | 8 |
| UI polish / Dodo / backup / load | Out of scope |

## Definition of done

- Worktree PR is open against `main`.
- Focused follow-up tests, full unit suite, lint, typecheck, and build have fresh passing output in this session.
- Docs no longer point at `convex/admin.ts` or treat issue #31 as a coding sprint.
- Issue #31 is still OPEN, with a comment that evidence is still Pending.
- No production-ready claim from seeded UI or synthetic integration.
