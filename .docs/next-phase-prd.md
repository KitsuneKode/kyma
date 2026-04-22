# Next-Phase PRD

Read this when continuing the next implementation phase after the current LiveKit, Convex, Inngest, and recruiter-review foundations.

## Status

Active implementation handoff.

This document is the shortest complete context for the next agent to continue product work without rediscovering architecture, scope, or priorities.

## Product Goal

Turn Kyma from a technically functional screening system into an operationally credible hiring product.

That means:

- reliable live interview execution
- controlled candidate access
- durable transcript, recording, and report artifacts
- recruiter decision support that is fast and trustworthy
- architecture that stays maintainable as providers, models, and product surfaces grow

## What Already Exists

The current repo already has:

- public candidate flow at `/interviews/[inviteId]`
- LiveKit prejoin and room join
- LiveKit token issuance
- LiveKit webhook ingestion
- LiveKit recording artifact storage
- session persistence in Convex
- transcript persistence in Convex
- deterministic report generation
- recruiter review queue and detail page
- recruiter decisions
- screening batch creation and candidate eligibility flow
- recruiter notes
- recruiter chat with grounded fallback behavior
- Inngest route and processing hook
- `oxlint` and `oxfmt` as the primary local quality tools

This means the next phase should not rebuild foundations. It should improve the product where trust, reliability, and ops quality still feel incomplete.

## Product Thesis For The Next Phase

Kyma should feel like the system a tutoring company would rely on to screen candidates daily, not a clever demo.

The next phase should make the following feel obviously strong:

- the live interview is dependable
- the assessment output is reviewable
- the recruiter can control access and make decisions quickly
- system failures are traceable and recoverable
- future model/provider flexibility does not turn the codebase into slop

## Primary Workstreams

## 1. Live Validation And Runtime Hardening

### Why

The current codebase compiles and the product loop exists, but the real proof still depends on end-to-end runtime validation with actual LiveKit credentials, agent runtime, transcript quality, webhook delivery, and recording output.

### Goals

- validate the full room flow with a real candidate session
- confirm agent join reliability
- confirm transcript quality and completeness
- confirm webhook delivery and artifact ingestion
- confirm recording URLs and recruiter replay readiness
- confirm processing produces report + evidence on the real path

### Required Outcomes

- one real session can complete end-to-end without manual data repair
- session state is not left hanging in ambiguous states
- transcript and recording artifacts appear where expected
- recruiter review data is consistent after session completion

### Acceptance Criteria

- candidate joins via prejoin and enters room successfully
- interviewer agent joins the same room
- transcript segments appear during or after the session
- recording artifact rows appear when configured
- session moves to `processing` and then `completed` or `manual_review`
- recruiter detail page shows report, evidence, notes, and chat context

## 2. Template-Driven Screening Policy

### Why

The current screening creation flow exists, but policy is still driven by app defaults rather than a first-class template or screening configuration model.

### Goals

- move interview duration, expiry, attempts, and session policy into template/screening data
- stop hardcoding behavior that should be product-configurable
- prepare the system for multiple screening modes later

### Required Configuration

- target duration
- expiry policy
- allowed attempts
- resume policy
- role/skill focus
- rubric version
- optional interview style mode

### Acceptance Criteria

- screening creation exposes policy inputs clearly
- candidate flow reflects the configured policy, not just default values
- Convex records policy in a durable, queryable way
- report/recruiter surfaces show which policy version was used

## 3. Recruiter Copilot Hardening

### Why

Recruiter chat exists, but it still needs clearer grounding, clearer quality boundaries, and better auditability before it should be treated as a serious product feature.

### Goals

- make recruiter chat visibly grounded in transcript, evidence, and report
- add clearer distinctions between fallback mode and model-backed mode
- improve answer reliability and traceability
- make chat part of the recruiter workflow, not a novelty

### Must-Have Improvements

- answer provenance or source references
- stronger guardrails against unsupported claims
- persistent message history with useful metadata
- better prompts for recruiter-specific questions:
  - strengths
  - risks
  - recommendation
  - missing evidence
  - follow-up areas

### Acceptance Criteria

- recruiter chat answers are grounded in session artifacts
- unsupported questions are handled conservatively
- chat history is durable and reviewable
- recruiter can see enough context to trust or reject the answer

## 4. Security, BYOK, And Provider Boundaries

### Why

This is the point where provider flexibility can easily turn into bad security and messy architecture if we do not shape it now.

### Goals

- define a safe BYOK architecture before implementation sprawl
- keep provider secrets server-only
- make future provider routing a deliberate platform layer
- reduce abuse and access risks on public and recruiter routes

### BYOK Principles

