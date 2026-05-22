# Auth and Access Boundaries

## Source of truth

- Clerk is the authentication authority for operator routes.
- Recruiter authorization is Clerk Organizations (`orgId` + org permissions).
- Candidate interview invites remain token-based and public.

## Route ownership

- `(auth)` group owns:
  - `/sign-in/[[...sign-in]]`
  - `/sign-up/[[...sign-up]]`
- `(app)` group owns authenticated operator experiences:
  - `/admin*`
  - `/candidate*`
  - `/onboarding*`
  - `/video-demo`
  - `/write-up`
- Public candidate flow:
  - `/interviews` legacy surface is hard-cut (404)
  - `/interviews/[inviteId]`

## Middleware policy

- [`proxy.ts`](../proxy.ts) delegates redirects to `resolveAppRoute` in [`lib/auth/routing.ts`](../lib/auth/routing.ts).
- Protect recruiter, candidate, onboarding, and app-shell routes when Clerk credentials are present.
- Redirect signed-in users away from auth pages via workspace routing.
- Never require Clerk login for `/interviews/[inviteId]`.

## Workspace preference (routing only)

- Set via Clerk `publicMetadata.preferredWorkspace` (`candidate` | `recruiter`).
- Exposed in JWT as `sessionClaims.metadata.preferredWorkspace` (legacy `metadata.persona` still read).
- Parsed by `preferredWorkspaceFromSessionClaims` in [`lib/auth/clerk-role.ts`](../lib/auth/clerk-role.ts).
- **Not** used to deny recruiter or candidate API access.

## Candidate portal boundary

- `/candidate/*` requires sign-in only.
- Recruiters with org access may use candidate routes; recruiter-only operations remain org-gated.

## Convex projection

- Clerk webhooks sync `users.preferredWorkspace` for analytics/queries.
- Authorization in Convex recruiter functions uses JWT org claims via [`convex/helpers/auth.ts`](../convex/helpers/auth.ts).

## Local troubleshooting

See **Stuck on `/onboarding`** in [`.docs/auth-org-rbac-cutover-checklist.md`](auth-org-rbac-cutover-checklist.md). Set `KYMA_AUTH_DEBUG=1` for an on-page claim comparison banner.
