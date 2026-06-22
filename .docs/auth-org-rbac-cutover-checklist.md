# Auth Org RBAC Cutover Checklist

Use this checklist to avoid getting stuck during org-first auth rollout.

## 0) Preflight

- Ensure `.plans/auth-org-rbac-rewrite.md` is implemented and committed.
- Ensure env vars exist:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `CLERK_FRONTEND_API_URL` or `CLERK_JWT_ISSUER_DOMAIN`
  - `KYMA_PROCESSING_WRITE_KEY`
- Ensure Clerk has Organizations enabled.

## Quick Runbooks (Copy/Paste)

Use one of these paths exactly. The dev path is destructive to dev data.

### Dev (fastest, explicit, safe for local/dev only)

1. Run automated Clerk bootstrap (permissions, convex JWT template):

```bash
bun run clerk:setup-auth
```

Then complete the printed **Sessions → Customize session token** JSON paste (one-time).

2. Configure any remaining Clerk items (webhooks, membership optional) from this doc.
3. Ensure `.env.local` has required keys (`Clerk + KYMA_PROCESSING_WRITE_KEY`).
4. Run:

```bash
bun install
bun run convex:once
bun run db:cutover:org-rbac:dev
bun run verify:auth-org-rbac
bun run dev:stack
```

5. Verify routes manually:
   - `/candidate`
   - `/recruiter/setup`
   - `/recruiter`
   - `/i/demo-invite` or mock interview from `/candidate`

### Production (explicit, no destructive reset)

1. Configure Clerk in production:
   - org roles/permissions
   - JWT claims (`org_id`, `org_role`, `org_permissions`, `metadata.preferredWorkspace`)
   - webhook endpoint + all required events
2. Ensure production env vars include:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `CLERK_FRONTEND_API_URL` or `CLERK_JWT_ISSUER_DOMAIN`
   - `KYMA_PROCESSING_WRITE_KEY`
3. **Backfill existing recruiter-owned data with `orgId` before schema cutover.**
4. Deploy schema/functions (do not run dev reset/seed commands in prod).
5. Run post-deploy QA matrix:
   - candidate-only
   - recruiter without org
   - recruiter with org + permission
   - recruiter workspace without org
   - cross-org isolation

Production guardrail:

- Never run `db:cutover:org-rbac:dev` in production.

## Stuck after signup?

Symptom: recruiter sign-in does not reach `/recruiter`, or workspace preference does not persist.

1. Open Clerk Dashboard → **Users** → your user → **Public metadata**. You should see `preferredWorkspace` (`candidate` | `recruiter`).
2. Open **JWT Templates** → **Session token** (default). Claims must include:
   - `metadata.preferredWorkspace` from `{{user.public_metadata.preferredWorkspace}}`
   - `org_id`, `org_role`, `org_permissions` for recruiter routes
3. Open **JWT Templates** → **convex** (application ID `convex`). Same org claims as above.
4. **Organizations** enabled; membership mode **optional** (candidate + recruiter on one login).
5. Sign out and sign in once after changing the JWT template (forces a fresh session).
6. Local debug: set `KYMA_AUTH_DEBUG=1` in `.env.local` and reload a signed-in page to compare API metadata vs session claims.

Example session-token claims JSON (adjust to your Clerk UI):

```json
{
  "metadata": {
    "preferredWorkspace": "{{user.public_metadata.preferredWorkspace}}"
  },
  "org_id": "{{org.id}}",
  "org_role": "{{org.role}}",
  "org_permissions": "{{org_membership.permissions}}"
}
```

## 1) Clerk Configuration (Mandatory)

### Organization roles and permissions

- Role:
  - `org:admin`
- Permission baseline:
  - `org:recruiter:access`
- Optional staged permissions:
  - `org:recruiter:candidates:read`
  - `org:recruiter:candidates:write`
  - `org:recruiter:screenings:write`
  - `org:recruiter:templates:write`
  - `org:recruiter:settings:write`
  - `org:recruiter:billing:write`

### JWT template claims

Include these claims for app + Convex guards:

- `org_id`
- `org_role`
- `org_permissions`
- `metadata.preferredWorkspace` (`candidate|recruiter`) for routing hints only

### Clerk webhook subscriptions

- `user.created`
- `user.updated`
- `user.deleted`
- `organization.created`
- `organization.updated`
- `organization.deleted`
- `organizationMembership.created`
- `organizationMembership.updated`
- `organizationMembership.deleted`

## 2) Convex Cutover (Where teams usually get stuck)

If `bun run convex:once` fails with:

`Object is missing the required field orgId`

that means old docs in your current Convex deployment were created before org scoping.

### Dev-safe fix path (recommended)

Use seeded dev data and continue:

