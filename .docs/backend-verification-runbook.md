# Backend Verification Runbook (Agent A)

This runbook closes the remaining "Partial Verified" backend items with explicit checks.

## Prerequisites

- `KYMA_PROCESSING_WRITE_KEY` is set in all non-local environments.
- `KYMA_ENCRYPTION_KEY` is set to a 64-char hex key.
- `CLERK_WEBHOOK_SIGNING_SECRET` is set for the Clerk webhook endpoint.
- At least one admin user exists (via `KYMA_ADMIN_EMAILS` bootstrap or manual role assignment).

## Clerk Sync (2.1)

Route: `POST /api/webhooks/clerk`

Expected behavior:

- `user.created` creates local `users` row.
- `user.updated` updates local email/name/role.
- `user.deleted` removes local `users` row.

Checklist:

- Configure Clerk webhook endpoint to `https://<host>/api/webhooks/clerk`.
- Subscribe to `user.created`, `user.updated`, `user.deleted`.
- Trigger each event from Clerk dashboard test UI.
- Confirm corresponding changes in Convex `users` table.

## RBAC + Routing Matrix (0.1 + 2.2)

Validate all pages and function access for these roles:

- `admin`
- `recruiter`
- `candidate`
- signed-in with missing role
- signed-out

Required outcomes:

- Non-admin/recruiter cannot read recruiter/admin Convex APIs.
- `/admin/*` blocks candidate + missing-role users.
- `/dashboard/*` blocks unauthorized roles per guard policy.
- Missing role routes to onboarding flow.

## Candidate Dashboard Data (2.3)

Checklist:

- Create candidate account linked by email to invite.
- Confirm `listCandidateInterviews` returns expected sessions.
- Confirm `getCandidateInterviewResult` hides unreleased reports.
- Mark report as released and confirm candidate can read result.

## LiveKit + Session Continuity (0.2 + continuity)

Checklist:

- Start interview session and join with valid invite.
- Verify participant identity mismatch is rejected.
- Force reconnect and confirm:
  - `reconnectCount` increments
  - `activeDurationMs` accumulates correctly
  - transcript/event continuity is preserved
- Confirm invalid invite token returns `403` on token route.

## BYOK + Provider Validation (3.1 + 3.2)

Checklist:

- Add provider keys through admin settings for OpenAI, Anthropic, Google/Gemini, Deepgram.
- Run `testProviderConnection` for each provider.
- Confirm recruiter chat uses:
  - workspace model resolution
  - request-scoped AI SDK BYOK for supported providers
- Verify no decrypted key appears in logs or API responses.

## Template Workflow Completion (3.3)

Backend behaviors now expected:

- `updateAssessmentTemplate` increments `rubricVersion`.
- save writes an immutable snapshot into `assessmentTemplateVersions`.
- `listTemplateVersions` returns the latest 50 versions for audit display.

Checklist:

- Save template multiple times with different prompt/rubric/model overrides.
- Confirm version increments monotonically (`v2`, `v3`, ...).
- Confirm snapshots are queryable and map to each save.
