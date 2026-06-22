# Auth and Access Boundaries

## Source of truth

- Clerk is the authentication authority for operator routes.
- Recruiter authorization is Clerk Organizations (`orgId` + org permissions).
- Candidate screening invites require auth + auto-claim; mock interviews are provisioned from `/candidate`.

## Route ownership

- `(auth)` group owns:
  - `/sign-in/[[...sign-in]]`
  - `/sign-up/[[...sign-up]]`
- `(app)` group owns authenticated candidate experiences and recruiter org setup:
  - `/candidate*`
  - `/recruiter/setup`
  - `/join/[orgId]`
  - `/auth/continue`
  - `/onboarding*` (legacy redirects only)
  - `/video-demo`
  - `/write-up`
- `(admin)` group owns recruiter workspace shell:
  - `/recruiter/*` (except setup, which lives in `(app)`)
- Public candidate flow:
  - `/i/[token]` and `/interviews/[inviteId]` (screening invites gate auth on page)
  - `/interviews` legacy index is hard-cut (404)

## Middleware policy

- [`proxy.ts`](../proxy.ts) delegates redirects to `resolveAppRoute` in [`lib/auth/routing.ts`](../lib/auth/routing.ts).
- Protect recruiter, candidate, onboarding, and app-shell routes when Clerk credentials are present.
- Recruiter workspace routes except `/recruiter/setup` require an active org with `org:recruiter:access` or `org:admin` before the page resolves.
- Redirect signed-in users away from auth pages via workspace routing.
- Public at middleware: `/`, `/i/*`, `/interviews/*`, `/api/*`.
- Legacy `/admin/*` redirects to `/recruiter/*`.

## Workspace preference (routing only)

- Set via Clerk `publicMetadata.preferredWorkspace` (`candidate` | `recruiter`).
- Exposed in JWT as `sessionClaims.metadata.preferredWorkspace`.
- Parsed by `preferredWorkspaceFromSessionClaims` in [`lib/auth/clerk-role.ts`](../lib/auth/clerk-role.ts).
- **Not** used to deny recruiter or candidate API access.
- No routing cookie bridge; preference is Clerk metadata only.

## Recruiter access (authorization)

- Resolved via `resolveRecruiterAccess({ orgId, has })` in [`lib/auth/clerk-role.ts`](../lib/auth/clerk-role.ts).
- Convex uses `requireRecruiterMember`, `requireRecruiterCapability`, and `requireAdmin` in [`convex/helpers/auth.ts`](../convex/helpers/auth.ts).
- Feature writes should use exact capabilities (`recruiter:candidates:write`, `recruiter:screenings:write`, `recruiter:templates:write`, `recruiter:settings:write`) rather than broad workspace access.

## Candidate portal boundary

- `/candidate/*` requires sign-in only.
- Recruiters with org access may use candidate routes; recruiter-only operations remain org-gated.
- Invite-first: recruiters share `/i/[token]`; candidates auto-claim on auth.

## Convex projection

- Clerk webhooks sync `users.preferredWorkspace` for analytics/queries.
- Authorization in Convex recruiter functions uses JWT org claims via [`convex/helpers/auth.ts`](../convex/helpers/auth.ts).
- `users.role` is not used for auth.

## Local troubleshooting

See **Stuck after signup** in [`.docs/auth-org-rbac-cutover-checklist.md`](auth-org-rbac-cutover-checklist.md). The shortest local recovery path is:

```bash
bun run convex:sync-env
bun run clerk:setup-auth
bun run dev:stack
```

Then sign out and sign in once, and verify `/dev` shows both Clerk and Convex authenticated. Set `KYMA_AUTH_DEBUG=1` for an on-page claim comparison banner (dev only).
