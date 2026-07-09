# TODO

Execution priorities follow [.docs/next-phase-prd.md](.docs/next-phase-prd.md). Operational ground truth: [.docs/current-findings.md](.docs/current-findings.md).

## Active engineering

- End-to-end LiveKit path validation (see current-findings Testing Path).
- Template-driven screening policy (duration, resume, attempts) end-to-end.
- Recruiter copilot citations + durable chat metadata.
- HTTP + Convex throttles, audit trail, BYOK notes in security doc.
- Production-ready BYOK: encrypted per-workspace provider keys and safe runtime hydration.
- Flexible model selector UX: per-task model selection (agent STT/LLM/TTS and recruiter copilot) with guarded defaults.

## SaaS ops scaffolds (started)

- **Observability:** `lib/ops/error-reporting.ts` (console today; optional Sentry TODO). Wired on `/api/interviews/bootstrap` and `/api/interviews/process` catch paths. Install `@sentry/nextjs` + set `SENTRY_DSN` when enabling.
- **Email:** `lib/email/` + [.docs/email-notifications.md](.docs/email-notifications.md). `sendEmail` logs/no-ops without `RESEND_API_KEY`; Resend fetch adapter ready. Product call sites (invite + report-ready) still TODO.
- **Deploy runbook:** [.docs/deployment-runbook.md](.docs/deployment-runbook.md) — env matrix, smoke tests, rollback for `kyma.kitsunelabs.xyz` (Vercel + Convex).

## Where to go from here

- Define one polished public demo flow (invite -> interview -> report -> recruiter review) and lock it for landing-page usage.
- Add a dedicated demo tenant and controlled demo credentials strategy (no hard-coded credentials in repo).
- Add onboarding copy and conversion-focused homepage messaging for potential customers.
- Wire `sendEmail` into invite creation and report-ready paths (Inngest retries when delivery is critical).
- Enable Sentry (`@sentry/nextjs` + `SENTRY_DSN`) using the existing `reportError` entrypoint.
- Keep [.docs/deployment-runbook.md](.docs/deployment-runbook.md) updated when env or smoke steps change.

## Product non-goals (this phase)

- Weak-student multi-agent, avatar-first polish, facial scoring, provider sprawl without BYOK.

## Commands

- `bun install` / `bun run dev` / `bun run dev:stack` / `bun run test` / `bun run typecheck` / `bun run lint`