- keys never reach the client
- keys are not stored in plaintext
- keys are decrypted only in server/job execution
- all provider resolution happens through shared server-side boundaries
- logs and errors must redact sensitive values

### Security Hardening Goals

- rate limiting for public invite flow
- rate limiting for recruiter chat flow
- signature verification on webhook routes
- audit trail for recruiter/admin actions
- clear separation between public routes and recruiter-only data access

### Acceptance Criteria

- a concrete BYOK design exists before broad provider support is added
- security-sensitive routes have explicit controls and failure modes
- shared provider resolution layer is defined before more model calls are added

## Technical Priorities

These should guide all implementation decisions in this phase.

### 1. Prefer shared abstractions over local patches

If the same rule, validator, or provider logic appears in multiple files, extract it.

### 2. Keep business logic out of page files

Pages should orchestrate composition and data loading, not become the main home for workflow logic.

### 3. Keep scoring conservative

The current deterministic report engine is intentionally conservative.

Do not replace it with opaque model scoring until the evidence contract and recovery story are stronger.

### 4. Use LiveKit for media mechanics

Do not rebuild meeting primitives that LiveKit already solves.

### 5. Use Inngest as a workflow engine, not just a background callback

Treat processing as:

- event-driven
- idempotent
- step-based
- recoverable

### 6. Keep Convex as the source of product truth

Provider state should be normalized into product state, not replace it.

## Recommended Implementation Order

1. Validate the real live path end-to-end.
2. Fix any runtime gaps in transcript, webhook, recording, and processing behavior.
3. Move screening policy into template-driven configuration.
4. Harden recruiter chat grounding and traceability.
5. Add security controls and formal BYOK boundaries.
6. Only then expand into richer model-backed evaluation, weak-student mode, or more premium experience layers.

## Explicit Non-Goals For This Phase

Do not prioritize these before the four workstreams above are solid:

- weak-student multi-agent simulation
- avatar-first visual polish
- facial-expression scoring
- more dashboard aesthetics without deeper operational value
- broad provider sprawl without secret-management architecture

## Routes And Surfaces In Scope

### Candidate

- `/interviews/[inviteId]`

### Recruiter

- `/admin`
- `/admin/candidates`
- `/admin/candidates/[sessionId]`
- `/admin/screenings`
- `/admin/screenings/new`
- `/admin/screenings/[batchId]`

### API

- `/api/interviews/bootstrap`
- `/api/interviews/process`
- `/api/livekit/token`
- `/api/livekit/webhook`
- `/api/inngest`
- `/api/recruiter/report-chat`

## Key Files To Know Before Editing

- `convex/interviews.ts`
- `convex/recruiter.ts`
- `convex/admin.ts`
- `convex/livekit.ts`
- `convex/schema.ts`
- `lib/assessment/report-engine.ts`
- `lib/assessment/process-session.ts`
- `lib/recruiter/report-chat.ts`
- `lib/livekit/token.ts`
- `lib/livekit/recording.ts`
- `components/interview/*`
- `components/recruiter/*`
- `components/admin/*`

## Dependencies And Sources

Use these first before re-researching:

- `.docs/current-findings.md`
- `.docs/livekit-convex-implementation-guide.md`
- `.docs/security-and-maintainability.md`
- `.docs/recruiter-review-prd.md`
- `.docs/v1-product-livekit-plan.md`

Key external sources:

- LiveKit agent dispatch: https://docs.livekit.io/agents/server/agent-dispatch/
- LiveKit agent events: https://docs.livekit.io/reference/agents/events/
- LiveKit React best practices: https://docs.livekit.io/reference/components/react/guide/
- LiveKit webhooks: https://docs.livekit.io/intro/basics/rooms-participants-tracks/webhooks-events/
- LiveKit egress: https://docs.livekit.io/transport/media/ingress-egress/egress/composite-recording/
- Inngest Next.js serving: https://www.inngest.com/docs/learn/serving-inngest-functions
- Inngest event docs: https://www.inngest.com/docs/events
- Inngest `createFunction`: https://www.inngest.com/docs/reference/typescript/functions/create
- Inngest AI orchestration: https://www.inngest.com/docs/features/inngest-functions/steps-workflows/step-ai-orchestration
- AgentKit overview: https://agentkit.inngest.com/

## Handoff Output

The next agent should leave behind:

- validated live flow findings
- any missing runtime fixes committed incrementally
- template-driven policy shape or implementation
- recruiter copilot hardening progress
- BYOK/security architecture notes or initial implementation
- updated `.docs/current-findings.md` and `.context/session.md`

The goal is not to add more disconnected features.

The goal is to make the current product trustworthy, operational, and ready for the next layer of sophistication.
