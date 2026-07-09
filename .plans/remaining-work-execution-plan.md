# Remaining Work Execution Plan

Status: active  
Created: 2026-07-09  
Scope: close the open security/SaaS PR stack, finish owner-run verification, then ship commercial/ops gaps that still block credible SaaS.

This plan consolidates:

- 13 open draft PRs (#3–#15) from the security / product-standard sprint
- owner-run queue in `.docs/verification-pending.md`
- product/commercial gaps from the product-standard assessment and `.docs/next-phase-prd.md`

**Do not rebuild the product.** Harden, merge, verify live path, then wrap with billing/email/compliance/observability.

---

## Success criteria

| Gate                      | Done when                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| G1 Security merged        | PRs #3–#8 (+ #10) on `main`, CI green, no processing-key IDOR / public seed / fail-open Clerk |
| G2 Maintainability merged | #12–#14 on `main` (or #14 slimmed), domain contracts + session ops shared                     |
| G3 SaaS scaffolds merged  | #9 + #11 on `main` as scaffolds only (no fake “billing complete”)                             |
| G4 Owner verification     | Items 1–7 in `.docs/verification-pending.md` marked pass with evidence                        |
| G5 Commercial MVP         | Real plan gates, invite email, Sentry, GDPR export/delete path, BYOK design locked            |
| G6 Launch bar             | One real LiveKit session completes invite → room → transcript → report → recruiter review     |

---

## Phase 0 — PR merge hygiene (do first)

**Goal:** land the open stack without conflict thrash. Code is already CI-green; remaining risk is merge order and overlap.

### 0.1 Process rules

1. Keep PRs as **draft** until the previous security PR in the chain is merged (or rebase is confirmed clean).
2. After each merge to `main`: rebase the next PR, run `bun run check` locally or wait for CI, then mark ready for review.
3. Prefer **one merge at a time** for security PRs; do not batch-merge #3–#8.
4. Close **#15** once any merged PR already contains the `/recruiter/health` auth-gate e2e poll fix (it was cherry-picked widely).
5. No human review comments today — treat CI + this plan’s acceptance as the review bar unless a human adds notes.

### 0.2 Recommended merge order

```text
Wave A — Security (blocking)
  #6  Clerk fail-closed in production
  #3  Dev seed mutations → internalMutation
  #5  Redact invite tokens / gate prod diagnostics
  #8  Process API rate limit + processing auth
  #4  Remove processing-key bypass on review reads   ← highest security value
  #7  Harden invite tokens + claim ownership

Wave B — Bounds + helpers
  #10 Bound public session reads / validators
  #13 Shared session ops helpers
  #14 Security boundary tests (slim if still overlapping #7/#8)

Wave C — SaaS scaffolds
  #11 Entitlements structure, legal pages, GDPR runbook
  #9  Error reporting, email scaffold, deploy runbook

Wave D — Domain consolidation (last)
  #12 Domain contracts consolidate

Close when redundant
  #15 E2E health auth-gate (close after Wave A lands the same fix on main)
```

### 0.3 Per-PR acceptance before merge

| PR  | Must verify before merge                                                                        | Notes                                         |
| --- | ----------------------------------------------------------------------------------------------- | --------------------------------------------- |
| #6  | Unset Clerk in `production` fails closed; local/dev still usable                                | Watch `NODE_ENV` vs `KYMA_DEPLOYMENT_ENV`     |
| #3  | Seed mutations not callable from client; internal path still works for `db:seed:dev`            | Add/keep regression if missing                |
| #5  | Invite tokens never appear in logs; prod diagnostics gated                                      |                                               |
| #8  | `/api/interviews/process` rate-limited; processing auth tightened                               | Merge before #14                              |
| #4  | Review reads reject processing-key-only access; unit IDOR regression present                    | Highest priority                              |
| #7  | Stronger tokens; claim cannot hijack another user’s invite                                      | Rebase after #13 if `screenings.ts` conflicts |
| #10 | Public session reads bounded; no `Date.now()` in queries                                        | Rebase after #8 on `public.ts`                |
| #13 | `convex/_generated` committed; session ops shared                                               | Conflict hotspot: `screenings.ts`             |
| #14 | Prefer tests-only unique files (`interviewSession.access`, `scoring-policy`); retitle if needed | Drop duplicated #7/#8 hunks                   |
| #11 | Legal pages ship; entitlements are **structure only** — document as scaffold                    | Do not claim billing done                     |
| #9  | Sentry/email/deploy docs are scaffolds; email not required on product paths yet                 | Same honesty bar                              |
| #12 | Rebase last; resolve enum import conflicts across 19+ files                                     | Highest conflict surface                      |
| #15 | Close if Wave A already includes e2e fix                                                        | Avoid double-merge noise                      |

### 0.4 Conflict hotspots (rebase checklist)

- `processingAuth.ts` — #8, #14
- invite claim tests — #7, #14
- `screenings.ts` — #7, #13
- `public.ts` — #8, #10, #13
- `sessionReview.ts` — #4, #10, #13
- env / docs — #9, #11
- domain enums — #12 vs everything

### 0.5 Exit

- [ ] Waves A–D merged (or #15 closed as redundant)
- [ ] `main` green on quality + e2e
- [ ] `.docs/current-findings.md` updated: security items from Wave A marked shipped

---

## Phase 1 — Owner-run verification

**Goal:** prove access, LiveKit continuity, and data correctness on a real deployment.  
Procedure source: `.docs/backend-verification-runbook.md`  
Queue: `.docs/verification-pending.md`

### 1.1 Pre-flight

```bash
bun run live-path:preflight
# Confirm /recruiter/health shows platform readiness under a signed-in recruiter
```

Required env: Clerk, Convex, LiveKit (`NEXT_PUBLIC_LIVEKIT_URL`, API key/secret), Inngest (or documented inline fallback), `KYMA_PROCESSING_WRITE_KEY`, agent worker (`bun run agent:start`).

### 1.2 Access and identity (items 1–2.2)

| Item                 | Action                                                                               | Pass evidence                               |
| -------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------- |
| 1 Clerk webhook sync | Create/update org + membership in Clerk; confirm Convex mirrors                      | Screenshot or Convex row IDs + timestamps   |
| 2 RBAC denial        | User without `org:recruiter:access` cannot call recruiter APIs / open `/recruiter/*` | Denied responses logged                     |
| 2.1 Org context      | Missing `orgId` → recruiter denial; candidate routes still work                      | Matrix table filled in verification-pending |
| 2.2 Cross-org        | Two orgs; no cross-read of candidates, batches, settings                             | Explicit “no leak” note                     |

### 1.3 Interview session safety (items 3–4)

| Item                        | Action                                                       | Pass evidence                                |
| --------------------------- | ------------------------------------------------------------ | -------------------------------------------- |
| 3 LiveKit invite + identity | Full invite → prejoin → room → agent join → transcript       | Session ID, transcript segments, room events |
| 4 Reconnect continuity      | Disconnect mid-session; rejoin; timer/scoring context intact | Before/after duration + status timeline      |

### 1.4 Data and output (items 5–7)

| Item                       | Action                                                                             | Pass evidence                        |
| -------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------ |
| 5 Candidate result gating  | Practice vs screening lists; no premature report                                   | UI smoke notes                       |
| 6 BYOK validation          | Settings path rejects bad keys; no client leak (even if BYOK not production-ready) | Follow runbook item 5                |
| 7 Template version history | Rubric/prompt change leaves audit trail                                            | Version IDs on report/policySnapshot |

### 1.5 Exit

- [ ] All seven items marked pass (or explicitly deferred with owner sign-off) in `.docs/verification-pending.md`
- [ ] Matching rows in `.plans/hardening-and-polish-v1.md` moved to `Verified` where applicable
- [ ] Launch-bar steps 1–10 in `.plans/production-launch-sweep.md` completed once

---

## Phase 2 — Close live-path gaps found in Phase 1

**Goal:** fix only what owner-run proves broken. Do not speculative-rewrite.

### 2.1 Likely touch points

- Agent join / dispatch: `lib/livekit/token.ts`, `agents/interviewer.ts`, `agents/worker.ts`
- Webhook + recording: `app/api/livekit/webhook`, `convex/livekit.ts`, `lib/livekit/recording.ts`
- Processing: `app/api/interviews/process`, Inngest functions, `lib/assessment/process-session.ts`
- Session machine / resume: `lib/interview/session-machine.ts`, bootstrap route

### 2.2 Rules

1. One failure class per PR (join, transcript, webhook, recording, processing).
2. Add a regression test when the bug is unit-testable; otherwise document owner re-run evidence.
3. Update `.docs/current-findings.md` blockers section after each fix.

### 2.3 Exit

- [ ] One clean end-to-end session without manual Convex repair
- [ ] Recruiter detail shows transcript, report, evidence, notes, chat, decision controls

---

## Phase 3 — Commercial / ops wrap (post-scaffold)

**Goal:** turn #9/#11 scaffolds into operable SaaS primitives. Product core already exists.

Execute in this order; each subsection can be its own PR.

### 3.1 Entitlements that actually gate (extends #11)

**Problem:** entitlements structure exists but plan checks are stub / override-only (`KYMA_ORG_PLAN_OVERRIDE`).

**Work:**

1. Define plan tiers in one module (`lib/saas/plans.ts` or existing entitlements module): free / pilot / paid limits (sessions/month, seats, chat, BYOK).
2. Enforce at write boundaries: screening create, bootstrap (optional soft limit), report-chat, seed-heavy admin actions.
3. Surface limit errors in recruiter UI (clear upgrade/contact copy — no fake Stripe yet if billing deferred).
4. Persist `orgPlan` (or Clerk metadata mirror) in Convex; avoid client-trusted plan claims.

**Acceptance:** exceeding a limit returns a structured error; override env still works for design partners.

### 3.2 Candidate invite email (extends #9)

**Problem:** email scaffold not wired to screening create.

**Work:**

1. Pick provider (Resend/Postmark/etc.) behind `lib/email/*` only.
2. On screening invite create (or explicit “send invites”), enqueue send with invite URL (`/i/[token]`).
3. Idempotent send log (Convex table or provider idempotency key).
4. Recruiter UI: send status per candidate; resend control with rate limit.
5. Never log full invite tokens (align with #5).

**Acceptance:** creating a batch can email invites; failures are visible and retryable without leaking tokens.

### 3.3 Production observability (extends #9)

**Work:**

1. Enable Sentry (or chosen reporter) for Next + Convex actions that already have hooks; expand beyond bootstrap/process to webhook + report-chat + Inngest failures.
2. Structured error IDs on API failure responses.
3. Ops signals on `/recruiter/health` (or sibling): enqueue failure count, stuck `processing`, LiveKit/Inngest/Clerk readiness (already partially present — extend, don’t fork).
4. Alerting runbook: who gets paged for stuck processing / webhook signature failures.

**Acceptance:** a forced failure appears in the error reporter with redacted PII; health panel reflects stuck processing.

### 3.4 GDPR / data subject path (extends #11)

**Work:**

1. Documented export: org-scoped package of candidate session metadata + transcripts + reports (admin-only).
2. Documented delete/anonymize: invite, session, transcript, artifacts, chat — with processing-key/server job, not browser cascade.
3. Legal pages already from #11 — link from footer/settings; keep DPA as static/runbook until legal review.
4. Prefer scheduled/internal mutation over ad-hoc scripts.

**Acceptance:** runbook steps produce export file and confirm delete; audit event recorded.

### 3.5 Billing decision checkpoint

Choose one before building Stripe deeply:

| Option                                      | When to choose        |
| ------------------------------------------- | --------------------- |
| A. Clerk Billing / Stripe seats             | Paid SMB launch soon  |
| B. Manual invoicing + plan override         | Design-partner only   |
| C. Defer billing UI; keep hard entitlements | Soft launch with caps |

Record the choice in `.docs/current-findings.md` and `.plans/grill-me.md`. Do not implement full Stripe until A is chosen.

---

## Phase 4 — Product depth still open

Only after G1–G4 (and preferably 3.1–3.3). Aligns with `.docs/next-phase-prd.md` workstreams 2–4.

### 4.1 Template-driven screening policy (finish E2E)

Much of policy storage already exists; close the product loop:

1. Screening create UI exposes duration, expiry, attempts, resume, rubric version.
2. Candidate lobby/session rail always reflects batch/template policy (not app defaults).
3. Reports store and display `policySnapshot`.
4. Owner-run item 7 (template version history) stays green.

### 4.2 Recruiter copilot hardening

1. Citations jump to transcript (verify UI).
2. Clear fallback vs model-backed mode in UI.
3. Stronger prompts for strengths / risks / recommendation / missing evidence.
4. Persist answerSource + model metadata (already partially done — audit completeness).
5. Rate limits + audit already required; keep them.

### 4.3 BYOK production path

Follow `.docs/security-and-maintainability.md`:

1. Server-only settings write path.
2. Encrypt at rest (KMS/envelope); decrypt only in job/request.
3. Shared provider resolution module — no per-route key reads.
4. Until this ships, keep BYOK off the critical interview path.

### 4.4 Recruiter list pagination

Replace remaining unbounded `.collect()` on recruiter queues/batches with paginated or bounded queries before larger cohorts (called out in production-launch-sweep).

---

## Phase 5 — Explicit non-goals (park)

Do not schedule these ahead of Phases 0–4:

- Weak-student multi-agent simulation
- Avatar-first polish / facial-expression scoring
- Native collaborative whiteboard (screen share remains the path)
- Broad multi-provider sprawl without BYOK
- Marketing-only redesign without ops value
- Renaming every `admin` symbol to `recruiter` in one mega-PR (incremental only)

---

## Workstream ownership map

| Workstream         | Primary artifacts                       | Depends on             |
| ------------------ | --------------------------------------- | ---------------------- |
| PR merge Wave A–D  | GitHub #3–#15                           | —                      |
| Owner verification | `.docs/verification-pending.md`         | Wave A on deployed env |
| Live-path fixes    | LiveKit/Convex/Inngest paths            | Phase 1 failures       |
| Entitlements       | `lib/saas/*`, screening/bootstrap gates | #11                    |
| Invite email       | `lib/email/*`, screening create         | #9, #5                 |
| Observability      | Sentry, health panel                    | #9                     |
| GDPR jobs          | internal mutations + runbook            | #11                    |
| Policy E2E         | templates, lobby, reports               | Phase 1 item 7         |
| Copilot            | `lib/recruiter/report-chat.ts`, UI      | Model keys optional    |
| BYOK               | settings + secret layer                 | Security guide ADR     |

---

## Suggested agent / human split

| Who    | Does                                                                                                     |
| ------ | -------------------------------------------------------------------------------------------------------- |
| Human  | Merge order decisions, Clerk/LiveKit secrets, owner-run items 1–4, billing option A/B/C                  |
| Agent  | Rebases, conflict resolution, CI fixes, Phase 2 bugfixes, Phase 3 implementation PRs, tests, doc updates |
| Either | Phase 4 product depth once G1–G4 clear                                                                   |

---

## Tracking updates (required as work lands)

After each phase exit:

1. `.docs/current-findings.md` — blockers / shipped
2. `.docs/verification-pending.md` — status + evidence
3. `.plans/hardening-and-polish-v1.md` — Verified where applicable
4. `.plans/production-launch-sweep.md` — launch bar checkmarks
5. This file — checkboxes + short “Completed” notes at bottom

Optional session handoff: `.context/session.md` (short, action-oriented).

---

## Immediate next actions (start here)

1. Merge **#6**, then **#3**, then **#5**, then **#8**, then **#4**, then **#7** (rebase between each).
2. Close **#15** if e2e fix already on `main`.
3. Merge **#10 → #13 → #14** (slim #14 if needed).
4. Merge **#11 → #9**, then **#12**.
5. Run `bun run live-path:preflight` and execute verification items 3–4 with a real agent worker.
6. Open Phase 3.1 entitlements enforcement PR only after Wave C is on `main`.

---

## Completed

_None yet — plan created 2026-07-09._
