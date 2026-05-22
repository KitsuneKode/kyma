# Auth + Org RBAC Contract

## Scope

- Recruiter authorization source of truth is Clerk Organizations context.
- Candidate authorization source of truth is signed-in user identity only.
- `publicMetadata.preferredWorkspace` is a routing preference only (not authorization).
- Convex mirrors are projection/cache and never authoritative for recruiter authz.

## Workspace preference contract

- Claim location: `sessionClaims.metadata.preferredWorkspace`
- Allowed values: `candidate` | `recruiter`
- Legacy read: `sessionClaims.metadata.persona` (`candidate` | `recruiter` | `both`)
- Do not write `both` for new users; dual access is derived at runtime when the user has recruiter org permission.
- Missing preference → `/auth/continue` (defaults to candidate); `/onboarding` is optional.

## Route contract

### Public routes

- `/`
- `/sign-in`
- `/sign-up`
- `/interviews/*` (invite-token gate)
- `/api/*` (route-local auth policy)

### Candidate routes

- `/candidate/*`
- Requires signed-in user only.
- Must not require org context.
- Any signed-in user may access (including recruiters).

### Recruiter routes

- `/recruiter/*`
- `/admin/*` (recruiter workspace)
- Requires signed-in user.
- Requires active Clerk org context (`orgId`).
- Requires `org:admin` or `org:recruiter:access`.

### Auth route redirects

Signed-in user visiting `/sign-in` or `/sign-up` uses `getPostSignInPath` in [`lib/auth/access.ts`](../lib/auth/access.ts) backed by [`lib/auth/routing.ts`](../lib/auth/routing.ts).

## Recruiter RBAC matrix

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

## Fallback and redirect rules

Implemented in `resolveAppRoute` ([`lib/auth/routing.ts`](../lib/auth/routing.ts)):

- Missing active org on recruiter routes → `/onboarding/recruiter`
- Missing recruiter permission with active org → `/candidate`
- Candidate routes never require a stored workspace preference
- Missing workspace preference after sign-in → `/auth/continue`
- Completed onboarding on `/onboarding` → workspace home

## Auth entry points

| URL                                        | Audience                                           |
| ------------------------------------------ | -------------------------------------------------- |
| `/sign-in/candidate`, `/sign-up/candidate` | Candidates                                         |
| `/sign-in/recruiter`, `/sign-up/recruiter` | Recruiters                                         |
| `/sign-in`, `/sign-up`                     | General (with cross-links)                         |
| `/auth/continue`                           | Post-login workspace persist + redirect (internal) |

## UI

- First-run: [`app/(app)/onboarding/page.tsx`](<../app/(app)/onboarding/page.tsx>) (candidate vs recruiter workspace choice)
- Header workspace switcher when `canAccessRecruiter` ([`components/auth/workspace-switcher.tsx`](../components/auth/workspace-switcher.tsx))
- Recruiter org switcher stays in admin layout only

## API contract

- Recruiter API/Convex operations: active org + permission checks from Clerk JWT.
- Candidate APIs: user identity / candidate ownership only.
- Entitlements (future): org-scoped, composed after permission checks.
