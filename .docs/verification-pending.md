# Verification Pending (Owner-Run)

This file is the unresolved execution queue only. For procedure steps, use
`.docs/backend-verification-runbook.md`.

Update rule: update this queue first; update the runbook only when procedure changes.

## Priority 1: Access and Identity

### 1) Clerk webhook sync smoke

- Blocker cleared: org/member projection drift between Clerk and Convex mirrors.
- Procedure: `.docs/backend-verification-runbook.md#item-1-clerk-sync-21`

### 2) RBAC denial matrix

- Blocker cleared: recruiter access without active org context or permission.
- Procedure: `.docs/backend-verification-runbook.md#item-2-rbac--routing-matrix-01--22`

### 2.1) Org context enforcement matrix

- Validate recruiter route denial when `orgId` is missing.
- Validate recruiter route denial when `org:recruiter:access` permission is absent.
- Validate candidate routes continue without org context.

### 2.2) Cross-org isolation smoke

- Create two orgs with recruiter memberships and confirm no cross-org read/write for:
  - candidates and reports
  - screening batches
  - workspace settings

## Priority 2: Interview Session Safety

### 3) LiveKit invite + identity invariants

- Blocker cleared: session takeover and token misuse risk.
- Procedure: `.docs/backend-verification-runbook.md#item-3-livekit--session-continuity-02--continuity`

### 4) Reconnect timer continuity

- Blocker cleared: broken interview timing and inconsistent final scoring context.
- Procedure: `.docs/backend-verification-runbook.md#item-3-livekit--session-continuity-02--continuity`

## Priority 3: Data and Output Correctness

### 5) Candidate dashboard result gating

- Blocker cleared: premature report exposure.
- Procedure: `.docs/backend-verification-runbook.md#item-4-candidate-dashboard-data-23`

### 6) BYOK provider validation

- Blocker cleared: runtime model failures and key-handling trust gap.
- Procedure: `.docs/backend-verification-runbook.md#item-5-byok--provider-validation-31--32`

### 7) Template version history integrity

- Blocker cleared: missing audit trail for evaluator prompt/rubric changes.
- Procedure: `.docs/backend-verification-runbook.md#item-6-template-workflow-completion-33`

## Exit Criteria

After all seven checks pass, mark corresponding backend tracker items as
`Verified` in `.plans/hardening-and-polish-v1.md`.
