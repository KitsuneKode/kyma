# Plan 007: Mock practice + demo gating

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `.plans/implementation-wave/README.md`.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: .plans/implementation-wave/006-tier1-foundation.md
- **Category**: product
- **Planned at**: horizontal hiring roadmap, 2026-06-25

## Why this matters

Practice interviews are a first-class growth funnel. Demo affordances must be gated so production builds feel trustworthy.

## Scope

**In scope**: `/candidate/practice` hub; `createMockInterview` with job family + rate limits; post-practice feedback route; marketing job-family slugs + CTAs; demo user / skip-auth gating

**Out of scope**: Billing, ATS integrations

## Done criteria

- [x] `/candidate/practice` hub with pack selection
- [x] Practice rate limit enforced server-side
- [x] Post-practice feedback route with candidate-safe summary
- [x] Marketing slugs include practice CTA paths
- [x] Demo-only affordances env-gated for production

## STOP conditions

- Practice sessions bypass org scoping
- Rate limit can be circumvented client-side only
