# Auth + Org RBAC Contract

## Scope

- Recruiter authorization source of truth is Clerk Organizations context.
- Candidate authorization source of truth is signed-in user identity + invite token claim.
- `publicMetadata.preferredWorkspace` is a routing preference only (not authorization).
- Convex mirrors are projection/cache and never authoritative for recruiter authz.
- `users.role` in Convex is analytics projection only — never used for auth decisions.

## Workspace preference contract

- Claim location: `sessionClaims.metadata.preferredWorkspace`
- Allowed values: `candidate` | `recruiter`
- Legacy `metadata.persona` is no longer read or written.
- Missing preference → `/auth/continue` (defaults to candidate workspace).

## Access resolver (single source)

[`resolveRecruiterAccess({ orgId, has })`](../lib/auth/clerk-role.ts) returns:

- `canAccessRecruiter`: `org:admin` or `org:recruiter:access`
- `isOrgAdmin`: `org:admin` only

Used by `proxy.ts`, [`lib/auth/access.ts`](../lib/auth/access.ts), and [`lib/auth/workspace-actions.ts`](../lib/auth/workspace-actions.ts).

## Route contract

### Public routes

- `/`
- `/sign-in`, `/sign-up`
- `/i/*`, `/interviews/*` (invite-token gate at data layer; screening invites require auth on page)
- `/api/*` (route-local auth policy)

### Candidate routes

- `/candidate/*`
- Requires signed-in user only.
- Must not require org context.
- Any signed-in user may access (including recruiters).

### Recruiter routes

- `/recruiter/*` (except `/recruiter/setup`)
- Requires signed-in user.
- Requires active Clerk org context (`orgId`).
- Requires `org:admin` or `org:recruiter:access`.

### Recruiter setup routes

- `/recruiter/setup`, `/join/[orgId]`
- Requires signed-in user only.
- No org permission required (user is creating or joining an org).

### Legacy routes

- `/admin/*` → middleware redirects to `/recruiter/*`
- `/onboarding` → `/auth/continue`
- `/onboarding/recruiter` → `/recruiter/setup`

### Auth route redirects

Signed-in user visiting `/sign-in` or `/sign-up` uses `getPostSignInPath` in [`lib/auth/access.ts`](../lib/auth/access.ts) backed by [`lib/auth/routing.ts`](../lib/auth/routing.ts).

## Recruiter RBAC matrix

Two enforced roles:

| Role                     | Clerk signal           | Capabilities                                                 |
| ------------------------ | ---------------------- | ------------------------------------------------------------ |
| **Admin**                | `org:admin`            | Settings, BYOK, team invites, templates, screenings, billing |
| **Recruiter / Reviewer** | `org:recruiter:access` | Review queue, decisions, notes, candidate read               |

Capability → permission mapping:

| Capability                   | Clerk permission                 | Typical role |
| ---------------------------- | -------------------------------- | ------------ |
| Recruiter workspace access   | `org:recruiter:access`           | Recruiter    |
| View candidates/reports      | `org:recruiter:candidates:read`  | Recruiter    |
| Write decisions/notes        | `org:recruiter:candidates:write` | Recruiter    |
| Manage screening batches     | `org:recruiter:screenings:write` | Admin        |
| Manage templates             | `org:recruiter:templates:write`  | Admin        |
| Manage org settings          | `org:recruiter:settings:write`   | Admin        |
| Billing/entitlements actions | `org:recruiter:billing:write`    | Admin        |

`org:admin` bypasses all permission checks.

**No super-permission shortcut:** `org:recruiter:access` does not satisfy unrelated capability checks in Convex (`hasOrgPermission` requires exact permission or admin).

## Convex auth helpers

| Helper                                 | Purpose                                             |
| -------------------------------------- | --------------------------------------------------- |
| `requireRecruiterMember`               | Baseline org member access (`org:recruiter:access`) |
| `requireAdmin`                         | Admin-only mutations (settings, invites, templates) |
| `recruiterQuery` / `recruiterMutation` | Org-scoped reads/writes for any member              |
| `orgAdminMutation` / `adminQuery`      | Admin-only org-scoped operations                    |

`requireAdminIdentity` is deprecated; use `requireRecruiterMember`.

## Fallback and redirect rules

Implemented in `resolveAppRoute` ([`lib/auth/routing.ts`](../lib/auth/routing.ts)):

- Missing active org or permission on recruiter routes → `/recruiter/setup`
- Candidate routes never require a stored workspace preference
- Missing workspace preference after sign-in → `/auth/continue`
- Legacy `/onboarding*` → `/auth/continue` or `/recruiter/setup`

## Auth entry points

| URL                                        | Audience                                           |
| ------------------------------------------ | -------------------------------------------------- |
| `/sign-in/candidate`, `/sign-up/candidate` | Candidates                                         |
| `/sign-in/recruiter`, `/sign-up/recruiter` | Recruiters                                         |
| `/sign-in`, `/sign-up`                     | General (with cross-links)                         |
| `/auth/continue`                           | Post-login workspace persist + redirect (internal) |

## UI

- Recruiter org setup: [`app/(app)/recruiter/setup/page.tsx`](<../app/(app)/recruiter/setup/page.tsx>)
- Team invites: [`app/(admin)/recruiter/settings/page.tsx`](<../app/(admin)/recruiter/settings/page.tsx>) + `/join/[orgId]`
- Header workspace switcher when `canAccessRecruiter` ([`components/auth/workspace-switcher.tsx`](../components/auth/workspace-switcher.tsx))
- Recruiter org switcher in admin layout only
- No user-facing JWT setup cards; misconfig is ops-only (`KYMA_AUTH_DEBUG=1` banner)

## API contract

- Recruiter API/Convex operations: active org + permission checks from Clerk JWT.
- Candidate APIs: user identity / candidate ownership + invite token where applicable.
- Entitlements (future): org-scoped, composed after permission checks.
