# TODO

Execution priorities follow [.docs/next-phase-prd.md](.docs/next-phase-prd.md). Operational ground truth: [.docs/current-findings.md](.docs/current-findings.md).

## Active engineering

- Owner-run LiveKit path proof (`.docs/verification-pending.md` items 3–4; GitHub issue #31).
- Finish and land `fix/production-qualification-followups` (deterministic CI/correctness). This is code, not provider evidence.
- BYOK KMS rotation + broader lifecycle after E6 owner-run validation.

Shipped; do not rebuild:

- Template-driven screening policy (duration, resume, attempts, `policySnapshot`).
- Recruiter copilot citations + durable chat metadata.
- HTTP + Convex throttles and audit trail.
- Encrypted per-workspace provider keys and `testProviderConnection`.

## SaaS ops scaffolds (started)

- **Observability:** `lib/ops/error-reporting.ts` (console today; optional Sentry TODO). Wired on `/api/interviews/bootstrap` and `/api/interviews/process` catch paths. Install `@sentry/nextjs` + set `SENTRY_DSN` when enabling.
- **Email:** `lib/email/` + [.docs/email-notifications.md](.docs/email-notifications.md). `sendEmail` logs/no-ops without `RESEND_API_KEY`; Resend fetch adapter ready. Invite email wired via `lib/recruiter/send-batch-invite-emails.ts` (batch invite flow); report-ready email still TODO.
- **Deploy runbook:** [.docs/deployment-runbook.md](.docs/deployment-runbook.md) — env matrix, smoke tests, rollback for `kyma.kitsunelabs.xyz` (Vercel + Convex).

## Where to go from here

- Define one polished public demo flow (invite -> interview -> report -> recruiter review) and lock it for landing-page usage.
- Add a dedicated demo tenant and controlled demo credentials strategy (no hard-coded credentials in repo).
- Add onboarding copy and conversion-focused homepage messaging for potential customers.
- Wire `sendEmail` into report-ready path (invite path already wired; Inngest retries when delivery is critical).
- Enable Sentry (`@sentry/nextjs` + `SENTRY_DSN`) using the existing `reportError` entrypoint.
- Keep [.docs/deployment-runbook.md](.docs/deployment-runbook.md) updated when env or smoke steps change.

## Product non-goals (this phase)

- Weak-student multi-agent, avatar-first polish, facial scoring, provider sprawl without BYOK.

## Commands

- `bun install` / `bun run dev` / `bun run dev:stack` / `bun run test` / `bun run typecheck` / `bun run lint`
