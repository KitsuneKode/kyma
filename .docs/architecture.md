# Architecture

## Product Goal

Build a premium AI interviewer for screening tutor candidates on soft skills:

- communication clarity
- patience
- warmth
- ability to simplify
- English fluency
- spontaneous teaching ability

The system should feel welcoming to candidates while producing an evaluation a hiring team can trust.

## Primary User Roles

### Candidate

- opens interview link
- passes device and network checks
- completes voice interview
- optionally completes a teaching simulation
- sees a graceful completion state

### Recruiter or Admin

- creates screening templates
- generates candidate interview links
- monitors live and completed sessions
- reviews transcript, rubric, and recommendation
- exports or shares assessment summaries

## MVP Scope

The MVP should prove the interview loop end-to-end, not every future feature.

### Must Have

- admin authentication
- assessment template creation
- candidate link generation
- candidate preflight for mic, speaker, permissions, and environment
- realtime voice interview
- adaptive follow-up questions
- full transcript storage
- post-call structured rubric with evidence
- admin review dashboard

### Should Have

- interview timer and progress states
- candidate retry for misunderstood answers
- confidence flags for low-quality transcripts or weak evidence
- charts for rubric dimensions

### Later

- live video
- multi-language support
- practice mode
- recruiter co-pilot
- teacher-to-weak-student simulation as a richer multi-agent scene

## Strong Recommendation

Use `LiveKit + Convex + Clerk + shadcn/ui + AI SDK + Inngest`.

### Why

- `LiveKit` is the best fit for realtime voice interview infrastructure and agent lifecycle.
- `Convex` gives us reactive app state, transcript/report persistence, and a clean admin dashboard data model.
- `AI SDK` is great for structured generation, tools, and report synthesis, but it should not be treated as the primary realtime media layer.
- `Inngest` is ideal for durable post-interview processing and retries.

## System Boundaries

## Application Shell Architecture

Next.js App Router is organized with route groups to keep UI responsibilities isolated:

- `(marketing)` for public-facing product surfaces and conversion pages.
- `(auth)` for Clerk sign-in and sign-up pages with a focused auth layout.
- `(app)` for authenticated operator surfaces like admin and internal tools.

Root `app/layout.tsx` owns only shared infra concerns (fonts, providers, Clerk bootstrapping), while shell-specific chrome lives in each route group layout. This prevents provider-level UI coupling and keeps redesign work localized.

### Frontend

Next.js handles:

- landing and onboarding flows
- candidate preflight
- interview room UI
- live transcript and state feedback
- admin dashboard and report views

### Auth

`Clerk` protects the admin side.

Candidate interview links should be tokenized and public-facing so candidates do not need to create accounts for MVP.

### Realtime Interview Layer

`LiveKit` handles:

- room creation
- WebRTC media transport
- agent participation in the room
- interruptions and turn-taking
- optional telephony path later

### Application Backend

`Convex` handles:

- assessment templates
- candidate invites
- session records
- transcript segments
- rubric results
- recruiter notes
- live dashboard reads

### Agent and Generation Layer

`AI SDK` powers:

- structured question generation
- follow-up generation
- rubric JSON generation
- evidence extraction
- summary generation

The realtime speaking agent can live inside a LiveKit agent service while still using AI SDK-compatible model providers for non-realtime generation paths.

### Workflow Layer

`Inngest` handles:

- post-session report generation
- transcript cleanup
- evidence clipping
- retryable scoring jobs
- notifications and webhooks

## Realtime Design

## Recommendation

Ship audio-first for MVP.

### Why

- the problem statement requires voice, not video
- audio-first is faster to stabilize
- lower bandwidth means fewer candidate failures
- the evaluation value comes mostly from speech content, pacing, warmth, and simplification

## Suggested Interview Flow

1. Candidate joins from a single-use link.
2. Preflight checks mic permissions, playback, and noise guidance.
3. AI interviewer sets expectations and asks consent for recording/transcription.
4. Warm-up question reduces anxiety and calibrates audio.
5. Core behavioral and teaching questions adapt based on answers.
6. Teaching simulation asks the candidate to explain a topic to a weak student persona.
7. Interview closes politely and explains next steps.
8. Background jobs generate rubric, summary, and review artifacts.

## Teaching Simulation Design

This is the standout feature, but it should be scoped carefully.

### MVP-Lite Version

The same interviewer switches into `student mode`:

- acts confused
- asks naive follow-up questions
- tests whether the candidate can simplify

This avoids the complexity of true multi-agent orchestration while preserving the product value.

### Phase 2 Version

A separate `student agent` joins the session or receives a handoff:

- interviewer frames the task
- student agent plays a weak learner persona
- evaluator scores the teaching interaction separately

## Rubric Design

Every assessment result should include:

- `overallRecommendation`
- `hireSignal`
- `confidence`
- dimension scores from `1-5`
- evidence snippets
- concerns and red flags
- improvement notes

### Core Dimensions

- clarity
- warmth
- patience
- simplification
- listening
- fluency
- adaptability
- accuracy
- student engagement

## Fairness and Trust

We should not ship a black-box pass/fail tool.

The MVP must include:

- recording/transcription disclosure
- evidence-backed scoring
- human-review positioning
- flags when transcript quality is weak
- a way to mark sessions as needing manual review

## What To Avoid

- browser Web Speech as the main architecture
- video-heavy scope in week one
- one giant prompt that does interviewing and final scoring without structure
- opaque scoring with no quotes or rationale
- building custom media infra from scratch
