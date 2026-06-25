# Architecture

## Product Goal

Build a horizontal AI voice screener for hiring teams, starting with tutor screening and expanding across job families (engineering, product, sales, support, and general professional roles).

Core signals vary by template, but the platform consistently evaluates:

- communication clarity
- role-relevant judgment and adaptability
- structured thinking under conversational pressure
- optional live simulation segments (teaching, roleplay, or case discussion)

The system should feel welcoming to candidates while producing an evaluation a hiring team can trust.

## Primary User Roles

### Candidate

- opens interview link
- passes device and network checks
- completes voice interview
- optionally completes a configured simulation segment (teaching, roleplay, or case discussion)
- sees a graceful completion state

### Recruiter or Admin

- creates screening templates
- generates candidate interview links
- monitors live and completed sessions
- reviews transcript, rubric, and recommendation
- exports or shares assessment summaries

## MVP Scope

The MVP should prove the interview loop end-to-end, not every future feature.

### Must Have

- admin authentication
- assessment template creation
- candidate link generation
- candidate preflight for mic, speaker, permissions, and environment
- realtime voice interview
- adaptive follow-up questions
- full transcript storage
- post-call structured rubric with evidence
- admin review dashboard

### Should Have

- interview timer and progress states
- candidate retry for misunderstood answers
- confidence flags for low-quality transcripts or weak evidence
- charts for rubric dimensions

### Later

- live video
- multi-language support
- practice mode
- recruiter co-pilot
- teacher-to-weak-student simulation as a richer multi-agent scene

## Strong Recommendation

Use `LiveKit + Convex + Clerk + shadcn/ui + AI SDK + Inngest`.

### Why

- `LiveKit` is the best fit for realtime voice interview infrastructure and agent lifecycle.
- `Convex` gives us reactive app state, transcript/report persistence, and a clean admin dashboard data model.
- `AI SDK` is great for structured generation, tools, and report synthesis, but it should not be treated as the primary realtime media layer.
- `Inngest` is ideal for durable post-interview processing and retries.

## System Boundaries

## Application Shell Architecture

Next.js App Router is organized with route groups to keep UI responsibilities isolated:

- `(marketing)` for public-facing product surfaces and conversion pages.
- `(auth)` for Clerk sign-in and sign-up pages with a focused auth layout.
- `(app)` for authenticated operator surfaces like admin and internal tools.

Root `app/layout.tsx` owns only shared infra concerns (fonts, providers, Clerk bootstrapping), while shell-specific chrome lives in each route group layout. This prevents provider-level UI coupling and keeps redesign work localized.

### Frontend

Next.js handles:

- landing and onboarding flows
- candidate preflight
- interview room UI
- live transcript and state feedback
- admin dashboard and report views

#### Client state and data libraries

- Server state is owned by Convex (`useQuery`/`useMutation`): reactive, cached,
  subscription-based. We deliberately do **not** add TanStack Query — it would be
  a redundant second data layer on top of Convex. The only non-Convex calls are
  one-shot POSTs to Next routes (interview bootstrap/process, report-chat), which
  are imperative actions and not cache-worthy.
- Local/UI state for the two complex client surfaces uses per-mount `zustand`
  stores (`components/interview/interview-workspace-store.ts`, the review console
  store in `components/recruiter/review-context.tsx`) so consumers subscribe to
  narrow slices via selectors and avoid re-rendering on high-frequency updates
  (e.g. audio `timeupdate`).
- Date/duration display uses `date-fns` via `lib/format/date.ts`. These helpers
  are display-only; never call them inside Convex queries (wall-clock reads break
  query caching).

### Auth

`Clerk` protects the admin side.

Candidate interview links should be tokenized and public-facing so candidates do not need to create accounts for MVP.

### Realtime Interview Layer

`LiveKit` handles:

- room creation
- WebRTC media transport
- agent participation in the room
- interruptions and turn-taking
- optional telephony path later

### Application Backend

`Convex` handles:

- assessment templates
- candidate invites
- session records
- transcript segments
- rubric results
- recruiter notes
- live dashboard reads

### Agent and Generation Layer

`AI SDK` powers:

- structured question generation
- follow-up generation
- rubric JSON generation
- evidence extraction
- summary generation

The realtime speaking agent can live inside a LiveKit agent service while still using AI SDK-compatible model providers for non-realtime generation paths.

#### Agent media routing and BYOK

The interviewer worker (`agents/worker.ts` + `agents/interviewer.ts`) supports two
runtime modes selected by `KYMA_AGENT_REALTIME_PROVIDER`:

- `cascade` (default): separate STT -> LLM -> TTS pipeline.
- `openai` / `gemini`: a single speech-to-speech realtime model.

