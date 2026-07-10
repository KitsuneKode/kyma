# Verification Pending (Owner-Run)

This file is the unresolved execution queue only. For procedure steps, use
`.docs/backend-verification-runbook.md`.

Update rule: update this queue first; update the runbook only when procedure changes.

| Item                                | Automated | Manual                          | Test file                                                                                     |
| ----------------------------------- | --------- | ------------------------------- | --------------------------------------------------------------------------------------------- |
| 1 Clerk webhook sync                | —         | Yes                             | —                                                                                             |
| 2 RBAC denial matrix                | —         | Yes                             | —                                                                                             |
| 2.1 Org context enforcement         | —         | Yes                             | —                                                                                             |
| 2.2 Cross-org isolation             | —         | Yes                             | —                                                                                             |
| 3 LiveKit invite + identity         | Partial   | **Yes (owner + LiveKit creds)** | `convex/bootstrap.test.ts`, `lib/livekit/token.test.ts`, `convex/livekit.test.ts`             |
| 4 Reconnect timer continuity        | Partial   | **Yes (owner + LiveKit creds)** | `convex/bootstrap.test.ts`, `lib/interview/session-machine.test.ts`, `convex/livekit.test.ts` |
| 5 Candidate dashboard result gating | Partial   | Yes                             | Vitest purpose filter + gating paths                                                          |
| 6 BYOK provider validation          | —         | Yes                             | —                                                                                             |
| 7 Template version history          | —         | Yes                             | —                                                                                             |

**Agent environment note:** Items **3** and **4** require owner-run LiveKit credentials, a running agent worker (`bun run agent:start`), and webhook reachability. These cannot be fully executed or marked passed in an agent-only environment without those secrets and a live room session. Document pass/fail with evidence in this file after owner execution — do not claim pass without transcript/report artifacts.

**2026-07-10 usable-ship preflight:** `bun run live-path:preflight` **passed** locally after #18+#20 merge (Clerk, LiveKit, `KYMA_PROCESSING_WRITE_KEY`, `KYMA_ENCRYPTION_KEY`, `KYMA_ORG_PLAN_OVERRIDE=pro` on Convex). Items **3–4** remain **Partial** until a real invite → room → transcript → report run is logged below.

**2026-07-09 agent preflight:** `bun run live-path:preflight` failed — missing `NEXT_PUBLIC_CONVEX_URL`, `KYMA_PROCESSING_WRITE_KEY`, `NEXT_PUBLIC_LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. Owner must run with production-like env.

**Automation targets:** Item 5 routing/gating is partially covered by `convex/candidatePortal.practice.test.ts`. Practice vs screening list separation and rate-limit behavior are covered there. Items **3–4** have partial Vitest coverage (`convex/bootstrap.test.ts`, `lib/livekit/token.test.ts`, `convex/livekit.test.ts`, `lib/interview/session-machine.test.ts`); owner-run LiveKit session proof still required to mark passed. RBAC matrix (item 2.x) remains manual until Clerk CI test credentials exist.

**Pre-flight script:** `bun run live-path:preflight` checks env + `/recruiter/health` readiness before owner-run items 3–4.

## Priority 1: Access and Identity

### 1) Clerk webhook sync smoke

- Blocker cleared: org/member projection drift between Clerk and Convex mirrors.
- Procedure: `.docs/backend-verification-runbook.md#item-1-clerk-sync-21`
- **Status:** Pending owner-run (Manual)

### 2) RBAC denial matrix

- Blocker cleared: recruiter access without active org context or permission.
- Procedure: `.docs/backend-verification-runbook.md#item-2-rbac--routing-matrix-01--22`
- **Status:** Pending owner-run (Manual)

### 2.1) Org context enforcement matrix

- Validate recruiter route denial when `orgId` is missing.
- Validate recruiter route denial when `org:recruiter:access` permission is absent.
- Validate candidate routes continue without org context.
- **Status:** Pending owner-run (Manual)

### 2.2) Cross-org isolation smoke

- Create two orgs with recruiter memberships and confirm no cross-org read/write for:
  - candidates and reports
  - screening batches
  - workspace settings
- **Status:** Pending owner-run (Manual)

## Priority 2: Interview Session Safety

### 3) LiveKit invite + identity invariants

- Blocker cleared: session takeover and token misuse risk.
- Procedure: `.docs/backend-verification-runbook.md#item-3-livekit--session-continuity-02--continuity`
- **Automated:** Bootstrap identity/resume invariants, JWT `candidate-{sessionId}` identity, webhook candidate-prefix handling — see test files in table above.
- **Status:** Partial — owner-run live session still required (cannot complete in agent env)
- **Pre-flight:** `/recruiter/health` + `bun run live-path:preflight` before each attempt.

### 4) Reconnect timer continuity

- Blocker cleared: broken interview timing and inconsistent final scoring context.
- Procedure: `.docs/backend-verification-runbook.md#item-3-livekit--session-continuity-02--continuity`
- **Automated:** Interrupted resume path, reconnect FSM transitions, webhook duration accrual — see test files in table above.
- **Status:** Partial — owner-run reconnect smoke still required (same LiveKit credential dependency as item 3)

## Priority 3: Data and Output Correctness

### 5) Candidate dashboard result gating

- Blocker cleared: premature report exposure.
- Procedure: `.docs/backend-verification-runbook.md#item-4-candidate-dashboard-data-23`
- **Automated:** Purpose filter excludes practice from screening dashboard (`candidatePortal.practice.test.ts`)
- **Status:** Partial — manual UI smoke still recommended

### 6) BYOK provider validation

- Blocker cleared: runtime model failures and key-handling trust gap.
- Procedure: `.docs/backend-verification-runbook.md#item-5-byok--provider-validation-31--32`
- **Status:** Pending owner-run (Manual)

### 7) Template version history integrity

- Blocker cleared: missing audit trail for evaluator prompt/rubric changes.
- Procedure: `.docs/backend-verification-runbook.md#item-6-template-workflow-completion-33`
- **Status:** Pending owner-run (Manual)

## Exit Criteria

After all seven checks pass, mark corresponding backend tracker items as
`Verified` in `.plans/hardening-and-polish-v1.md`.
