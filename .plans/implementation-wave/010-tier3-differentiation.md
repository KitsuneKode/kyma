# Plan 010: Tier 3 differentiation

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `.plans/implementation-wave/README.md`.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED
- **Depends on**: .plans/implementation-wave/009-tier2-product-depth.md
- **Category**: product
- **Planned at**: horizontal hiring roadmap, 2026-06-25

## Why this matters

Enterprise ops features (wizard, batch health, server filters, settings nav, citation previews) separate Kyma from demo-grade screeners.

## Scope

**In scope**: Multi-step screening wizard + draft; batch health columns; server-side queue filters in Convex pagination; settings sub-nav; citation hover-card on review copilot

**Out of scope**: ATS integrations, billing

## Done criteria

- [x] Screening creation wizard with draft persistence
- [x] Batch list shows health columns aligned with dashboard signals
- [x] URL queue filters applied server-side across paginated dataset
- [x] Settings page anchored sub-nav for Team / Models / Keys / Release
- [x] Citation hover-card previews evidence before jump-to-transcript

## STOP conditions

- Server-side filters break cursor stability
- Wizard draft leaks across organizations
