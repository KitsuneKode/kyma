# Grill Me

This is the brutal alignment sheet for the product. Each question includes the recommended answer so we can move quickly without pretending every branch is equally good.

## 1. Are we building a fake AI demo, or a working first product?

### Recommended answer

Build a working first product. It can be narrow, but the core loop must be real.

## 2. Should we build the meeting UI ourselves?

### Recommended answer

No. We should wrap `LiveKit` components instead of replacing them.

## 3. What should our custom frontend code do, then?

### Recommended answer

Own the product shell around the room:

- invite flow
- session bootstrap
- transcript rail
- assessment rail
- recruiter review

Do not own the low-level meeting mechanics.

## 4. Should `demo-invite` stay special-cased?

### Recommended answer

Yes, but only as a demo invite token. The meeting path behind it must still be real.

## 5. Is the first candidate experience a custom lobby or a LiveKit prejoin?

### Recommended answer

Use `LiveKit PreJoin` first. It already solves the problem we were custom-building badly.

## 6. Is video required for version one?

### Recommended answer

No, but video-capable UI should exist because LiveKit already supports it and the prejoin/call surfaces assume it well.

## 7. Are we choosing LiveKit or Stream first?

### Recommended answer

LiveKit first. The transcript-backed meeting and agent flow fits it better.

## 8. Should browser Web Speech be the main STT approach?

### Recommended answer

No. Browser mic capture is fine, but the realtime voice path should not depend on browser Web Speech.

## 9. Is AI SDK enough for realtime voice by itself?

### Recommended answer

No. `AI SDK` is for structured generation and orchestration, not the room transport layer.

## 10. Should Convex own the source of truth?

### Recommended answer

Yes. Sessions, reports, transcript segments, and review state should live there.

## 11. Do candidates need authentication?

### Recommended answer

No for MVP. Invite links are enough. Admin auth is where Clerk matters.

## 12. What should the first version look like on screen?

### Recommended answer

A very clear product shell:

- left/main: LiveKit prejoin or meeting surface
- right rail: transcript, session facts, and later evidence
- top metadata: invite, template, status

No custom meeting chrome unless LiveKit cannot provide it.

## 13. What should we refuse to overbuild right now?

### Recommended answer

- custom meeting controls
- custom participant grids
- flashy AI theatrics
- deep dashboard work before interviews function
- multi-agent room choreography

## 14. What are the real risks that could sink the product?

### Recommended answer

- latency
- poor transcript quality
- robotic interviewer pacing
- rubric outputs without trustworthy evidence
- spending too much time on dashboard chrome before the interview loop works

## 15. What matters more: wow factor or dependable behavior?

### Recommended answer

Dependable behavior. If we have to choose, we should sacrifice novelty before we sacrifice correctness, recovery, and predictability.

## 16. What is our source of truth during failures?

### Recommended answer

Convex. Session lifecycle, transcript chunks, report state, and recovery checkpoints should be persisted so the UI can recover from reconnects and partial failures.

## 17. What happens if the live session drops mid-interview?

### Recommended answer

The product should not lose the interview record. We need resumable session state, explicit reconnect UI, and a session status model that distinguishes `live`, `reconnecting`, `interrupted`, `completed`, and `failed`.

## 18. Should we optimize for fully realtime scoring during the call?

### Recommended answer

No for MVP. Capture strong telemetry and transcript data live, but do the authoritative assessment after the session in a durable background pipeline.

## 19. What is the safer first architecture: realtime speech-to-speech model or explicit STT -> LLM -> TTS?

### Recommended answer

For reliability, start with an explicit `STT -> LLM -> TTS` pipeline unless realtime model quality clearly beats it in testing. The explicit pipeline is easier to observe, debug, retry, and score.

## 20. Should partial transcripts affect final scoring immediately?

### Recommended answer

No. Partial transcripts are for UX and live feedback only. Final scoring should use stabilized transcripts and post-processed evidence.

## 21. Where should we spend abstraction effort early?

### Recommended answer

On:

- session state
- transcript persistence
- report contracts
- provider boundaries
- shared invite/bootstrap helpers

Those are the layers most likely to change and most dangerous to duplicate.

## 22. What should the very first technical milestone prove?

### Recommended answer

One candidate can enter a real LiveKit prejoin, join a room, meet the interviewer agent, complete a short session, reconnect without losing the session, and trigger durable post-call processing.

## Locked Decisions

- product: `AI Tutor Screener`
- MVP shape: `real meeting flow first`
- meeting UI: `LiveKit prefabs first`
- MVP medium: `audio-first with video-capable room UI`
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
