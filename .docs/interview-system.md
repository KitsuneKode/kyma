# Interview System

## Experience Principles

- warm, professional, and calm
- clearly human-centered, not cold automation
- adaptive but structured
- evidence-backed evaluation

## Candidate Journey

1. Open invite link.
2. Read simple expectations and privacy notice.
3. Complete a real `LiveKit PreJoin` device and media check.
4. Enter the live interview room.
5. Answer warm-up, scenario, and teaching questions.
6. Finish with clear next-step messaging and a visible processing state.

## Working Version One

Version one should feel like a real product already:

- invite page is simple and clear
- prejoin is a real media setup step
- live meeting uses a standard meeting surface
- transcript and session context sit beside the call
- post-call status is explicit and not hidden

We should not custom-build a fake meeting shell when a stable one already exists in `LiveKit`.

## Interview Stages

### Stage 1: Calibration

- greeting
- permission and environment check
- low-stakes opener

### Stage 2: Core Screening

- explain-a-concept question
- patience and empathy scenario
- handling confusion or disengagement
- communication under ambiguity

### Stage 3: Teaching Simulation

- candidate teaches a topic to a weak-student persona
- system checks simplification, pacing, correction style, and engagement

### Stage 4: Closing

- thank candidate
- avoid revealing score
- explain review timeline

## Question Strategy

Mix fixed and adaptive questions.

### Fixed

- ensures consistent comparison across candidates
- anchors rubric reliability

### Adaptive

- follows vague answers
- challenges shallow responses
- probes examples and teaching choices

## Rubric Output Shape

```ts
type AssessmentReport = {
  overallRecommendation: 'strong_yes' | 'yes' | 'mixed' | 'no'
  confidence: 'high' | 'medium' | 'low'
  summary: string
  dimensions: Array<{
    key:
      | 'clarity'
      | 'warmth'
      | 'patience'
      | 'simplification'
      | 'listening'
      | 'fluency'
      | 'adaptability'
      | 'accuracy'
      | 'engagement'
    score: 1 | 2 | 3 | 4 | 5
    rationale: string
    evidence: string[]
  }>
  redFlags: string[]
  followUpAreas: string[]
}
```

## Recommendation Pattern

Recommendation should not be a single weighted average pretending to be objective.

Use a two-layer model:

### Layer 1: Hard Gates

These should trigger `no` or `strong_no` even if some softer dimensions look decent:

- repeated inability to explain simply after follow-up
- repeated dismissive or impatient student handling
- teaching guidance that is clearly misleading without recovery
- communication so unclear that the teaching role would break down

### Layer 2: Weighted Rubric

Use weighted dimensions for everyone who clears the hard gates:

- clarity
- simplification
- patience
- warmth
- listening
- fluency
- adaptability
- engagement

This gives us a more honest recommendation pattern:

- `strong_yes`
- `yes`
- `mixed`
- `no`
- optionally `strong_no` later if we want a clearer reject band

## Evidence Rules

Every dimension should be backed by evidence, not vibes.

Required:

- at least one concrete transcript-backed snippet per non-neutral claim
- short rationale tied to observable behavior
- confidence per dimension
- transcript-quality awareness when confidence is low

Recommended later:

- separate evidence for strengths and concerns
- evidence timestamps for replay linkage
- quality flags when the signal is weak or partial

## Evaluation Pipeline

The post-call pipeline should be explicit and modular:

1. finalize session artifacts
2. stabilize transcript
3. extract evidence by dimension
4. score dimensions from the extracted evidence
5. apply hard gates and recommendation logic
6. produce recruiter summary, flags, and follow-ups

Do not rely on one giant model call to invent the full report in one pass.

## Decision Quality Rules

To reduce decision fatigue and keep recruiter trust:

- the product recommends, humans decide
- low-confidence reports must be visibly marked
- missing evidence must reduce certainty
- leaderboard ranking is for triage, not final truth
- recruiter overrides should be supported and later measured

## Version One Evaluation Contract

V1 should answer four things cleanly:

1. Can this person communicate clearly enough to teach children?
2. Do they show patience, warmth, and student-safe judgment?
3. Can they simplify and adapt when the learner is confused?
4. Should they move to the next round?

If we cannot answer those well, extra scoring detail is noise.

## Agent Architecture

### V1

Use one interviewer agent with modular responsibilities:

- conversation policy
- structured question plan
- transcript stream handling
- evidence extraction input
- report generation handoff

### Later

Add a separate weak-student agent only after the core interviewer loop is reliable.

The first teaching simulation can still happen in v1, but the interviewer should guide it instead of spawning a second live agent by default.

## Dashboard Views

### Sessions List

- candidate name
- template used
- status
- recommendation
- confidence
- manual-review flag
- updated time

### Session Detail

- timeline
- transcript
- rubric chart
- evidence snippets
- recruiter notes
- recommendation logic summary
- transcript quality flags

### Template Builder

- role
- target traits
- question pack
- rubric weights
- hard-gate policy
- advancement threshold

## Metrics Worth Tracking

- completion rate
- average session duration
- interruption count
- transcript confidence issues
- rubric score distribution
- manual-review rate
- recruiter override rate
- evidence coverage rate
- transcript-quality issue rate
- gate-trigger frequency

## Risks

- noisy or broken candidate audio
- over-talking agent
- latency making the interviewer feel robotic
- hallucinated evidence
- scores that look precise without being reliable

## Safeguards

- transcript quality flags
- evidence-per-dimension requirement
- human review step for low-confidence reports
- fallback typed rescue for severe audio failure

## Build Principle

For the meeting experience:

- use `LiveKit` UI components and connection primitives first
- use `shadcn/ui` blocks and components around them
- use custom UI only where product-specific assessment needs are not covered by existing components

For evaluation:

- keep one canonical rubric schema
- keep one canonical recommendation policy
- keep evidence storage and report generation modular
- optimize for recruiter trust, not pseudo-precision
