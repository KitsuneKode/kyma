# Verification Pending (Owner-Run)

This file is the unresolved execution queue only. For procedure steps, use
`.docs/backend-verification-runbook.md`.

Update rule: update this queue first; update the runbook only when procedure changes.

## Priority 1: Access and Identity

### 1) Clerk webhook sync smoke

- Blocker cleared: role drift between Clerk metadata and Convex user records.
- Procedure: `.docs/backend-verification-runbook.md#item-1-clerk-sync-21`

### 2) RBAC denial matrix

- Blocker cleared: accidental cross-role data access in production.
- Procedure: `.docs/backend-verification-runbook.md#item-2-rbac--routing-matrix-01--22`

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
