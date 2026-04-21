# Recruiter Review PRD

Read this when working on recruiter workflows, candidate detail pages, report UX, leaderboard design, or recruiter AI chat.

## Status

Proposed and ready to implement.

## Product Thesis

Kyma should help companies like Cuemath hire more high-quality tutors with less recruiter time, more consistent screening, and better auditability.

This is not a generic interview bot.

It is a tutor-screening system optimized for:

- communication clarity
- patience and warmth
- simplification ability
- student-safe judgment
- recruiter trust in the recommendation

## Why This Matters

Public Cuemath materials emphasize:

- rigorous tutor selection and training
- communication skills
- ability to engage children
- personalized 1:1 teaching
- patience and adaptability

Public pages from similar companies point in the same direction:

- Cuemath markets top tutors, patience, adaptability, and clear explanations
- Mathnasium emphasizes trained instructors and structured, face-to-face teaching
- Third Space Learning emphasizes real-time discussion, personalization, and teacher-built tutoring systems
- Outschool emphasizes professional communication, learner experience, and quality educator review

This means the hiring bottleneck is not only subject knowledge. It is reliably judging whether a candidate can teach children clearly, calmly, and effectively in live conversation.

## Users

### Primary User

Recruiter or operations reviewer who needs to move candidates forward quickly without lowering quality.

### Secondary Users

- hiring manager reviewing borderline cases
- training or QA lead calibrating tutor quality
- candidate completing the screening

## Jobs To Be Done

### Recruiter

- quickly see which candidates are promising
- inspect why the system recommended a candidate
- verify evidence without replaying everything
- ask follow-up questions about the interview
- override weak or uncertain recommendations

### Candidate

- complete a professional, fair, low-friction screening
- understand what happens next

### Hiring Team

- standardize tutor screening
- reduce interviewer load
- improve consistency across reviewers

## Success Metrics

### Product

- time from invite to recruiter decision
- recruiter time spent per candidate
- completion rate
- agent-interview success rate
- percentage of candidates requiring manual review

### Evaluation Quality

- recruiter agreement with recommendation
- override rate
- evidence coverage rate
- low-confidence rate
- transcript-quality issue rate

### Operational

- room join success rate
- reconnect recovery rate
- transcript pipeline success rate
- report generation latency

## V1 Goal

Ship a usable screening product with:

1. gated candidate invites
2. real live screening session
3. durable transcript and session artifacts
4. structured report with evidence
5. recruiter review page with transcript, replay, and AI chat
6. recruiter triage table and basic leaderboard

## Non-Goals For V1

- fully autonomous final hiring decisions
- multi-agent live orchestration as the default path
- advanced behavioral science scoring beyond observable interview evidence
- replacing human review for low-confidence cases

## Product Requirements

## 1. Candidate Intake And Access

### Must Have

- recruiter can create invite links
- invite is tied to an eligible candidate record
- invite can expire
- invite can have limited attempts
- public users cannot freely spam the product

### Recommended Data Model

- `candidatePools`
- `candidateEligibility`
- `candidateInvites`
- `allowedAttempts`
- `attemptCount`
- `revokedAt`

## 2. Candidate Screening Flow

### Must Have

- landing page with expectations and privacy messaging
- LiveKit `PreJoin`
- live interview room
- interviewer agent joins the same room
- candidate can complete the session
- session moves to `processing`

### Quality Bar

- warm and professional tone
- clear next-step messaging
- minimal permission friction
- no fake simulation behavior

## 3. Interview Structure

Version one should be standardized enough for comparison and flexible enough to feel human.

### Stage 1: Warm-Up

- greeting
- rapport
- short orientation

### Stage 2: Core Screening

- explain-a-concept task
- student confusion scenario
- patience / empathy scenario
- communication under ambiguity

### Stage 3: Guided Teaching Simulation

- interviewer asks the candidate to teach a child-friendly concept
- interviewer can play confusion or misunderstanding without requiring a separate live student agent

### Stage 4: Closing

- candidate thanked
- no score exposed
- processing state shown

## 4. Evaluation Framework

Recommendation should use a two-layer model.

### Layer 1: Hard Gates

These should drive a `no` even if some soft dimensions are decent:

- repeated inability to explain simply after follow-up
- clearly unsafe or misleading teaching guidance without recovery
- dismissive, impatient, or poor student handling
- communication too unclear for the teaching role

### Layer 2: Weighted Rubric

Use weighted scoring for candidates who clear the hard gates.

### Core Dimensions

- clarity
- simplification
- patience
- warmth
- listening
- fluency
- adaptability
- engagement
- accuracy

### Recommendation Levels

- `strong_yes`
- `yes`
- `mixed`
- `no`

## 5. Evidence Rules

The product should never produce a strong claim without evidence.

### Every Report Must Include

- overall recommendation
- confidence
- dimension scores
- rationale per dimension
- evidence snippets
- red flags
- follow-up areas
- transcript quality note when needed

### Evidence Standard

- each non-neutral claim should have at least one concrete transcript-backed snippet
- evidence should include timestamp or transcript position when possible
- missing evidence should reduce confidence

## 6. Recruiter Triage View

This should be table-first.

### Main View

Use `shadcn/ui` data-table patterns.

### Required Columns

- candidate
- invite status
- session status
- recommendation
- confidence
- weighted average score
- hard-gate flag
- top strengths
- top concerns
- manual-review required
- updated at

### Required Table Behavior

- sorting
- filtering
- row-level actions
- search
- status filters
- recommendation filters

## 7. Recruiter Candidate Detail View

This is the most important review screen in the product.

When the recruiter clicks a candidate, they should get one coherent decision workspace.

### Header

- candidate name
- recommendation
- confidence
- session status
- hard-gate status
- duration
- template used