Model routing rules:

#### Model routing by stage

Five model slots are configured per workspace (`workspaceSettings.defaultModels`)
and optionally overridden per assessment template (`template.modelOverrides`):

| Slot         | Pipeline                                         |
| ------------ | ------------------------------------------------ |
| `stt`        | Live interview transcription (cascade mode)      |
| `llm`        | Live interviewer reasoning (cascade or realtime) |
| `tts`        | Live interviewer voice (cascade mode)            |
| `scoring`    | Post-session rubric scoring                      |
| `reviewChat` | Recruiter report Q&A                             |

Resolution order for every slot (see `lib/providers/resolve-model.ts`):

```
templateOverrides[kind] ?? workspaceDefaults[kind] ?? env[kind] ?? DEFAULT_MODELS[kind]
```

Env fallbacks: `LIVEKIT_AGENT_STT_MODEL`, `LIVEKIT_AGENT_LLM_MODEL`,
`LIVEKIT_AGENT_TTS_MODEL`, `KYMA_SCORING_MODEL`, `KYMA_REVIEW_CHAT_MODEL`.

Recruiters set workspace defaults and template overrides in settings UI;
`resolveStageModels` exposes the effective ids for ops dashboards.

- **STT/TTS in cascade mode** are passed to LiveKit as gateway model id strings
  (e.g. `deepgram/nova-3`, `cartesia/sonic`). These resolve through **LiveKit
  inference (LiveKit Cloud Inference)**. We intentionally do not bundle the
  `@livekit/agents-plugin-deepgram` / `@livekit/agents-plugin-cartesia` packages,
  so Deepgram/Cartesia must be available via LiveKit inference. To self-host
  those providers instead, install the matching plugins and construct explicit
  STT/TTS instances in `lib/agent/resolve-runtime-model.ts`.
- **Cascade LLM** is the one media leg that honors org BYOK. When the resolved
  LLM is an OpenAI model and an OpenAI key is available (org BYOK first, then a
  platform `OPENAI_API_KEY`), the resolver builds an explicit
  `openai.LLM({ model, apiKey })` instance so generation bills to that key rather
  than the shared gateway. Otherwise it falls back to the gateway model string.
- **Realtime modes** thread the org/platform key directly into the
  `openai`/`google` realtime model constructors.

Worker liveness is reported to Convex (`agentWorkerHeartbeats`) on a fixed
cadence so the operator health panel can flag a downed worker.

### Workflow Layer

`Inngest` handles:

- post-session report generation
- transcript cleanup
- evidence clipping
- retryable scoring jobs
- notifications and webhooks

## Realtime Design

## Recommendation

Ship audio-first for MVP.

### Why

- the problem statement requires voice, not video
- audio-first is faster to stabilize
- lower bandwidth means fewer candidate failures
- the evaluation value comes mostly from speech content, pacing, warmth, and simplification

## Suggested Interview Flow

1. Candidate joins from a single-use link.
2. Preflight checks mic permissions, playback, and noise guidance.
3. AI interviewer sets expectations and asks consent for recording/transcription.
4. Warm-up question reduces anxiety and calibrates audio.
5. Core behavioral and teaching questions adapt based on answers.
6. Teaching simulation asks the candidate to explain a topic to a weak student persona.
7. Interview closes politely and explains next steps.
8. Background jobs generate rubric, summary, and review artifacts.

## Teaching Simulation Design

This is the standout feature, but it should be scoped carefully.

### MVP-Lite Version

The same interviewer switches into `student mode`:

- acts confused
- asks naive follow-up questions
- tests whether the candidate can simplify

This avoids the complexity of true multi-agent orchestration while preserving the product value.

### Phase 2 Version

A separate `student agent` joins the session or receives a handoff:

- interviewer frames the task
- student agent plays a weak learner persona
- evaluator scores the teaching interaction separately

## Rubric Design

Every assessment result should include:

- `overallRecommendation`
- `hireSignal`
- `confidence`
- dimension scores from `1-5`
- evidence snippets
- concerns and red flags
- improvement notes

### Core Dimensions

- clarity
- warmth
- patience
- simplification
- listening
- fluency
- adaptability
- accuracy
- student engagement

## Fairness and Trust

We should not ship a black-box pass/fail tool.

The MVP must include:

- recording/transcription disclosure
- evidence-backed scoring
- human-review positioning
- flags when transcript quality is weak
- a way to mark sessions as needing manual review

## What To Avoid

- browser Web Speech as the main architecture
- video-heavy scope in week one
- one giant prompt that does interviewing and final scoring without structure
- opaque scoring with no quotes or rationale
- building custom media infra from scratch
