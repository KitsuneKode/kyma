# Plan 009: Tier 2 product depth

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `.plans/implementation-wave/README.md`.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: .plans/implementation-wave/008-horizontal-hiring-pivot.md
- **Category**: product
- **Planned at**: horizontal hiring roadmap, 2026-06-25

## Why this matters

Recruiters need a daily driver dashboard; candidates need trustworthy result and readiness flows after screenings.

## Scope

**In scope**: Live recruiter dashboard hydration; review console polish (badge collapse, toasts, `WorkspaceTextarea`, shortcuts); candidate result page with processing state; readiness unification across portal + lobby; profile/access polish

**Out of scope**: Full screening wizard (plan 010)

## Done criteria

- [x] Dashboard SSR shell + reactive needs-attention slice
- [x] Review console toasts + shared textarea + optional shortcuts
- [x] Candidate interview result page with portal error discriminant
- [x] Readiness shared labels across portal and lobby
- [x] `bun run test && bun run build` pass

## STOP conditions

- Review shortcuts conflict with form inputs
- Candidate result page leaks recruiter evidence
