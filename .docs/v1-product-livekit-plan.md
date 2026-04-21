# V1 Product + LiveKit Plan

This document is the product-level bridge between the challenge requirements, the current repo, and the implementation path we should follow.

## Product Goal

Build a usable `AI Tutor Screener` from day one:

- real invite-gated candidate access
- real prejoin and meeting experience
- real interviewer agent
- real session persistence
- real post-call analysis
- recruiter-facing comparison and review

This is not a prototype call demo. It should be the product we iterate on.

## Why LiveKit Is The Right Foundation

`LiveKit` solves the part we should not be rebuilding:

- `PreJoin` for media checks and device selection
- `LiveKitRoom` for room connection lifecycle
- `VideoConference` / `AudioConference` for the call surface
- `RoomAudioRenderer` for remote audio
- agent dispatch into rooms through token room config
- realtime reliability, reconnect behavior, and WebRTC transport
- official agent framework for voice/video agents
- egress and recording support for session replay
- webhooks/events for room lifecycle visibility

That means our code can stay focused on the parts that differentiate the product:

- invite gating
- session orchestration
- transcript and evidence
- scoring and ranking
- recruiter review

## What Antonio's Flow Validates

The key lesson from the similar system is not the specific SDK. It is the shape of the product:

1. create or schedule a meeting
2. enter a proper lobby / prejoin
3. join a real room
4. agent joins and interacts live
5. session moves to `processing`
6. transcript, summary, replay, and downstream analysis appear after the call

We should follow the same flow while replacing the transport layer with `LiveKit`.

## Working Version One

### Candidate Flow

1. Candidate opens invite link.
2. Candidate sees a clear screening landing page:
   - who this is for
   - what the session covers
   - expected duration
   - privacy notice
3. Candidate enters `LiveKit PreJoin`.
4. Candidate joins the real meeting.
5. Interviewer agent joins and runs the screening.
6. Candidate leaves and sees a `processing` / `submitted` state.

### Recruiter / Admin Flow

1. Recruiter creates or selects an assessment template.
2. Recruiter creates an invite batch or individual invite.
3. Recruiter restricts eligibility to selected candidates.
4. Recruiter tracks session statuses.
5. Recruiter reviews reports, transcript evidence, and rankings.

## Candidate Gating

We should not let arbitrary users spam the product.

### V1 Recommendation

Use invite-based gating only:

- each candidate gets a unique invite token
- invite is linked to a candidate name and optionally email
- invite can expire
- invite can be one-time or limited-attempt
- candidate can only join if the invite is valid and eligible

### Better Structure

Add these concepts soon:

- `candidatePools` or `screeningBatches`
- `candidateEligibility`
- `attemptCount`
- `allowedAttempts`
- `revokedAt`
- `openedAt`
- `submittedAt`

This lets the creator upload or input the list of eligible candidates and prevents open access abuse.

## Outputs We Should Add

### Core Assessment Output

- overall recommendation
- confidence
- scored rubric dimensions
- evidence snippets
- red flags
- follow-up areas

### Important Tutor Dimensions

- clarity
- empathy
- patience
- warmth
- simplification ability
- listening
- fluency
- engagement
- interest / enthusiasm
- adaptability

### Additional Views

- transcript
- session timeline
- replay / recording
- recruiter notes
- report status

## Leaderboard / Comparison View

This is a strong differentiator if handled carefully.

### V1 Approach

Show a recruiter-only ranked candidate list:

- candidate name
- invite status
- session status
- overall recommendation
- confidence
- average score
- top strengths
- top concerns

### Important Rule

Do not pretend ranking is perfectly objective.

The leaderboard should always show:

- confidence
- manual-review markers
- evidence access
- override capability

## Recording + Transcript Strategy

### Recording

Use `LiveKit Egress` later for:

- room replay
- candidate track recording
- recruiter review playback

This is useful, but not the first blocker for the MVP meeting path.

### Transcript

Do not generate transcript from fake room events.

Transcript should come from:

- agent/runtime transcription
- or a downstream processing step

Partial transcript is fine for UX, but final scoring should only use stable transcript artifacts.

## ElevenLabs

`ElevenLabs` is optional, not foundational.

Use it only if one of these becomes true:

- LiveKit-supported TTS options are clearly not good enough
- voice naturalness becomes a product blocker
- we want more expressive tutoring voice styles later

For v1, do not add unnecessary provider complexity unless quality testing forces it.

## Dev Logging And Broken-Path Tracing

We need strong dev-mode traceability now.

### Required Coverage

- invite opened
- bootstrap request start / success / failure
- token issuance
- room connect start / success / failure
- reconnect start / success / failure
- participant join / leave
- agent worker start
- agent session start
- first utterance sent
- processing start
- report generation start / success / failure

### Rule

Persist canonical session events in Convex.
Keep high-volume diagnostics as structured dev logs.

## Better Project Structure

### App Should Own

- page shells
- invite landing
- transcript rail
- timeline rail
- recruiter dashboard

### LiveKit Should Own

- prejoin
- meeting transport
- conference layout
- participant media controls

### Convex Should Own

- templates
- invites
- sessions
- transcript segments
- reports
- ranking/review state

## Suggested Multi-Agent Work Split

### Agent 1: Candidate Realtime Flow

- replace custom meeting shell with `PreJoin -> LiveKitRoom -> conference`
- keep transcript and timeline rails around it

### Agent 2: Backend Domain Split

- split Convex interview logic into invites / sessions / transcripts / reports
- add candidate gating and batch ownership

### Agent 3: Observability + Agent Runtime

- structured diagnostics
- session lifecycle logs
- agent runtime instrumentation
- processing pipeline tracing

## Highest-Leverage Next Slice

1. Replace the current custom interview screen with a LiveKit-native flow.
2. Keep app-owned rails for transcript and session metadata.
3. Make the interviewer agent join reliably.
4. Preserve session lifecycle in Convex.
5. Then move to analysis, ranking, leaderboard, and reporting.
