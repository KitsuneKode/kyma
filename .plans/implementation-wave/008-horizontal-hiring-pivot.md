# Plan 008: Horizontal hiring pivot

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `.plans/implementation-wave/README.md`.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: .plans/implementation-wave/007-mock-practice-gate.md
- **Category**: product
- **Planned at**: horizontal hiring roadmap, 2026-06-25

## Why this matters

FAANG and non-technical buyers need role-specific screenings beyond tutor/teaching. Schema and starter libraries make Kyma a horizontal voice screener.

## Scope

**In scope**: `jobFamily` / `simulationMode` schema + migration; job-family starter library; agent generalization; template `DataTable` gallery; docs repositioning in `AGENTS.md` / `.docs/`

**Out of scope**: Per-org LLM fine-tuning

## Done criteria

- [x] `jobFamily` and `simulationMode` on assessment templates
- [x] Job-family starters for SWE, tutor, and additional families
- [x] Agent reads generalized simulation persona prompts
- [x] Template library supports job family metadata
- [x] Architecture docs describe horizontal thesis

## STOP conditions

- Legacy tutor templates break after migration
- Agent ignores `simulationMode` for non-teaching roles
