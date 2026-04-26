# Auth + Org RBAC Contract

## Scope

- Recruiter authorization source of truth is Clerk Organizations context.
- Candidate authorization source of truth is signed-in identity plus persona hint.
- `publicMetadata` is for persona/routing hints only.
- Convex mirrors are projection/cache and never authoritative for recruiter authz.

## Persona Hint Contract

- Claim location: `sessionClaims.metadata.persona`
- Allowed values:
  - `candidate`
  - `recruiter`
  - `both`
- Invalid/missing persona falls back to onboarding.

## Route Contract

### Public routes

- `/`
- `/sign-in`
- `/sign-up`
- `/interviews/*` (invite-token gate)
- `/api/*` (route-local auth policy)

### Candidate routes

- `/candidate/*`
- Requires signed-in user.
- Must not require org context.
- Persona gate:
  - allow `candidate`
  - allow `both`
  - deny `recruiter` (redirect recruiter workspace when org context exists)

### Recruiter routes

- `/recruiter/*`
- `/admin/*` (current recruiter workspace path)
- Requires signed-in user.
- Requires active Clerk org context (`orgId`).
- Requires one of:
  - role `org:admin`, or
  - permission `org:recruiter:access`.

### Auth route redirects

- Signed-in user visiting `/sign-in` or `/sign-up`:
  - persona `recruiter` + active org + recruiter access -> `/recruiter`
  - persona `both` + active org + recruiter access -> `/recruiter`
  - persona `candidate` or `both` without recruiter access -> `/candidate`
  - missing/invalid persona -> `/onboarding`

## Recruiter RBAC Matrix

| Capability                   | Clerk permission                 | Notes                                    |
| ---------------------------- | -------------------------------- | ---------------------------------------- |
| Recruiter workspace access   | `org:recruiter:access`           | Baseline permission for recruiter routes |
| View candidates/reports      | `org:recruiter:candidates:read`  | Required for read-only review pages      |
| Write decisions/notes        | `org:recruiter:candidates:write` | Decision + annotation mutations          |
| Manage screening batches     | `org:recruiter:screenings:write` | Create/update/pause batches              |
| Manage templates             | `org:recruiter:templates:write`  | Template authoring and versioning        |
| Manage org settings          | `org:recruiter:settings:write`   | Workspace-level settings                 |
| Billing/entitlements actions | `org:recruiter:billing:write`    | Reserved gate for payments rollout       |

`org:admin` bypasses all recruiter capability checks.

## Fallback and Redirect Rules

- Missing active org on recruiter routes -> `/onboarding`.
- Missing recruiter permission with active org -> `/candidate`.
- Missing persona hint -> `/onboarding`.
- Candidate routes are always org-independent.

## API Contract

- Any recruiter API/Convex operation must be guarded by active org context and permission checks from Clerk claims/context.
- Candidate APIs must remain personal-account scoped (user identity / candidate ownership).
- Future entitlements checks must be org-scoped and composed after permission checks.
