# Production Launch Sweep

Status: active launch-readiness checklist.

## Current Product Truth

- Kyma is closest to launch as an audio-first LiveKit tutor screener.
- The candidate flow, LiveKit room join, Convex session persistence, transcript persistence, report generation, recruiter review, notes, chat, and screening batches exist.
- Video-capable interview UI exists through LiveKit camera tracks, screen share, and egress recording artifacts.
- Video analysis is not implemented yet. Do not market facial expression, posture, gaze, or visual-behavior scoring until a consented capture, processing, evidence, and human-review contract exists.

## Fixes From This Sweep

- LiveKit token creation no longer calls a hard-coded local debug ingest endpoint.
- Interview bootstrap rate-limit failures now stay inside the route error boundary and return the intended controlled response.
- Interview processing route no longer attempts to re-read a consumed request body in the error handler.
- Candidate completion copy no longer promises that a recording was saved when egress/storage may be disabled.
- Screening creation template selection handles nullable select values and keeps typecheck green.
- Dev seeding now creates a complete local review fixture: seed org, memberships, open invite, completed tutor session, transcript, teaching-simulation events, recording artifact, report evidence, decision, notes, and chat messages.
- Added a development-only read-only review page at `/dev/reviews/[sessionId]` so final recruiter review output can be inspected without a Clerk org session.
- Local Inngest route now runs in SDK dev mode outside production and returns a 200 introspection response when cloud signing keys are absent.
- Candidate prejoin handles unsupported camera/microphone preview contexts with an on-page warning instead of a dev console error.

## Local Demo Anchors

After `bun run db:seed:dev`, use the returned values:

- `sampleInviteTokens[0]`: open candidate invite for prejoin/lobby validation.
- `sampleReviewSessionIds[0]`: rich completed review for `/dev/reviews/[sessionId]`.

## Launch Bar

Before public launch, verify one real end-to-end run with production-like env:

1. Recruiter signs in with Clerk and selects/creates an organization.
2. Recruiter creates an assessment template or uses the seeded default.
3. Recruiter creates a screening batch and opens a generated invite.
4. Candidate completes prejoin, joins a LiveKit room, and sees the interviewer agent join.
5. Candidate speaks enough for final transcript segments to persist.
6. Candidate optionally screen shares during teaching simulation.
7. Candidate submits and the session moves to processing.
8. Inngest processes the report, or the fallback path completes visibly.
9. LiveKit webhook events and recording artifacts appear when egress is configured.
10. Recruiter opens the candidate detail page and sees transcript, events, report, evidence, notes, chat, and decision controls.

## Production Gaps

- Real LiveKit/agent/STT/TTS validation is still the biggest launch blocker.
- `/recruiter/*` is the canonical recruiter route. `/admin/*` redirects to `/recruiter/*` (shim removed).
- Convex admin/recruiter reads still use broad `.collect()` in several list/detail queries. Fine for pilot data, but replace with pagination or bounded `.take()` plus targeted indexes before larger cohorts.
- Processing can fall back inline when Inngest enqueue fails. Good for local resilience, but production should alert on enqueue failure and make fallback behavior visible in ops logs.
- Public demo entry points exist in marketing/candidate empty states. Decide whether `KYMA_ENABLE_DEMO_INVITE` is production-enabled; if not, hide demo CTAs or route them to recruiter login/request-demo.
- Recruiter copilot has grounded fallback behavior, but model-backed mode and BYOK/provider policy need final security decisions before broad usage.
- Native video analysis needs a separate consent, storage, model, evidence, and bias-review plan. Start with rubric-visible screen-share/recording evidence, then add model-assisted visual annotations only after the audio path is trustworthy.

## Recommended Next Implementation Order

1. Run the launch bar manually with real Clerk, Convex, LiveKit, Inngest, and recording env.
2. Fix any live-path failures in agent join, transcript, webhook, recording, and processing.
3. ~~Canonicalize `/recruiter` vs `/admin`~~ Done — `/recruiter` canonical, `/admin` redirects.
4. Replace unbounded Convex list queries on recruiter/admin surfaces with paginated or bounded queries.
5. Add an operator health page for env readiness, LiveKit config, Inngest config, webhook signing, and processing-key status.
6. Add production observability: structured error IDs, event failure counts, processing latency, transcript quality counts, room join success, and recruiter override rate.
7. Design video analysis as a v2 capability with explicit consent and evidence-backed annotations, not as hidden scoring.
