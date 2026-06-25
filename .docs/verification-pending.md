# Verification Pending (Owner-Run)

This file is the unresolved execution queue only. For procedure steps, use
`.docs/backend-verification-runbook.md`.

Update rule: update this queue first; update the runbook only when procedure changes.

| Item                                | Automated | Manual                          | Test file                            |
| ----------------------------------- | --------- | ------------------------------- | ------------------------------------ |
| 1 Clerk webhook sync                | —         | Yes                             | —                                    |
| 2 RBAC denial matrix                | —         | Yes                             | —                                    |
| 2.1 Org context enforcement         | —         | Yes                             | —                                    |
| 2.2 Cross-org isolation             | —         | Yes                             | —                                    |
| 3 LiveKit invite + identity         | —         | **Yes (owner + LiveKit creds)** | —                                    |
| 4 Reconnect timer continuity        | —         | **Yes (owner + LiveKit creds)** | —                                    |
| 5 Candidate dashboard result gating | Partial   | Yes                             | Vitest purpose filter + gating paths |
| 6 BYOK provider validation          | —         | Yes                             | —                                    |
| 7 Template version history          | —         | Yes                             | —                                    |

**Agent environment note:** Items **3** and **4** require owner-run LiveKit credentials, a running agent worker (`bun run agent:start`), and webhook reachability. These cannot be fully executed or marked passed in an agent-only environment without those secrets and a live room session. Document pass/fail with evidence in this file after owner execution — do not claim pass without transcript/report artifacts.

**Automation targets:** Item 5 routing/gating is partially covered by `convex/interviews/candidatePortal.practice.test.ts`. Practice vs screening list separation and rate-limit behavior are covered there. RBAC matrix (item 2.x) remains manual until Clerk CI test credentials exist.

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
- **Status:** Pending owner-run — requires LiveKit API keys, agent worker, and live invite session (cannot complete in agent env)
- **Pre-flight:** `/recruiter/health` should show LiveKit + agent worker checks before each attempt.

### 4) Reconnect timer continuity

- Blocker cleared: broken interview timing and inconsistent final scoring context.
- Procedure: `.docs/backend-verification-runbook.md#item-3-livekit--session-continuity-02--continuity`
- **Status:** Pending owner-run — same LiveKit credential dependency as item 3

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
