# Kyma Agent Guide

Read this first, then use `.docs/` for architecture and `.plans/` for execution details.

## Project Shape

- `app/`: Next.js App Router UI.
- `components/`: shared UI and shadcn-based primitives.
- `lib/`: lightweight client/server helpers.
- `.docs/`: architecture, research notes, ADR-style decisions, quickstarts.
- `.plans/`: implementation plans, phase breakdowns, delivery checklists.

## Product Direction

This repo is building the Cuemath-style `AI Tutor Screener`:

- public candidate interview flow
- realtime voice interviewer
- structured tutor assessment with evidence
- admin dashboard for links, sessions, reports, and review

## Stack Defaults

- app: `Next.js`
- auth: `Clerk`
- backend + reactive data: `Convex`
- UI kit: `shadcn/ui`
- agent orchestration and structured generation: `AI SDK`
- background jobs: `Inngest`
- realtime interview transport: prefer `LiveKit` for MVP unless a later doc records a change

## Commands

- install: `bun install`
- dev: `bun run dev`
- lint: `bun run lint`
- typecheck: `bun run typecheck`
- format: `bun run format`

## Working Rules

- Core priorities, in order:
- performance first
- reliability first
- predictable behavior under load and during failures, including session restarts, reconnects, and partial streams
- If a tradeoff is required, choose correctness and robustness over short-term convenience.
- Long-term maintainability is a core priority.
- When session continuity is required, store compressed progress in `.context/session.md`.
- Keep `.context/session.md` short and action-oriented, similar to a session handoff note:
- include what was done, what is in progress, decisions made, blockers, and next steps
- prefer file references over long pasted code or transcripts
- Before adding new functionality, check whether shared logic should be extracted into a separate module.
- Duplicate logic across files is a code smell and should be removed or consolidated.
- Do not take shortcuts by adding one-off local logic when shared abstractions are the better long-term fit.
- Keep `AGENTS.md` compact. Put durable details in `.docs/`, plans in `.plans/`.
- Prefer extending existing components over bespoke primitives.
- Do not use browser Web Speech as the primary production architecture; keep it as a fallback or prototype path only.
- Optimize MVP around a polished audio interview before adding rich video features.
- Every scoring output must be structured, evidence-backed, and reviewable by a human.

## Doc Routing

- architecture and system decisions: `.docs/architecture.md`
- vendor and stack comparison: `.docs/stack-research.md`
- interview and rubric design: `.docs/interview-system.md`
- phased delivery plan: `.plans/mvp-plan.md`
- decision grilling and open questions: `.plans/grill-me.md`
