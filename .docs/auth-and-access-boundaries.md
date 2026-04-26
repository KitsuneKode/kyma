# Auth and Access Boundaries

## Source of truth

- Clerk is the authentication authority for operator routes.
- Candidate interview invites remain token-based and public.

## Route ownership

- `(auth)` group owns:
  - `/sign-in/[[...sign-in]]`
  - `/sign-up/[[...sign-up]]`
- `(app)` group owns authenticated operator experiences:
  - `/admin*`
  - `/candidate*`
  - `/video-demo`
  - `/write-up`
- Public candidate flow:
  - `/interviews` legacy surface is hard-cut (404)
  - `/interviews/[inviteId]`

## Middleware policy

- Protect `/admin*`, `/candidate*`, `/video-demo`, and `/write-up` when Clerk credentials are present.
- Redirect signed-in users away from auth pages via persona routing.
- Never require Clerk login for `/interviews/[inviteId]`.

## Candidate portal boundary

- `/candidate/*` is candidate-only by default.
- Recruiters and admins must use explicit impersonation tooling for candidate-view workflows, not direct navigation to candidate routes.

## Role-ready seam

- **Clerk is the source of truth for `role`:** set `user.publicMetadata.role` (`admin` | `recruiter` | `candidate`) via Clerk Dashboard, Backend API, or webhooks — not from untrusted client code.
- **JWT template** must include that metadata so the Next.js `auth().sessionClaims` and Convex `ctx.auth.getUserIdentity()` see the same claim; app code reads the role via `lib/auth/clerk-role.ts` (`roleFromSessionClaims`) and middleware (`proxy.ts`).
- Optional: sync `users.role` in Convex with a **Clerk webhook** for analytics or queries that cannot read JWT; authorization must still use JWT/Convex identity checks in public functions.
- `lib/auth/access.ts` remains a generic signed-in/ anonymous helper unless extended to use `roleFromSessionClaims` for RSCs.
