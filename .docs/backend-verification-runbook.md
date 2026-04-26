# Backend Verification Runbook (Agent A)

This runbook is procedure-only. For unresolved priority and blocker status, use
`.docs/verification-pending.md`.

Update rule: update pending queue first; update this runbook only when procedure changes.

## Prerequisites

- `KYMA_PROCESSING_WRITE_KEY` is set in all non-local environments.
- `KYMA_ENCRYPTION_KEY` is set to a 64-char hex key.
- `CLERK_WEBHOOK_SIGNING_SECRET` is set for the Clerk webhook endpoint.
- At least one admin user exists (via `KYMA_ADMIN_EMAILS` bootstrap or manual role assignment).

## Item 1: Clerk Sync (2.1)

Route: `POST /api/webhooks/clerk`

Expected behavior:

- `user.created` creates local `users` row.
- `user.updated` updates local email/name/role.
- `user.deleted` removes local `users` row.

Procedure:

- Configure Clerk webhook endpoint to `https://<host>/api/webhooks/clerk`.
- Subscribe to `user.created`, `user.updated`, `user.deleted`.
- Trigger each event from Clerk dashboard test UI.
- Confirm corresponding changes in Convex `users` table.

## Item 2: RBAC + Routing Matrix (0.1 + 2.2)

Roles to validate:

- `admin`
- `recruiter`
- `candidate`
- signed-in with missing role
- signed-out

Procedure outcomes:

- Non-admin/recruiter cannot read recruiter/admin Convex APIs.
- `/admin/*` blocks candidate + missing-role users.
- `/dashboard/*` blocks unauthorized roles per guard policy.
- Missing role routes to onboarding flow.

## Item 3: LiveKit + Session Continuity (0.2 + continuity)

Procedure:

- Start interview session and join with valid invite.
- Verify participant identity mismatch is rejected.
- Force reconnect and confirm:
  - `reconnectCount` increments
  - `activeDurationMs` accumulates correctly
  - transcript/event continuity is preserved
- Confirm invalid invite token returns `403` on token route.

## Item 4: Candidate Dashboard Data (2.3)

Procedure:

- Create candidate account linked by email to invite.
- Confirm `listCandidateInterviews` returns expected sessions.
- Confirm `getCandidateInterviewResult` hides unreleased reports.
- Mark report as released and confirm candidate can read result.

## Item 5: BYOK + Provider Validation (3.1 + 3.2)

Procedure:

- Add provider keys through admin settings for OpenAI, Anthropic, Google/Gemini, Deepgram.
- Run `testProviderConnection` for each provider.
- Confirm recruiter chat uses:
  - workspace model resolution
  - request-scoped AI SDK BYOK for supported providers
- Verify no decrypted key appears in logs or API responses.

## Item 6: Template Workflow Completion (3.3)

Expected backend behavior:

- `updateAssessmentTemplate` increments `rubricVersion`.
- Save writes an immutable snapshot into `assessmentTemplateVersions`.
- `listTemplateVersions` returns the latest 50 versions for audit display.

Procedure:

- Save template multiple times with different prompt/rubric/model overrides.
- Confirm version increments monotonically (`v2`, `v3`, ...).
- Confirm snapshots are queryable and map to each save.
