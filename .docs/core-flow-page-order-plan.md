# Core Flow Page Order Plan

## Objective

Define the best page order and composition for Kyma so the product feels premium, clear, and conversion-oriented across candidate and recruiter journeys.

## Product Flow Order (Primary)

1. Landing
2. Candidate prejoin
3. Candidate live interview
4. Candidate post-call processing
5. Recruiter queue
6. Recruiter candidate detail
7. Screening management (list -> create -> batch detail)

This sequence keeps the narrative aligned with user intent: understand product -> run interview -> review candidate -> operate at scale.

## Landing Page Composition (in order)

1. **Hero (dual-track)**
   - Left: value proposition + trust framing.
   - Right: trial/mockup video panel (primary proof).
   - CTA group: `Try Candidate Flow` and `Open Recruiter Workspace`.
2. **Proof strip**
   - 3-4 concise trust metrics (durability, transcript reliability, review readiness).
3. **How it works**
   - Three-step flow: Prejoin -> Live -> Review.
4. **Role pathways**
   - Candidate pathway card and Recruiter pathway card, each with clear outcome.
5. **System credibility section**
   - Reliability architecture summary (reconnect safety, persistence model, evidence trail).
6. **Final CTA block**
   - Repeat dual-track CTA with tighter copy.

## Candidate Flow Composition

### 1) Prejoin

- Primary job: confidence + readiness check.
- Structure:
  - Header (what this session is, duration policy).
  - Readiness checklist (audio/video/network).
  - Single primary action: `Join Interview`.
  - Optional details in collapsible section.

### 2) Live interview

- Primary job: remove cognitive load while interviewing.
- Structure:
  - Main live stage first.
  - Short, contextual helper notes (not long paragraphs).
  - One clear primary action: `Submit Interview`.
  - Secondary session telemetry in side rail (timeline, transcript preview).

### 3) Post-call processing

- Primary job: reassure and set expectation.
- Structure:
  - Completion confirmation.
  - Processing state with skeletons and staged readiness markers.
  - Optional next step guidance.

## Recruiter Flow Composition

### 1) Queue

- Primary job: triage quickly.
- Structure:
  - Top summary metrics.
  - Filter/sort controls.
  - Scannable table/list with strong status signals.
  - Row action: `Open Review`.

### 2) Candidate detail

- Primary job: make decision confidently.
- Structure:
  - Decision summary block first (recommendation/confidence/state).
  - Evidence and transcript sections.
  - Review action panel always visible.
  - Timeline and artifacts in side rail.

## Screening Ops Composition

1. Screenings list: operational overview and progress.
2. Create screening form: grouped fields, inline validation, candidate preview.
3. Batch detail: candidate eligibility, attempts, invite links, status.

## UX Quality Rules (Applied Across Pages)

- Keep premium editorial ops tone (calm and high trust).
- Low-motion, high-precision micro interactions only.
- Use shadcn-first primitives; external patterns only after token adaptation.
- One primary action per screen section.
- Strong hierarchy before density.
- Design all loading/empty/error states with explicit UI treatment.

## Implementation Phasing

1. Landing + candidate prejoin/live shell hierarchy
2. Candidate post-call and skeleton behaviors
3. Recruiter queue scanability and decision flow
4. Recruiter detail IA and side rail stabilization
5. Screening forms and operational polish

## Notes

- This document is intentionally flow-first and should feed directly into the main PRD and implementation backlog.
- Future plans should be stored under `.docs/` for reference continuity.
