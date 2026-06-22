# Production MVP Overhaul Plan

Status: proposed (no code written yet)
Date: 2026-06-22
Owner: TBD
Source review: full codebase audit (auth/RBAC, interview/agent flow, dashboard/Convex layer)

## Purpose

Take Kyma from a "production-shaped skeleton with a demo-grade brain" to a **complete,
shippable MVP** of an AI tutor screener. The guiding constraint from product is:
**reduce code and technical debt, make every shipped feature actually work, and raise
the conversation + assessment to feel like a genuine interview** — cheaply.

## Ground Truth (what is real today)

- Auth/login -> dashboard is coherent: Clerk gates Next routes (`proxy.ts`); JWT org
  claims gate Convex recruiter data; candidates sign-in scoped; invites token scoped.
- The realtime interview is real: `agents/interviewer.ts` is a LiveKit `voice.AgentSession`
  (STT->LLM->TTS) with a genuine multi-agent handoff (interviewer -> "Mia" child -> wrap-up).
- The assessment is NOT AI: `lib/assessment/report-engine.ts` scores 9 rubric dimensions by
  counting English keyword phrases. AI SDK (`ai` v6) is only used for recruiter chat.
- Video is transport-only: agent subscribes `AUDIO_ONLY`; no gesture/facial/body analysis.
- `/admin/*` legacy URLs redirect to `/recruiter/*`; shim tree removed (flow foundation redesign).

## Decisions Locked (2026-06-22)

- Scoring: replace keyword scoring with **LLM structured scoring** (AI SDK `generateObject`
  - per-dimension evidence). Optionally keep deterministic engine as a sanity/fallback check.
- Realtime: upgrade to **speech-to-speech realtime model**, cheap but premium-feeling.
- Video: **v2, consented, reviewable evidence** via a multimodal model — NOT hidden scoring.
- Tooling: prefer realtime/multimodal platforms (OpenAI Realtime, Gemini Live) that are cheap
  yet feel advanced.

## Guiding Principles

1. **Delete before adding.** Every phase must remove at least as much surface area as it adds
   where possible. Net maintenance burden should go down.
2. **Fail closed in production.** No silent auth/processing-key bypass may reach prod.
3. **Evidence-backed, human-reviewable.** No opaque pass/fail; every score cites transcript.
4. **One source of truth.** No validator/constant/handler defined twice.
5. **Don't market what isn't built.** Especially video/affect scoring.

---

## Model & Cost Strategy (grounding for Phases 3-5)

Current realtime pricing (per 1M tokens, June 2026; verify at build time):

| Model                                    | Audio in | Audio out | Text in             | Video in           | Notes                                                                       |
| ---------------------------------------- | -------- | --------- | ------------------- | ------------------ | --------------------------------------------------------------------------- |
| **Gemini 2.5 Flash native-audio (Live)** | $3.00    | $12.00    | $0.50               | $3.00 (1 FPS JPEG) | Native audio+video, affective dialog, VAD, tool use. Cheapest + multimodal. |
| **OpenAI gpt-realtime-mini**             | $10.00   | $20.00    | $0.60 (cache $0.06) | image input        | Best English + tool-calling; preset voices.                                 |
| OpenAI gpt-realtime (full)               | $32.00   | $64.00    | $4.00               | image              | Highest quality, expensive.                                                 |

Reasoning/scoring models (non-realtime, for `generateObject`):
GPT-5 mini ($0.25/$2.00), Gemini 2.5 Flash, etc. — cheap, only run once per interview.

### Recommended tiering

- **Conversation (latency-critical):** Gemini 2.5 Flash native-audio Live as default
  (cheapest, multimodal-ready for video v2, affective dialog improves "feel"); OpenAI
  gpt-realtime-mini as the English-optimized / tool-calling-heavy alternative. Make this
  per-org configurable (BYOK fields already exist in `workspaceSettings`/`modelOverrides`).
