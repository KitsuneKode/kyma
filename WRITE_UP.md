# Kyma — Product & Engineering Write-Up

Kyma is a **voice-first screening platform** for tutor and communication-heavy roles.

The core idea is simple: candidates get a link, complete a short guided interview in-browser, and the hiring team receives a structured review with evidence, transcript context, and a clear recommendation signal.

**Live product:** [https://kyma.kitsunelabs.xyz](https://kyma.kitsunelabs.xyz)

---

## What makes Kyma useful

Hiring teams usually lose time in the first screen because quality is inconsistent and reviewer notes are subjective. Kyma is built to reduce that bottleneck with:

- **Consistent first-pass interviews**
- **Evidence-backed output** instead of “gut score” summaries
- **Faster reviewer throughput** while keeping humans in control
- **Clear audit trail** for transcript, events, and decision history

---

## Product capabilities today

- Invite-driven candidate entry (link-based)
- Realtime interview session orchestration
- Session lifecycle tracking and persistence
- Structured assessment report generation
- Recruiter review surface with notes and recommendation context
- Grounded recruiter copilot for post-interview questions

---

## Architecture decisions (and why they matter)

### 1) Realtime and voice: LiveKit

LiveKit handles room transport and realtime session behavior so the product can focus on interview quality, evidence, and reviewer workflows instead of re-building media primitives.

### 2) Source of truth: Convex

Convex stores invites, sessions, transcript segments, events, reports, notes, and chat messages with a clean query/mutation model. This keeps session state durable and easier to reason about.

### 3) Trustable recruiter output

Recruiter copilot responses are grounded in existing report/transcript context and can include citations metadata. If model configuration is missing or fails, the app falls back to deterministic answers rather than silent hallucination.

### 4) Server-only secrets boundary

Provider and runtime credentials stay server-side in API routes/jobs. Sensitive operations are not delegated to client-side code.

---

## Security posture

- Server-only handling of provider credentials
- Rate limits on sensitive HTTP routes
- Convex-side write throttles for high-frequency mutation paths
- Audit/event trail hooks for critical review actions

---

## Current truth on BYOK and model control

### What works now

- Interview agent STT/LLM/TTS model selection through environment variables (`LIVEKIT_AGENT_*_MODEL`)
- Recruiter report chat model selection through `KYMA_REVIEW_CHAT_MODEL`

### What is not done yet

- Full multi-tenant BYOK with per-workspace encrypted customer API keys and safe runtime key hydration

The boundary is intentionally scaffolded first so provider sprawl does not compromise security.

---

## Why this project reflects strong engineering judgment

- Prioritizes **reliability and safety** before cosmetic polish
- Uses **explicit fallbacks** instead of brittle happy-path assumptions
- Keeps architecture modular enough for provider expansion without immediate rewrite pressure
- Documents tradeoffs and limits directly (no pretending unfinished pieces are complete)

---

## What I would ship next

- Production-grade BYOK with encrypted workspace secrets
- Richer policy-driven interview templates per role
- Better recruiter analytics and cohort-level comparisons
- End-to-end quality gates for agent/runtime regressions

Priority list lives in [TODO.md](TODO.md).

---

## Why this matters from a hiring perspective

Kyma demonstrates product thinking plus pragmatic full-stack execution across realtime systems, backend state models, AI integration, and security boundaries.

It is not just an interface demo—it is a system designed for operational use in high-volume screening workflows.
