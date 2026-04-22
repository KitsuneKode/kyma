# TODO

Execution priorities follow [.docs/next-phase-prd.md](.docs/next-phase-prd.md). Operational ground truth: [.docs/current-findings.md](.docs/current-findings.md).

## Active engineering

- End-to-end LiveKit path validation (see current-findings Testing Path).
- Template-driven screening policy (duration, resume, attempts) end-to-end.
- Recruiter copilot citations + durable chat metadata.
- HTTP + Convex throttles, audit trail, BYOK notes in security doc.
- Production-ready BYOK: encrypted per-workspace provider keys and safe runtime hydration.
- Flexible model selector UX: per-task model selection (agent STT/LLM/TTS and recruiter copilot) with guarded defaults.

## Where to go from here

- Define one polished public demo flow (invite -> interview -> report -> recruiter review) and lock it for landing-page usage.
- Add a dedicated demo tenant and controlled demo credentials strategy (no hard-coded credentials in repo).
- Add onboarding copy and conversion-focused homepage messaging for potential customers.
- Add deployment runbook (env matrix, smoke tests, rollback steps) for `kyma.kitsunelabs.xyz`.

## Product non-goals (this phase)

- Weak-student multi-agent, avatar-first polish, facial scoring, provider sprawl without BYOK.

## Commands

- `bun install` / `bun run dev` / `bun run dev:stack` / `bun run test` / `bun run typecheck` / `bun run lint`