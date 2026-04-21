# MVP Plan

## Product Mindset

- build the first credible working version, not a fake AI demo
- do not reinvent the meeting layer
- let `LiveKit` own prejoin, room connection, media controls, and conference UX
- let our app own invite flow, session state, transcript persistence, assessment generation, and recruiter review
- keep the first version minimal, predictable, and easy to debug
- preserve DRY boundaries by extracting shared session, transcript, and provider logic instead of duplicating it in pages

## V1 Goal

The first version succeeds when:

1. an admin can create or use a teacher-screening template
2. an admin can generate a candidate invite
3. a candidate can open the invite and join a real LiveKit meeting through a proper prejoin flow
4. the interviewer agent joins the same room
5. the session survives normal reconnects without losing identity or transcript history
6. the session completes and moves into processing
7. a structured assessment report is generated with evidence

## What LiveKit Owns

- `PreJoin` flow
- room connection lifecycle
- device selection
- mic and camera controls
- meeting layout and participant presence
- audio rendering
- agent dispatch into the room

## What Our App Owns

- invite links and access rules
- session bootstrap route
- Convex source-of-truth records
- transcript persistence and later search
- assessment and ranking output
- recruiter dashboard and review workflow
- recommendation policy and hard-gate rules

## Core Entities

- `assessmentTemplates`
- `candidateInvites`
- `candidateEligibility`
- `interviewSessions`
- `sessionEvents`
- `transcriptSegments`
- `dimensionEvidence`
- `assessmentReports`
- `reviewNotes`

## Phase 0: Correct Foundations

- lock `LiveKit` as the meeting UI and connection layer
- clean up the current `demo-invite` route to wrap LiveKit rather than replacing it
- keep auth optional for public candidate flow and clean for admin flow
- define session states and report contract clearly

## Phase 1: Realtime Interview Core

- build the `demo-invite` flow as:
  - invite landing
  - LiveKit `PreJoin`
  - bootstrap request
  - `LiveKitRoom`
  - conference view
- keep UI mostly stock `shadcn/ui` plus LiveKit prefabs
- place custom app UI around the room, not inside the transport logic
- persist session creation, join, leave, reconnect, and completion events in Convex
- get one candidate and one agent talking reliably in the same room

## Phase 2: Post-Call Assessment Pipeline

- finalize transcript and session artifacts after the call ends
- run report generation through `Inngest`
- extract evidence before scoring
- generate structured rubric output with evidence
- apply hard-gate recommendation rules
- add confidence and manual-review flags

## Phase 3: Recruiter Review

- sessions list
- session detail page
- rubric charts with shadcn charts
- transcript and evidence viewer
- notes and review state

## Phase 4: Differentiation

- add weak-student simulation mode
- score teaching adaptability and simplification separately
- surface this as a differentiated section in the report
- consider separate student-agent orchestration only after single-agent reliability is proven

## Version One Screen Map

### Candidate Flow

1. invite landing page
2. prejoin page using `LiveKit PreJoin`
3. live interview page using `LiveKitRoom` and `VideoConference`
4. completion / processing page

### Admin Flow

1. template list
2. invite creation
3. sessions list
4. session detail with transcript and report

## UI Rules For V1

- use existing `shadcn/ui` components and blocks wherever possible
- use LiveKit prefabs before building custom meeting widgets
- keep layout clean and readable, not decorative
- improve surfaces, spacing, typography, and hit areas, but avoid polish detours until the flow is real
- add transcript and session metadata as side rails around the meeting view rather than replacing the meeting view

## Build Order

1. replace custom meeting shell with `PreJoin -> LiveKitRoom -> conference`
2. keep Convex bootstrap and room token creation stable
3. make the agent join reliably
4. persist session events and transcript updates
5. end the call into `processing`
6. generate and store the report
7. build recruiter review screens

## Immediate Now

This is the work to do before any more ranking or dashboard depth:

1. refactor `/interviews/[inviteId]` around LiveKit prefabs
2. keep only thin app-owned wrappers around the LiveKit experience
3. verify one real meeting path with agent join
4. ensure reconnect and leave states persist correctly
5. lock the rubric schema, evidence contract, and recommendation policy
6. only after that, move to reports, ranking, and recruiter review
