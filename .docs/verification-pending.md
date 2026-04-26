# Verification Pending (Owner-Run)

This file is the short execution queue for pending backend verification.
It is intentionally not a full runbook; each item states what to test and what blocker it clears.

## Priority 1: Access and Identity

### 1) Clerk webhook sync smoke

- Test: trigger `user.created`, `user.updated`, `user.deleted` to `POST /api/webhooks/clerk`.
- Pass condition: Convex `users` rows are created/updated/deleted with expected role.
- Clears blocker: role drift between Clerk metadata and Convex user records.

### 2) RBAC denial matrix

- Test: call recruiter/admin surfaces as `candidate` and missing-role user.
- Pass condition: protected Convex functions reject unauthorized access.
- Clears blocker: accidental cross-role data access in prod.

## Priority 2: Interview Session Safety

### 3) LiveKit invite + identity invariants

- Test: valid invite join, invalid invite join, mismatched participant identity.
- Pass condition: invalid/mismatch requests are blocked; valid joins succeed.
- Clears blocker: session takeover and token misuse risk.

### 4) Reconnect timer continuity

- Test: interrupt and reconnect active interview twice.
- Pass condition: `reconnectCount` increments and `activeDurationMs` accumulates correctly.
- Clears blocker: broken interview timing and inconsistent final scoring context.

## Priority 3: Data and Output Correctness

### 5) Candidate dashboard result gating

- Test: unreleased vs released report visibility for candidate routes.
- Pass condition: unreleased is hidden; released is visible only to correct candidate.
- Clears blocker: premature report exposure.

### 6) BYOK provider validation

- Test: run provider connection test for OpenAI, Anthropic, Google/Gemini, Deepgram.
- Pass condition: valid keys pass, invalid keys fail cleanly, no plaintext key leakage.
- Clears blocker: runtime model failures and key-handling trust gap.

### 7) Template version history integrity

- Test: save template 3+ times with changed prompts/rubric/models.
- Pass condition: `rubricVersion` increments and each save writes one immutable snapshot.
- Clears blocker: no audit trail for evaluator prompt/rubric changes.

## Exit Criteria

After all seven checks pass, remaining backend status can move from "Partial Verified" to "Verified"
for the corresponding tracker items in `.plans/hardening-and-polish-v1.md`.