```bash
bun run db:cutover:org-rbac:dev
bun run convex:once
```

This is destructive for dev data by design.

### Existing data path (non-dev)

- Backfill `orgId` for recruiter-owned tables before applying strict schema.
- Do not roll schema until every recruiter-owned document has `orgId`.
- Verify with queries before promoting deployment.

## 3) App Verification Pass

Run:

```bash
bun run verify:auth-org-rbac
```

Then verify behavior manually:

- Candidate user without org can access candidate routes.
- Recruiter without active org is redirected to `/recruiter/setup`.
- Recruiter with active org and permission can access recruiter routes.
- Users with org access can switch candidate/recruiter workspaces from the header.
- Cross-org isolation holds for recruiter data.

## 4) Smoke Matrix

### Candidate-only user

- Sign in -> candidate route.
- Candidate pages work without org.
- Recruiter pages denied.

### Recruiter-only user

- Sign in without org -> `/recruiter/setup`.
- Create/join/select org -> recruiter workspace loads.
- Organization switcher changes context and access scope.

### Dual-workspace user (org member + candidate)

- `/sign-in/candidate` or `/sign-in/recruiter` for clear entry.
- Header workspace switcher persists preference.
- Recruiter routes still require active org.

## 5) Rollback Plan

- If auth routing or Convex guard behavior regresses:
  - revert deployment to previous commit
  - restore previous Clerk JWT template and webhook event set
  - run verification matrix again before re-cutover

## 6) Exit Criteria

- All checks in `.docs/verification-pending.md` pass.
- Tracker row in `.plans/hardening-and-polish-v1.md` can move from `Pending QA` to `Verified`.

## 7) Test IDs and Fixtures (Fake/Safe)

Use these non-production fixture values for local QA and docs-driven testing.
Canonical machine-readable fixtures live in:

- `.docs/fixtures/auth-org-rbac-fixtures.json`

### Stable test constants in this repo

- Demo invite token:
  - `demo-invite`
- Dev seed org id:
  - `org_seed`
- Demo fallback org id:
  - `org_demo`

### Recommended fake Clerk IDs

- Org IDs:
  - `org_test_alpha`
  - `org_test_beta`
- User IDs:
  - `user_test_candidate_01`
  - `user_test_recruiter_01`
  - `user_test_both_01`
- Membership IDs:
  - `mem_test_alpha_admin_01`
  - `mem_test_alpha_recruiter_01`
  - `mem_test_beta_recruiter_01`

### Workspace preference fixtures (`publicMetadata`)

```json
{ "preferredWorkspace": "candidate" }
```

```json
{ "preferredWorkspace": "recruiter" }
```

### JWT claim fixtures for recruiter authz

Candidate-only claim sample:

```json
{
  "sub": "user_test_candidate_01",
  "metadata": { "preferredWorkspace": "candidate" }
}
```

Recruiter claim sample (allowed):

```json
{
  "sub": "user_test_recruiter_01",
  "org_id": "org_test_alpha",
  "org_role": "org:member",
  "org_permissions": ["org:recruiter:access"],
  "metadata": { "preferredWorkspace": "recruiter" }
}
```

Recruiter claim sample (denied - no permission):

```json
{
  "sub": "user_test_recruiter_01",
  "org_id": "org_test_alpha",
  "org_role": "org:member",
  "org_permissions": [],
  "metadata": { "preferredWorkspace": "recruiter" }
}
```

Org admin claim sample:

```json
{
  "sub": "user_test_both_01",
  "org_id": "org_test_alpha",
  "org_role": "org:admin",
  "org_permissions": [],
  "metadata": { "preferredWorkspace": "recruiter" }
}
```

### Webhook payload fixture snippets

Organization created:

```json
{
  "type": "organization.created",
  "data": {
    "id": "org_test_alpha",
    "name": "Test Org Alpha",
    "slug": "test-org-alpha",
    "image_url": "https://example.com/org-alpha.png"
  }
}
```

Organization membership created:

```json
{
  "type": "organizationMembership.created",
  "data": {
    "id": "mem_test_alpha_recruiter_01",
    "role": "org:member",
    "permissions": ["org:recruiter:access"],
    "organization": { "id": "org_test_alpha" },
    "public_user_data": { "user_id": "user_test_recruiter_01" }
  }
}
```

### Route QA shortcuts

- Candidate flow page:
  - `/candidate`
- Recruiter flow page:
  - `/recruiter`
- Recruiter onboarding with no org selected:
  - `/recruiter/setup`
- Team invite accept:
  - `/join/[orgId]`
- Short candidate invite link:
  - `/i/[token]`
- Mock interview (auth-gated):
  - `/candidate` → "Try mock interview"
