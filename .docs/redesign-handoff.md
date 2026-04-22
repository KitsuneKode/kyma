# Redesign Handoff

Read this when redesigning the product surface, page structure, and screen flow. This is a UI/UX handoff, not the full backend architecture guide.

## Product Goal

Kyma is an `AI Tutor Screener` for invite-only teacher screening:

- recruiter creates a screening
- selected candidate gets an invite link
- candidate joins a realtime interview with an AI interviewer
- session artifacts are captured
- recruiter reviews transcript, replay, evidence, scores, and recommendation

The product should feel:

- warm
- professional
- trustworthy
- structured
- premium
- calm under stress

It should not feel like:

- a hackathon demo
- a chatbot pasted into a call UI
- a generic dashboard
- a robotic exam

## Non-Negotiables

The redesign can change layout and presentation aggressively, but it should preserve these product truths:

- `LiveKit` owns prejoin, media connection, room, and core call mechanics
- `Convex` owns invite/session/transcript/report truth
- invite access states must stay explicit
- reconnect/interruption states must stay visible
- every important result must be evidence-backed and human-reviewable
- the core UX priority is the live interview flow, not dashboard decoration

## Current Routes

Route architecture now uses App Router groups:

- `(marketing)` for `/`
- `(auth)` for `/sign-in` and `/sign-up`
- `(app)` for authenticated operator pages (`/admin*`, `/video-demo`, `/write-up`)

### `/`

Purpose:

- marketing/product entry page built from reusable `components/marketing/*` sections
- primary entry to candidate flow and authenticated operator shell

Current state:

- section-composed marketing home (`hero` + social proof) with reusable primitives
- intentionally structured for iterative redesign via section-level updates

Design direction:

- should become either:
  - a clean internal operator home, or
  - a proper marketing/product entry page
- should immediately explain:
  - what the product does
  - why it is better
  - where recruiter and candidate flows begin

### `/sign-in` and `/sign-up`

Purpose:

- dedicated authentication surface under `(auth)` group
- decouples auth UX from both marketing and operator shells

Current behavior:

- Clerk-backed catch-all pages (`[[...sign-in]]` and `[[...sign-up]]`)
- signed-in users are redirected to `/admin`

### `/admin`

Purpose:

- recruiter hub and entry to screening + review flows

Current state:

- **Implemented:** Clerk-gated shell when Clerk env is configured; links to candidates and screenings.
- Child routes ship real flows: `/admin/candidates` (queue), `/admin/candidates/[sessionId]` (detail, transcript, report, notes, copilot chat), `/admin/screenings` (batches), `/admin/screenings/new` (batch creation), `/admin/screenings/[batchId]` (invites per batch).

Design direction:

- evolve toward a calmer recruiter command center (density, wayfinding, review speed)
- keep LiveKit meeting UX on `/interviews/*`; admin stays artifact- and decision-focused

### `/interviews/[inviteId]`

Purpose:

- core candidate interview route
- this is the most important route in the product right now

Current behavior:

- loads a public snapshot from Convex when available
- resolves access state
- mounts the candidate interview workspace

Current screen states inside this route:

1. `unavailable`

- invalid or revoked invite

2. `expired`

- link expired

3. `consumed`

- already used for a submitted interview

4. `prejoin`

- candidate enters name
- selects mic/camera
- previews media via LiveKit `PreJoin`

5. `meeting`

- candidate joins actual LiveKit room
- meeting shell shows policy/status and side rails

6. `processing`

- shown after submit while downstream report generation is pending

This route should become the best-designed part of the product first.

## Current API Routes

### `/api/interviews/bootstrap`

Purpose:

- candidate bootstraps or resumes a session
- creates or reuses Convex session
- enforces invite restrictions
- returns room/session metadata

Design implication:

- errors from this route should map to polished candidate-facing states

### `/api/livekit/token`

Purpose:

- creates LiveKit access token
- includes optional agent dispatch config

Design implication:

- failures should surface as trustworthy “we couldn’t connect” feedback, not generic crashes

## Current Screen Composition

The candidate route is currently composed with these key pieces:

- `InterviewWorkspace`
  - overall state orchestration
  - chooses prejoin vs meeting vs processing vs access screen

- `InviteAccessScreen`
  - unavailable / expired / consumed messaging

- `InviteLobby`
  - wraps LiveKit `PreJoin`
  - candidate identity + device selection + preview
  - shows basic policy cards

