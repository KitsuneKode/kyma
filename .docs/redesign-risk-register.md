# Redesign Risk Register

## Architecture and routing

- Provider/UI coupling in `app/providers.tsx` can reintroduce cross-shell drift.
  - Mitigation: providers remain infra-only.
  - Validation: no chrome markup in `app/providers.tsx`.
- Route-group leakage can create hidden dependencies.
  - Mitigation: keep `(marketing)`, `(auth)`, `(app)` boundaries explicit.
  - Validation: review imports for cross-shell coupling.

## Auth and access

- Redirect loops between middleware and auth pages.
  - Mitigation: one redirect policy (signed-in users to `/admin` from auth routes).
  - Validation: smoke-check `/sign-in`, `/sign-up`, protected routes.
- Public invite route accidentally protected.
  - Mitigation: keep `/interviews/[inviteId]` outside protected matcher set.
  - Validation: unauthenticated invite-link test.

## Env management

- Split-brain env handling from mixed access patterns.
  - Mitigation: enforce boundary-based modules (`lib/env/server.ts`, `lib/env/public.ts`).
  - Validation: no new ad hoc env reads in app/lib without reason.
- Server/client key boundary mistakes.
  - Mitigation: maintain strict server/client schema split.
  - Validation: typecheck/build catches + code review.

## UI system

- Monolithic marketing page growth.
  - Mitigation: section components + page composer pattern.
  - Validation: new marketing blocks added in `components/marketing/sections`.
- CTA/copy drift across sections.
  - Mitigation: enforce `marketing-section-contract` doc.
  - Validation: PR checklist references contract.

## Documentation

- Architecture docs drift from implementation.
  - Mitigation: docs update is definition of done for shell/auth/env changes.
  - Validation: docs touched in same PR when boundaries change.
