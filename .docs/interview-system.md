# Interview System

## Experience Principles

- warm, professional, and calm
- clearly human-centered, not cold automation
- adaptive but structured
- evidence-backed evaluation

## Candidate Journey

1. Open invite link.
2. Read simple expectations and privacy notice.
3. Complete preflight.
4. Start live interview.
5. Answer warm-up, scenario, and teaching questions.
6. Finish with clear next-step messaging.

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
  overallRecommendation: "strong_yes" | "yes" | "mixed" | "no";
  confidence: "high" | "medium" | "low";
  summary: string;
  dimensions: Array<{
    key:
      | "clarity"
      | "warmth"
      | "patience"
      | "simplification"
      | "listening"
      | "fluency"
      | "adaptability"
      | "accuracy"
      | "engagement";
    score: 1 | 2 | 3 | 4 | 5;
    rationale: string;
    evidence: string[];
  }>;
  redFlags: string[];
  followUpAreas: string[];
};
```

## Dashboard Views

### Sessions List

- candidate name
- template used
- status
- recommendation
- confidence
- updated time

### Session Detail

- timeline
- transcript
- rubric chart
- evidence snippets
- recruiter notes

### Template Builder

- role
- target traits
- question pack
- rubric weights

## Metrics Worth Tracking

- completion rate
- average session duration
- interruption count
- transcript confidence issues
- rubric score distribution
- manual-review rate
- recruiter override rate

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