- `MeetingShell`
  - wraps `LiveKitRoom`
  - contains the active interview meeting surface
  - exposes submit button and policy copy

- `SessionOverview`
  - metadata/status rail

- `SessionTimeline`
  - session event rail

- `TranscriptRail`
  - live/persisted transcript rail

## What Is Real Today

These are not fake anymore:

- real LiveKit prejoin
- real LiveKit room join
- real invite access screens
- real single-use guardrail after submission
- real warm welcome from the agent
- real live transcript persistence from room transcription events

## What Is Still Weak

- homepage is not product-quality
- admin is not product-quality
- meeting shell is still functional rather than premium
- recruiter detail/review flow does not exist yet
- processing state is thin
- transcript/evidence/report relationship is not yet fully visualized
- there is no screening creation UX yet
- there is no candidate eligibility management UX yet

## Redesign Priorities

If another model is redesigning, this is the best order:

1. candidate interview route
2. recruiter review detail page
3. recruiter list/table workspace
4. screening creation flow
5. homepage

Do not start with charts, illustration, or branding flair before the core route feels excellent.

## Candidate UX Goals

The candidate should feel:

- welcomed
- informed
- calm
- respected
- guided

The flow should communicate:

- what this interview is
- how long it will roughly take
- whether camera and mic are on
- what happens after submission
- whether they can resume or not
- whether the link is single-use and expires

Important:

- do not make the candidate feel like they were dropped into an AI trap
- the agent should feel like a professional interviewer, not a voice bot

## Recruiter UX Goals

The recruiter side should eventually optimize for:

- triage speed
- trust
- explainability
- evidence review
- confident advance/reject/manual-review decisions

The recruiter should be able to answer:

- who completed the screening
- who looks strongest
- who needs manual review
- why the recommendation was made
- what was actually said
- what happened in the live session

## Planned Recruiter Surfaces

These do not fully exist yet, but should shape the redesign system now:

### Recruiter Home / Queue

Should show:

- screenings
- active invites
- candidate statuses
- review queue
- leaderboard / sortable table

Use:

- `shadcn/ui` `data-table`

### Candidate Review Detail

Should show:

- candidate info
- recommendation
- confidence
- score breakdown
- evidence cards
- transcript
- replay / recording
- AI chat grounded in transcript/report
- recruiter notes
- advance / reject / manual review actions

Use:

- `shadcn/ui` cards
- `shadcn/ui` chart
- `shadcn/ui` data display primitives

### Screening Creation

Should eventually let recruiter define:

- screening name
- role
- interview policy
- allowed duration
- expiry rules
- eligible candidates / invite list
- optional context docs
- prompt/system configuration
- future BYOK model settings

## Future Scope To Design For

These do not need to be built first, but the system should not block them:

- recruiter leaderboard
- recording/replay review
- AI chat over transcript/report
- candidate eligibility / allowlist
- template-specific interview policy
- BYOK
- weak-student teaching simulation
- multi-agent review
- workspace-level branding/theming
- embeddable screening product for third-party hiring teams

## What Should Stay Modular

The redesign should not collapse everything into one giant page component.

Keep clean boundaries between:

- marketing/home
- auth pages
- recruiter workspace
- candidate interview flow
- session review detail
- creation/setup flows

And between:

- meeting surface
- side rails
- access/error states
- processing/success states

## Suggested Future Route Shape

This is a recommended product IA, not fully implemented today:

- `/`
  - home / product entry

- `/admin`
  - recruiter home

- `/admin/screenings`
  - screening list

- `/admin/screenings/[screeningId]`
  - screening detail, candidates, invites, status

- `/admin/screenings/[screeningId]/create`
  - screening creation/edit flow

- `/admin/candidates`
  - all candidates / leaderboard

- `/admin/candidates/[candidateId]`
  - recruiter review detail

- `/interviews/[inviteId]`
  - candidate public interview flow

## Design Constraints

Use:

- existing `shadcn/ui` components
- LiveKit components for room/prejoin/controls
- our product chrome around those

Avoid:

- rebuilding call mechanics
- overly clever animation systems before the flow is trustworthy
- dark-mode-only assumptions unless the design intentionally sets that direction
- generic SaaS dashboard visuals

## Best Immediate Design Opportunity

The strongest near-term redesign target is the candidate route:

- full-height layout
- stronger prejoin framing
- clearer interview context
- warmer welcome
- more intentional meeting composition
- calmer rails
- better processing/submission state

That one route will do more for perceived product quality than polishing everything else lightly.