- **Scoring (quality-critical, runs once):** strong reasoning model via AI SDK `generateObject`.
- **Recruiter chat:** keep current cheap grounded model.
- **Conditional routing:** cheap/fast for warm-up + small talk; escalate to stronger model for
  substantive screening turns and teaching-simulation evaluation. Route via a single
  `resolveModelId(purpose, orgOverrides)` helper (replace the agent's direct `runtimeEnv` reads).

### LiveKit integration note (verified against @livekit/agents 1.4.x Node/TS)

Swapping to s2s is a one-field change: pass a `RealtimeModel` as the `llm` field of
`AgentSession` (no other code change). Node-supported realtime providers: OpenAI, Gemini,
Azure OpenAI, Phonic, xAI. (Nova Sonic / NVIDIA / Ultravox are Python-only.)

- OpenAI: `@livekit/agents-plugin-openai` -> `new openai.realtime.RealtimeModel({ model: 'gpt-realtime-mini', voice, apiKey })`.
- Gemini: `@livekit/agents-plugin-google` -> `new google.beta.realtime.RealtimeModel({ model: 'gemini-2.5-flash-native-audio-preview-12-2025', enableAffectiveDialog: true, apiKey })` (note the `beta` namespace).

CRITICAL CAVEAT: `gemini-3.1-flash-live-preview` does NOT support `generateReply()`, which our
greeting + phase machine + post-handoff continuations depend on. **Use a Gemini 2.5 native-audio
model** (or OpenAI realtime). Pin this; do not "upgrade" to 3.1 live blindly.

Realtime models **bypass LiveKit Inference** and connect directly to the provider, so s2s ALWAYS
needs a provider key threaded in (not just the LiveKit key). This is the hook for per-org BYOK:
plugin/RealtimeModel take an `apiKey` constructor arg, so pass the org's decrypted key per job.

---

## Phase 0 — Launch-bar validation + operator health (prereq, ~1-2 days)

Goal: prove the existing real path works end-to-end with production-like env before changing it,
and make misconfig visible.

- [ ] Run the launch bar in `.plans/production-launch-sweep.md` with real Clerk/Convex/LiveKit/Inngest.
- [ ] Build an **operator health page** (recruiter-admin only) showing env readiness: LiveKit,
      Convex, Inngest, webhook signing key, `KYMA_PROCESSING_WRITE_KEY`, Clerk config.
- [ ] Capture a baseline: room-join success, transcript-segment count, processing latency.

Exit: one documented clean end-to-end run; health page green.

---

## Phase 1 — Security & correctness hardening (~3-4 days)

Mostly net-neutral/negative code. Fixes things that are currently broken or unsafe.

### BYOK completion (currently only 1/3 wired)

- [ ] Today BYOK flows ONLY into recruiter chat (`buildGatewayByokOptions`), and only OpenAI +
      Anthropic — `google`/Gemini returns `undefined` (`lib/providers/resolve-model.ts:165`).
- [ ] Add Gemini/Google to BYOK resolution (AI SDK gateway for scoring/chat; direct `apiKey` for
      the LiveKit RealtimeModel since realtime bypasses the gateway).
- [ ] Thread per-org decrypted keys into the interview agent + scoring pipeline (neither uses BYOK
      today). Decide platform-keys-vs-BYOK default per surface; document the security boundary.

### Security

- [ ] Remove or `internalMutation` `users.upsert` (`convex/users.ts:33`) — currently public/unauthed.
- [ ] `saveAssessmentReport` (`convex/recruiter.ts:495`): require processing key in production;
      remove the recruiter `requireAdminIdentity` fallback for the pipeline write path.
- [ ] `rateLimiter.checkLimit` (`convex/rateLimiter.ts:24`): convert to `internalAction`.
- [ ] BYOK secrets: gate `getWorkspaceSettingsRaw` + `testProviderConnection` (`convex/admin.ts:806`,
      `:698`) behind `requireAdmin`; verify `testProviderConnection` actually works from an action
      context (Convex actions don't forward client JWT into nested `runQuery`).
- [ ] Add a **prod fail-closed assertion**: if `NODE_ENV==='production'` and Clerk env or
      `KYMA_PROCESSING_WRITE_KEY` is missing/dev-placeholder, throw at startup. Removes the
      `requireIdentity -> null` (`convex/helpers/auth.ts:85`) and `__dev_preview__` bypass risk.
- [ ] Decide the fate of the `requireAdminIdentity` misnomer: rename to `requireRecruiterIdentity`
      (already exists) everywhere it means recruiter; reserve `requireAdmin` for true admin ops
      (template edits, batch creation, settings).
- [ ] Strip client-supplied `authorId`/`reviewerId` override surfaces (`convex/admin.ts:354`,
      `convex/recruiter.ts:578`) — always derive actor server-side.

### Correctness / broken features

- [ ] Candidate dashboard empty bug: make invite email required at creation OR add a
      `userId`-based link path; stop swallowing the link error in `app/(app)/candidate/layout.tsx:39`
      (surface it). Verify signed-in candidates see their interviews.
- [ ] Unify token paths: `/api/livekit/token` (`route.ts:112`) must pass `agentMetadata` like
      `/api/interviews/bootstrap`, or be deleted if redundant.
- [ ] Resolve webhook vs client session-state race (`convex/livekit.ts` participant_left ->
      `interrupted` vs client submit/reconnect). Introduce a clear ownership rule for state writes.
- [ ] Fix dashboard "Active batches" KPI mislabel (`app/(admin)/admin/page.tsx:99`).
- [ ] Unify server fetch error handling: replace `.catch(() => [])` (e.g.
      `app/(admin)/admin/screenings/page.tsx:21`) with the auth-aware `runConvexFetch` pattern.

Exit: security checklist clear; candidate dashboard verified populated; no state-race on clean submit.

---

## Phase 2 — De-duplication & dead-code removal (~3-4 days, deletion-heavy)

This is the biggest "less code to maintain" win. No behavior change intended.

### Shared sources of truth

- [ ] One rubric module: dimensions + weights + labels currently in `report-engine.ts:1`,
      `schema.ts:17`, `lib/recruiter/format.ts:1` -> single `lib/rubric/` (shared by Convex + UI).
- [ ] One validators module: `recommendationValidator`/`confidenceValidator`/
      `rubricDimensionValidator`/`interviewPolicySnapshotValidator` (dup in `schema.ts` +
      `recruiter.ts`) -> shared `convex/validators.ts`.
- [ ] One `InterviewPolicy` type (dup `lib/interview/types.ts` vs `convex/helpers/interviewPolicy.ts`).

### Convex custom-function wrappers (kills ~40x boilerplate)

- [ ] Add `recruiterQuery` / `recruiterMutation` / `orgMutation` / `adminMutation` via
      `convex-helpers/customFunctions` so auth+org scoping is declared once. Removes a whole class
      of "forgot the auth check" bugs and shrinks every handler.
- [ ] Extract shared internal helpers for the near-duplicate pairs:
      `appendSessionEvent`/`appendSessionEventInternal`,
      `upsertTranscriptSegment`/`upsertTranscriptSegmentInternal`,
      and the ~80%-overlapping `getSessionProcessingDetail` vs `getCandidateReviewDetail`.
- [ ] De-dup candidate-auth helpers shared by `convex/profile.ts` + `convex/readiness.ts`;
      `isBootstrapAdminEmail` (`users.ts` + `clerkIdentity.ts`); `canAccessRecruiter` (5+ copies).

### UI consolidation

- [ ] One `scoreColor()` + `formatTime()` (currently 5x and 2x) in a shared UI util.
- [ ] One candidate status-filter helper (dup in `candidate/page.tsx` + `candidate/interviews/page.tsx`).
- [ ] Introduce a Review context to kill the 15-prop drill in `candidate-review-workspace.tsx`;
      split `review-console.tsx` (~540 lines) into focused subcomponents.
- [ ] Infer UI types from `api.recruiter.*` instead of redefining `TranscriptSegment`/`Evidence`/
      `DimensionScore` locally (`review-console.tsx:22`).

### Delete dead code

- [ ] Delete unused `TranscriptRail`/`SessionOverview`/`SessionTimeline` **OR** wire `TranscriptRail`
      into the live call (see Phase 4 live captions) — pick one, don't leave them orphaned.
- [x] Remove the `/admin/*` shim tree; make `/recruiter/*` the single canonical route; align
      `proxy.ts`, `lib/auth/routing.ts`, sidebars, and docs. (Done in flow foundation redesign.)
- [ ] Rename `convex/admin.ts` to recruiter-centric name if low-risk.
- [ ] Remove `video-demo` placeholder and `app/interviews/page.tsx` legacy stub if unused.
- [ ] Add `returns:` validators incrementally to public Convex functions (project rule; currently zero).

### Scale-readiness (defer heavy work, but plan)

- [ ] Replace unbounded `.collect()` on `listReviewCandidates`/`getDashboardSummary`/`searchCandidates`/
      `listCandidateInterviews` with pagination or bounded `.take()` + targeted indexes.
- [ ] Pass `now` into `getDashboardSummary` args (remove `Date.now()` in query, `convex/admin.ts:453`).
- [ ] Add `by_session_and_started_at` index for transcript throttle scans (`convex/interviews.ts:54`).
- [ ] Add `orgId` to `transcriptSegments` for consistent org isolation/auditing.

Exit: zero duplicated validators/constants; auth via wrappers; dead components removed; net LOC down.

---

## Phase 3 — LLM structured scoring (~4-5 days)

Replace keyword scoring (biased against non-native English, gameable, not evidence-true).

- [ ] Define a Zod scoring schema: per-dimension `{score 1-5, rationale, evidence[]}` with
      transcript quotes + timestamps, `overallRecommendation`, `confidence`, `hardGate`,
      `transcriptQualityNote`, `needsManualReview`.
- [ ] Implement `lib/assessment/llm-report.ts` using AI SDK `generateObject` against the scoring
      schema; feed full transcript + session events + template `rubricConfig`.
- [ ] Wire into `lib/assessment/process-session.ts` (replace/augment `buildAssessmentReport`).
      Keep deterministic engine optionally as a cheap cross-check that can flag disagreement ->
      `manual_review` (hybrid safety net).
- [ ] Auto-`manual_review` on low transcript coverage, low confidence, or det-vs-LLM disagreement.
- [ ] Make scoring model org-configurable via `modelOverrides.review`/`defaultModels`.
- [ ] Tests: golden-transcript fixtures (strong/weak/edge) asserting schema validity, evidence
      grounding (quotes exist in transcript), and gate behavior.

Exit: reports are LLM-generated, evidence-cited, schema-validated, with a manual-review safety net;
keyword engine no longer the primary scorer.

---

## Phase 4 — Realtime speech-to-speech upgrade + genuine interview structure (~5-7 days)

Make the conversation feel human and make the configurable interview real.

### Conversation engine

- [ ] Swap the STT->LLM->TTS cascade in `agents/interviewer.ts` for a realtime s2s model as the
      `llm` field of `AgentSession`: Gemini 2.5 native-audio (`google.beta.realtime.RealtimeModel`,
      `enableAffectiveDialog: true`) default; OpenAI `gpt-realtime-mini` alt. PIN to Gemini 2.5
      (NOT 3.1 live — no `generateReply()`).
- [ ] Tune turn-handling for the child persona: `turnHandling.interruption.mode: 'adaptive'` +
      `resumeFalseInterruption`, `minEndpointingDelay` ~600-700ms (kids pause mid-thought).
- [ ] Replace direct `runtimeEnv` model reads with `resolveModelId(purpose, orgOverrides)`; thread
      the org's decrypted provider key into the RealtimeModel/plugin `apiKey` per job (BYOK).

### Make the interview actually configurable (wire the unwired DB fields)

- [ ] Agent fetches template `systemPrompt`/`childPersonaPrompt`/`wrapUpPrompt`/`rubricConfig`/
      `modelOverrides` by `sessionId` before `session.start` (today it uses static `DEFAULT_*`).
- [ ] Replace scripted `session.say` openers with prompt-driven first turns (keep a short safety
      fallback line only).

### Durable interview structure

- [ ] Add an agent-side phase machine: warm-up -> screening -> teaching-sim -> wrap-up, with
      rubric-coverage tracking so the agent knows what it still needs to probe.
- [ ] Add a `completeInterview` tool: agent-led graceful close + auto-submit to processing
      (removes the awkward manual-only "Submit & Leave").
- [ ] Persist phase/sim state durably (not the in-memory `teachingSimulationStarted` flag).

### Trustworthy transcript (server-side, agent-authored)

- [ ] Persist transcript from agent session events into Convex via `upsertTranscriptSegmentInternal`:
      `user_input_transcribed` (isFinal) for candidate; `conversation_item_added` (switch on
      `item.role`) for both candidate + agent turns. Keep browser `TranscriptionReceived` as redundant.
- [ ] Persist `function_tools_executed` as structured, evidence-backed scoring artifacts.
- [ ] Rely on `close_on_disconnect` for drop/reconnect flush; add a `transcription_node` fallback
      to guard against empty agent content during barge-in (known historical bug; verify on 1.4.5).
- [ ] Wire a **live caption rail** in the candidate call (reuse `TranscriptRail`) for trust.

Exit: sub-second turn-taking; template-driven, configurable interviews; agent-led graceful end;
server-side agent-authored transcript of record; live captions.

---

## Phase 5 — Video as reviewable evidence (v2, ~5-7 days, gated on legal/consent)

Highest-risk feature; do it right or not at all.

- [ ] Explicit camera consent in prejoin with clear copy on storage + use; default off if declined.
- [ ] Switch agent subscription off `AUDIO_ONLY`; enable live video input via `roomInputOptions` on
      `session.start` (VERIFY exact Node field name on 1.4.5 — docs examples are Python-first) with a
      video-capable realtime model (Gemini 2.5 native-audio). Only Gemini Live / OpenAI Realtime
      support live video; cascade can only do still frames.
- [ ] Forward only changed frames (cost control); prompt for ONE concrete observation per change,
      captured as a structured tool output (not free narration).
- [ ] OPTIONAL delighter (separate from candidate-vision): give the interviewer a face via a LiveKit
      avatar plugin (`AvatarSession.start(session, room)` before `session.start`) — Tavus or Beyond
      Presence (`bey`) have the cleanest Node APIs. Gate behind a cost flag. (HeyGen is not currently
      in LiveKit's avatar plugin list.) Avatar = agent's face OUT; it does NOT see the candidate.
- [ ] Surface visual observations as **reviewable recruiter evidence** (annotations tied to
      transcript timestamps), explicitly NOT folded into the hire/no-hire number.
- [ ] Storage/retention policy + bias-review checklist before enabling; align with
      `.plans/production-launch-sweep.md:54` (consent + storage + model + evidence + bias review).
- [ ] Recruiter UI: video evidence tab with timestamped annotations; clear "not a score" labeling.

Exit: consented video, agent-visible, evidence-only; no hidden visual scoring; compliance contract met.

---

## Cross-cutting: Observability & Testing

- [ ] Structured error IDs; counts for event-persist failures, processing latency, transcript
      quality, room-join success, recruiter override rate (per `production-launch-sweep.md:63`).
- [ ] Alert on Inngest enqueue failure (today it silently falls back inline). Bump
      `process-interview-assessment` `retries` from 1 -> 3-4 once scoring is model-based, and split
      into discrete steps (load -> finalize-transcript -> score -> persist) for cheap retries.
- [ ] Replace in-memory HTTP rate limits with a shared store for multi-instance deploys.
- [ ] Agent tests: use the Node `agents.voice.testing` namespace (`session.run`, `expect`,
      `AgentHandoffAssert`, `.judge(llm, { intent })`, `FakeLLM`) to assert phase machine + handoffs +
      rubric-driven questions. NOTE: Node `mockTools()` is not implemented yet -> inject tool deps
      manually. Text-layer only; add a separate audio/latency eval lane before prod.
- [ ] Vitest coverage for: scoring schema/evidence grounding, auth wrappers, session state machine,
      candidate linking. Playwright smoke for invite -> join -> submit -> review.

## Deployment note (from LiveKit docs)

- Prefer **LiveKit Cloud** for the agent worker (stateful load balancing pins a session to one
  server for its duration; elastic autoscaling by effective load; reconnect handling) — fits the
  "reliability under load / reconnects" priority. `lk agent create` builds + deploys (auto-Dockerfile).
- Keep the worker **stateless** (all interview state in Convex). Plan capacity at ~tens of concurrent
  voice sessions per machine. Use log drains (Datadog/Sentry/etc.) for the observability above.
- Set `agentName` per template so dispatch routes the right interviewer into each candidate room.

---

## Sequencing & Effort (rough)

1. Phase 0 — 1-2d (validate before changing)
2. Phase 1 — 3-4d (security + correctness; blocks "production" claim)
3. Phase 2 — 3-4d (delete debt; do before adding features so new work lands on clean base)
4. Phase 3 — 4-5d (real assessment)
5. Phase 4 — 5-7d (real conversation)
6. Phase 5 — 5-7d (video evidence; gated on legal)

MVP-ship line = Phases 0-4. Phase 5 is the differentiator that can follow the first ship.

## Open Questions / Risks

- LiveKit realtime API confirmed (see integration note); remaining verify-on-1.4.5 items: exact
  `roomInputOptions` video field name, and whether the barge-in empty-agent-content bug persists.
- BYOK security posture for org-provided model keys (final decision before broad realtime usage).
- Legal/consent + retention contract gates Phase 5 entirely.
- Demo invite (`KYMA_ENABLE_DEMO_INVITE`) production policy: hide or route to request-demo.
- Multi-language fairness: native-audio models degrade on low-resource languages; document scope.

## Definition of Done (complete MVP)

- All shipped features verified working (no write-only profile/readiness; candidate dashboard
  populated; configurable templates actually drive the interview).
- No unauthenticated/spoofable mutations; prod fails closed on misconfig.
- Assessment is LLM-based, evidence-cited, schema-validated, with manual-review safety net.
- Conversation uses a realtime speech-to-speech model with agent-led graceful close.
- One canonical route tree; no duplicated validators/constants/handlers; dead code removed.
- Net maintenance surface reduced vs today.