### Summary Section

- concise AI-generated summary
- strongest reasons to advance
- strongest reasons for concern

### Rubric Section

Use `shadcn/ui` chart with `Recharts` underneath.

Recommended visuals:

- primary: bar chart for dimension scores
- optional secondary: radar chart for a quick profile view

### Evidence Section

- evidence cards grouped by dimension
- strength evidence
- concern evidence
- transcript-linked moments

### Transcript Section

- full transcript
- speaker-separated
- timestamped
- searchable

### Recording Section

- video replay
- jump to evidence moments
- synchronized transcript highlight later

### AI Chat Section

The recruiter should be able to ask questions such as:

- why did the system mark this as mixed?
- show evidence for patience concerns
- did the candidate adapt after confusion?
- summarize the teaching simulation only

### AI Chat Requirements

- grounded only in transcript, report, and session artifacts
- cites supporting evidence
- must not invent candidate facts
- should answer with uncertainty when evidence is weak

### Recruiter Actions

- advance
- reject
- send to manual review
- add note
- override recommendation

## 8. Charts And Analytics

Charts should summarize. Tables should drive action.

### V1 Charts

- per-candidate dimension bar chart
- recommendation distribution
- session completion funnel
- manual-review rate
- override rate

### Later Charts

- transcript quality trend
- dimension drift over time
- interviewer template performance

## 9. Recording, Transcript, And AI Chat Pipeline

### Recording

Use LiveKit egress for replay artifacts after the meeting path is stable.

### Transcript

Transcript should come from:

- agent/runtime transcription
- or post-call processing

Not fake UI-generated events.

### AI Chat

AI chat should be retrieval-grounded over:

- transcript
- assessment report
- evidence records
- recruiter notes

### Recommended Pipeline

1. session completes
2. recording and transcript artifacts finalize
3. evidence extraction runs
4. report generation runs
5. recruiter chat index is created

## 10. Voice Agent Quality

The interviewer should feel realistic, not theatrical.

### V1 Requirements

- warm, concise voice
- controlled pacing
- interruptions handled gracefully
- follow-up on vague answers
- no over-talking

### Better Realism Later

- tighter interruption handling
- adaptive pacing based on candidate response length
- improved tutor persona calibration
- better child-scenario acting in the guided teaching simulation

### Better Voice Options

Start with the most reliable supported LiveKit path.

Only add extra TTS providers if:

- latency stays acceptable
- voice quality is materially better
- integration complexity does not hurt reliability

## 11. Differentiators That Can Help This Stand Out

### Strong V1 Differentiators

- evidence-backed tutor suitability report
- recruiter AI chat grounded in transcript and replay
- candidate comparison leaderboard with confidence and manual-review markers
- invite gating and candidate-eligibility control
- one coherent review workspace instead of scattered artifacts

### Strong V2 Differentiators

- weak-student mode
- replay linked to rubric evidence
- recruiter calibration tools
- template-specific scoring policies
- cohort benchmarking

## 12. Best Approach Given Limited Time

We should optimize for the narrowest real product that proves the core value.

### Phase 1: Real Screening Loop

- invite gating
- LiveKit prejoin and room
- interviewer agent
- session persistence

### Phase 2: Real Evaluation

- transcript finalization
- evidence extraction
- recommendation policy
- assessment report

### Phase 3: Recruiter Review Workspace

- triage table
- candidate detail page
- charts
- evidence
- transcript
- recording
- recruiter actions

### Phase 4: AI Review Assistant

- grounded AI chat over transcript and report
- citations and evidence references

## 13. Architecture Guidance

### LiveKit Owns

- prejoin
- media transport
- room lifecycle
- meeting controls
- recording foundation

### Our App Owns

- invite and eligibility workflow
- session orchestration
- evaluation policy
- report contract
- recruiter review UX
- grounded AI chat

### Convex Owns

- source-of-truth entities
- report state
- evidence state
- recruiter notes
- table data and leaderboard data

### Inngest Owns

- post-call processing
- evidence extraction
- report generation
- chat indexing

## 14. Canonical Decision

The best approach is:

- build one excellent real screening path
- standardize the evaluation contract
- make recruiter review trustworthy and fast
- use charts and AI chat only after evidence is solid

The product stands out not by flashy AI, but by making hiring decisions faster without making them feel less trustworthy.

## Research Notes

- Cuemath tutor pages emphasize rigorous selection, communication skills, engagement with children, patience, adaptability, and personalized 1:1 teaching.
- Mathnasium emphasizes trained instructors and structured face-to-face online teaching rather than random marketplace tutors.
- Third Space Learning emphasizes real-time discussion, personalization, and teacher-built tutoring flows.
- Outschool emphasizes professional communication, educator review quality, and learner experience standards.
- Preply highlights tutor selection support, reviews, and tutor-quality signals that help learners choose, which parallels recruiter trust and triage in our product.

## Sources

- Cuemath tutors: https://www.cuemath.com/our-tutors/
- Cuemath tutoring: https://www.cuemath.com/en-us/home-tutors/
- Cuemath tutoring services: https://www.cuemath.com/en-us/tutoring-services/
- Mathnasium online tutoring: https://www.mathnasium.com/online-tutoring
- Third Space Learning: https://thirdspacelearning.com/
- Outschool educator requirements: https://support.outschool.com/en/articles/1638033-becoming-an-educator-on-outschool
- Outschool teacher application: https://support.outschool.com/en/articles/4216449-creating-a-great-teacher-application
- Preply how it works: https://preply.com/en/how-it-works
- shadcn chart: https://ui.shadcn.com/docs/components/radix/chart
- shadcn data table: https://ui.shadcn.com/docs/components/base/data-table
