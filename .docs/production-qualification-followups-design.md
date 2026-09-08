# Production Qualification Follow-ups

## Status

Approved for implementation on 2026-09-02.

## Goal

Close the remaining correctness, capacity, CI, and UI qualification gaps without
mixing real-provider evidence with deterministic code verification.

## Delivery Shape

### PR 1: Production correctness and CI parity

Branch: `fix/production-qualification-followups`

- make recruiter queries deterministic by accepting and validating caller time
- move action-only recruiter authorization behind an internal Convex query
- replace the globally truncated batch refresh dispatcher with bounded cursor
  traversal so old active batches cannot starve
- test the Inngest failure transition, not only its timeout metadata
- make the local Convex integration harness portable and self-cleaning
- bring local and CI qualification coverage into explicit parity
- update operational and architecture documentation to match current routes

The dispatcher will use bounded cursor pages and schedule a continuation. This
preserves transaction limits and correctness without introducing an index rename
that would require a staged production migration.

### PR 2: UI and accessibility polish

Branch: `fix/ui-accessibility-polish`

- fix confirmed keyboard and accessible-name failures
- replace confirmed layout-property animation and continuous decorative motion
- correct undersized form controls and critical data labels
- validate candidate lobby, interview controls, recruiter dashboard, charts, and
  transcript review at representative desktop and mobile sizes
- add focused Playwright coverage for behavior that can regress

This PR may be based on PR 1 while it is under review, but its UI changes must be
independently reviewable and revertible.

### Track 3: Real-provider qualification

Tracked in GitHub issue #31. This requires owner-visible evidence for Clerk,
LiveKit, the agent worker, STT/LLM/TTS providers, recording storage, Inngest,
Dodo Payments, alerting, backup/restore, and representative load. Synthetic data
or configuration presence does not count as provider proof.

## Verification Model

Deterministic gates:

- formatting and conflict-marker checks
- lint and typecheck
- Vitest suite
- Knip dependency analysis
- Convex code generation and generated-file cleanliness
- real local Convex integration harness
- Next production build
- Playwright E2E

External gates:

- a real voice interview from invite through released recruiter report
- agent join, reconnect, transcript, recording, Inngest, and fallback evidence
- billing and webhook delivery evidence
- monitoring, incident, backup/restore, and load evidence

## Non-goals

- speculative JSON-LD changes without a reproducible warning and source
- rebasing obsolete local feature branches whose changes are already merged
- claiming production readiness from seeded UI or mocked providers
- bundling a risky Convex index rename into the correctness repair
