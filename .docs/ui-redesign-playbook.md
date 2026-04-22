# UI Redesign Playbook

Use this checklist when redesigning surfaces.

## 1) Choose the right shell first

- Marketing change? Work in `(marketing)` and `components/marketing/*`.
- Auth change? Work in `(auth)` pages/layout only.
- Operator workflow change? Work in `(app)` routes/layout.

## 2) Preserve boundaries

- Do not add shell chrome inside `app/providers.tsx`.
- Do not mix marketing UI primitives into recruiter workflow pages.
- Keep candidate invite flow concerns inside `/interviews/[inviteId]`.

## 3) Build sections, not one-offs

- Add new marketing blocks as section components.
- Keep section contracts typed and composable.
- Recompose pages via config arrays instead of copy-paste blocks.

## 4) Keep behavior trustworthy

- Maintain clear access states and error messaging.
- Keep evidence-backed review UX intact when restyling.
- Preserve reduced-motion and baseline accessibility expectations.

## 5) Update docs as part of done

- Route boundary changes -> `.docs/route-and-api-architecture.md`
- Auth/guard changes -> `.docs/auth-and-access-boundaries.md`
- Env behavior changes -> `.docs/env-model.md`
- Marketing composition contract changes -> `.docs/marketing-section-contract.md`
