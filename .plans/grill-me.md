# Grill Me

This is the brutal alignment sheet for the product. Each question includes the recommended answer so we can move quickly without pretending every branch is equally good.

## 1. Are we building a demo or a credible hiring tool?

### Recommended answer

Build a credible MVP for real screening, but scope it so the core loop is rock solid.

## 2. Is video required for version one?

### Recommended answer

No. Audio-first wins. Video adds complexity without meaningfully improving the first hiring signal.

## 3. Should browser Web Speech be the main STT approach?

### Recommended answer

No. Use browser mic capture, but let a realtime voice stack handle the actual interview pipeline.

## 4. Are we choosing LiveKit or Stream first?

### Recommended answer

LiveKit first. It is the stronger fit for an agent-centric realtime interview product.

## 5. Is AI SDK enough for realtime voice by itself?

### Recommended answer

No. AI SDK is excellent for structured generation and agent logic, but it is not the media transport layer.

## 6. Should Convex own the source of truth?

### Recommended answer

Yes. All sessions, transcripts, reports, templates, and dashboard reads should live there.

## 7. Do candidates need authentication?

### Recommended answer

No for MVP. Use secure invite links. Keep login only for admins and recruiters.

## 8. Is the teaching simulation in MVP or later?

### Recommended answer

MVP should include a simplified version where the interviewer shifts into a weak-student persona. A separate student agent can come later.

## 9. Will the final result be pass/fail only?

### Recommended answer

Absolutely not. We need scored dimensions, evidence, concerns, and confidence.

## 10. What makes this stand out from a basic AI interviewer?

### Recommended answer

- realtime, natural-feeling voice flow
- strong preflight and candidate experience
- evidence-backed rubric
- weak-student teaching simulation
- polished recruiter dashboard

## 11. What should we refuse to overbuild right now?

### Recommended answer

- custom media infra
- true multi-agent theatrics in v1
- elaborate video UX
- too many template types
- deep analytics before reports are trustworthy

## 12. What are the real risks that could sink the product?

### Recommended answer

- latency
- poor transcript quality
- robotic interviewer pacing
- rubric outputs without trustworthy evidence
- spending too much time on dashboard chrome before the interview loop works

## 13. What matters more: wow factor or dependable behavior?

### Recommended answer

Dependable behavior. If we have to choose, we should sacrifice novelty before we sacrifice correctness, recovery, and predictability.

## 14. What is our source of truth during failures?

### Recommended answer

Convex. Session lifecycle, transcript chunks, report state, and recovery checkpoints should be persisted so the UI can recover from reconnects and partial failures.

## 15. What happens if the live session drops mid-interview?

### Recommended answer

The product should not lose the interview record. We need resumable session state, explicit reconnect UI, and a session status model that distinguishes `live`, `reconnecting`, `interrupted`, `completed`, and `failed`.

## 16. Should we optimize for fully realtime scoring during the call?

### Recommended answer

No for MVP. Capture strong telemetry and transcript data live, but do the authoritative assessment after the session in a durable background pipeline.

## 17. What is the safer first architecture: realtime speech-to-speech model or explicit STT -> LLM -> TTS?

### Recommended answer

For reliability, start with an explicit `STT -> LLM -> TTS` pipeline unless realtime model quality clearly beats it in testing. The explicit pipeline is easier to observe, debug, retry, and score.

## 18. Should partial transcripts affect final scoring immediately?

### Recommended answer

No. Partial transcripts are for UX and live feedback only. Final scoring should use stabilized transcripts and post-processed evidence.

## 19. Where should we spend abstraction effort early?

### Recommended answer

On session state, transcript persistence, report contracts, and provider boundaries. Those are the layers most likely to change and most dangerous to duplicate.

## 20. What should the very first technical milestone prove?

### Recommended answer

One candidate can join, speak, be heard, get responses with acceptable latency, reconnect without losing the session, and produce a persisted transcript plus a structured post-call report.

## Locked Decisions

- product: `AI Tutor Screener`
- MVP medium: `audio-first`
- realtime stack: `LiveKit`
- app backend: `Convex`
- auth: `Clerk`
- UI kit: `shadcn/ui`
- agent logic and structured outputs: `AI SDK`
- background workflows: `Inngest`

## Open Questions

- which model stack we want for the first live voice run
- whether the first live build uses a full realtime model or an STT -> LLM -> TTS pipeline
- whether recruiters need live monitoring in MVP or only post-session review
- how aggressively we support resume after disconnect in the first release versus forcing a restart with preserved transcript
