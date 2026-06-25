# Plan 006: Tier 1 foundation credibility

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `.plans/implementation-wave/README.md`.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: .plans/implementation-wave/001–005 (uplift baseline)
- **Category**: ux
- **Planned at**: horizontal hiring roadmap, 2026-06-25

## Why this matters

Admin and recruiter surfaces must feel finished before growth features ship. Unified query states, shadcn forms, and surface tokens restore trust in daily ops.

## Scope

**In scope**: `WorkspaceQueryState` on templates/settings/screenings/health; template edit shadcn forms; `WorkspaceSurface` sweep; screening batch detail polish; motion presets baseline; `WorkspacePageHeader` unification

**Out of scope**: Mock practice, horizontal schema, server-side queue filters

## Done criteria

- [x] Query lifecycle unified on recruiter list routes
- [x] Template edit uses shadcn inputs + toast save
- [x] Hand-rolled card shadows replaced with workspace surfaces
- [x] Screening batch detail uses single empty pattern + `StatusBadge`
- [x] `lib/motion/presets.ts` + `client-motion` entry exists
- [x] `bun run test && bun run build` pass

## STOP conditions

- Template save breaks rubric version snapshots
- Screening create SSR bootstrap fails for new orgs
