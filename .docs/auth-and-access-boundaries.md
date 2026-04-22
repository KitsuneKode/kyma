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
  - `/video-demo`
  - `/write-up`
- Public candidate flow:
  - `/interviews/[inviteId]`

## Middleware policy

- Protect `/admin*`, `/video-demo`, and `/write-up` when Clerk credentials are present.
- Redirect signed-in users away from auth pages to `/admin`.
- Never require Clerk login for `/interviews/[inviteId]`.

## Role-ready seam

- Use `lib/auth/access.ts` as the extension point for role logic.
- Current role model is intentionally minimal (`signed-in` vs `anonymous`).
- Future role enforcement (admin/recruiter/etc.) must be added in access utilities and middleware policy, not page-local conditionals.
