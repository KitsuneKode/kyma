# Current Findings

This file is the fast restart point for future agents. Read this before re-researching providers or rediscovering current blockers.

## Locked Decisions

- Realtime transport: `LiveKit`
- App/backend source of truth: `Convex`
- Admin auth: `Clerk`
- Background jobs: `Inngest`
- UI approach for now: minimal `shadcn/ui` style primitives, no polish detours
- Candidate access: invite-first (`/i/[token]` or `/interviews/[inviteId]`); screening invites require auth + auto-claim
- Mock interviews: auth-gated from `/candidate` (`sessionPurpose: mock`)
- Candidate IA: invite-first with secondary signed-in portal (`/candidate/*`)
- Recruiter canonical routes: `/recruiter/*` (`/admin/*` redirects)

## Why LiveKit Won

- better fit for agent-native realtime systems than a generic call SDK
- supports explicit agent dispatch and token-driven room agent assignment
- cleaner path to future weak-student and multi-agent scenarios
- strong official path for Node agent workers

## What Is Already Working

- `bun run typecheck` passes
- `bun run lint` passes
- `bun run build` passes
- `bun run check` mirrors CI (`fmt:check`, `lint`, `test`, `convex:ci`, typecheck, build)
- invite flow renders at `/i/[token]` and `/interviews/[inviteId]`
- candidate flow now uses `LiveKit PreJoin` plus a composed meeting shell built from LiveKit React components
- candidate join triggers a real backend bootstrap route
- bootstrap route creates or reuses an interview session in Convex
- bootstrap route returns a real LiveKit token
- candidate page connects to a LiveKit room using the selected prejoin device IDs
- candidate page listens to LiveKit transcription events; the **interview agent** persists transcript segments into Convex (not the browser)
- LiveKit webhook intake now exists at `/api/livekit/webhook`
- LiveKit egress recording artifacts are now stored in Convex and surfaced on recruiter detail pages
- interview processing can now be triggered through `/api/interviews/process`
- Inngest is now wired at `/api/inngest`, with an inline fallback processor when enqueueing is unavailable
- recruiter-side review surfaces at `/recruiter/candidates` and `/recruiter/candidates/[sessionId]`
- screening batch flows at `/recruiter/screenings`, `/recruiter/screenings/new`, and `/recruiter/screenings/[batchId]`
- recruiter detail now supports human notes and grounded recruiter chat
- hybrid assessment pipeline (`lib/assessment/process-session.ts`) attempts LLM scoring with deterministic fallback to `manual_review`
- report, dimension-evidence, and review-decision data models now exist in Convex
- invite links now surface explicit `expired`, `consumed`, and `unavailable` states in the candidate flow
- submitted interviews now lock the invite so the same screening cannot be started twice
- interview policy is now visible in the lobby and session rail: target duration, single-use behavior, and link expiry
- interviewer runtime now opens with a welcome + readiness prompt before formal screening begins
- interviewer runtime now includes a child-persona teaching simulation handoff and a dedicated wrap-up return
- candidate room now supports optional screen sharing during the teaching segment so Excalidraw or other sketch tools can be used without a native whiteboard build
- recruiter review now surfaces teaching-simulation completion and screen-share signals alongside transcript/report evidence
- assessment summaries now explicitly mention whether live teaching evidence was captured
- recruiter/admin Convex reads and writes are now auth-gated when Clerk is configured, and server-rendered admin pages pass Clerk-backed Convex tokens
- assessment writes now support an internal processing key via `KYMA_PROCESSING_WRITE_KEY` for safer background/report mutations
- `/recruiter` is Clerk-protected when Clerk env is configured (`/admin` redirects here)
- `bun run test` (Vitest) and `bun run test:e2e` (Playwright smoke) exercise core helpers and the home route
- template-driven screening policy (duration, resume, attempts) is stored on templates and batches and resolved for the candidate lobby; completed reports store a `policySnapshot`
- HTTP rate limits on interview bootstrap, process enqueue, and recruiter chat (Convex rate-limiter component); Convex-side throttles on hot candidate mutations; `auditEvents` for review decisions and recruiter notes
- recruiter chat responses can include **citations** and persist **answerSource** / model metadata on `reportChatMessages`
- legacy `/interviews` dashboard surface is now hard-cut (404), not an alias
- candidate portal routes now functional:
  - `/candidate` grouped by actionable status
  - `/candidate/interviews` with status filters
  - `/candidate/interviews/[id]` with release-state-aware detail and transcript timeline
- candidate readiness is now MVP-functional with persisted run history in Convex (`candidateReadinessRuns`)
- candidate profile is now MVP-functional with persisted interview preferences in Convex (`candidatePreferences`)
- candidate/browser write paths now require invite+session capability checks; server-origin paths are processing-key gated
- webhook/session timeline writes now include dedupe strategy (`sessionEvents` dedupe key index)

## Important Routes

- `/`
- `/recruiter` (canonical; `/admin` redirects)
- `/recruiter/setup`
- `/recruiter/candidates`
- `/recruiter/candidates/[sessionId]`
- `/recruiter/screenings`
- `/recruiter/screenings/new`
- `/recruiter/screenings/[batchId]`
- `/recruiter/settings`
- `/join/[orgId]`
- `/i/[token]` (short invite alias)
- `/interviews/[inviteId]`
- `/candidate`
- `/candidate/interviews`
- `/candidate/interviews/[id]`
- `/candidate/readiness`
- `/candidate/profile`
- `/api/inngest`
- `/api/interviews/bootstrap`
- `/api/interviews/process`
- `/api/livekit/webhook`
- `/api/recruiter/report-chat`

## Important Files

- `convex/schema.ts`: current schema
- `convex/interviews/*`: public snapshot, bootstrap, session events, candidate portal
- `convex/processing/assessment.ts`: pipeline-only assessment read/write (`getSessionProcessingDetail`, `saveAssessmentReport`)
- `convex/recruiter/*`: recruiter workspace queries and review surfaces
- `convex/admin.ts`: screening creation, eligibility, recruiter notes, and recruiter chat persistence
- `app/api/interviews/bootstrap/route.ts`: canonical server bootstrap + LiveKit token path
- `app/api/recruiter/report-chat/route.ts`: grounded recruiter chat endpoint
- `components/interview/interview-workspace.tsx`: candidate-side join flow
- `convex/recruiter.ts`: recruiter-side read models, report persistence, review decisions
- `convex/livekit.ts`: webhook-driven room/event and recording-artifact ingestion
- `convex/readiness.ts`: candidate readiness history read/write surface
- `convex/profile.ts`: candidate interview preference read/write surface
- `components/candidate/readiness-panel.tsx`: readiness checks runner + history UI
- `components/candidate/profile-panel.tsx`: identity + interview preference UI
- `lib/assessment/report-engine.ts`: deterministic scoring and evidence extraction for v1
- `lib/assessment/process-session.ts`: shared report-processing pipeline
- `convex/helpers/auth.ts`: shared recruiter auth helpers for Convex functions
- `app/(admin)/recruiter/candidates/page.tsx`: recruiter queue
- `app/(admin)/recruiter/candidates/[sessionId]/page.tsx`: recruiter detail page
- `app/(admin)/recruiter/screenings/page.tsx`: screening batch list
- `app/(admin)/recruiter/screenings/new/page.tsx`: screening creation flow
- `app/(admin)/recruiter/screenings/[batchId]/page.tsx`: invite/eligibility detail
- `app/(app)/recruiter/setup/page.tsx`: org create/join wizard
- `components/recruiter/recruiter-notes.tsx`: recruiter note entry
- `components/recruiter/recruiter-chat.tsx`: grounded recruiter chat UI
- `lib/recruiter/report-chat.ts`: recruiter-chat prompt grounding and fallback
- `lib/livekit/token.ts`: shared LiveKit token creation with optional agent dispatch
- `lib/livekit/recording.ts`: room-composite recording bootstrap
- `agents/interviewer.ts`: first LiveKit interviewer agent
- `agents/worker.ts`: LiveKit Node worker entrypoint
- `components/convex-client-provider.tsx`: Clerk + Convex client provider bridge
- `proxy.ts`: auth-route redirects and protected app-shell route gating

## Current Blockers

- Clerk env is still required for full admin/auth testing
- LiveKit room connection works only when `NEXT_PUBLIC_LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` are set
- actual conversational agent behavior still needs a running LiveKit agent worker and model/provider keys
- duplicate-media-acquisition risk is reduced by passing selected device IDs through join, but the long-term best path is still tighter room lifecycle control
- current invite/time-limit policy is app-level and defaulted, not yet template-driven
- transcript persistence now depends on transcription events being emitted by the LiveKit/agent path, so final quality still depends on the chosen STT/runtime provider
- recording URLs depend on LiveKit egress plus object storage credentials being configured
- the report pipeline now generates first-pass evidence and scoring automatically, but it is deterministic and intentionally conservative
- webhook-driven room sync exists, and Inngest is wired, but the model-based/AI reviewer layer still has not been added
- screening creation currently uses the default template and app-level expiry/attempt policies, not template-driven controls yet
- recruiter chat is grounded and usable, but it still needs true model-provider configuration or later BYOK to move beyond the fallback path
- the child persona currently relies on prompt + TTS configuration rather than a dedicated voice-cloning path
- native collaborative whiteboard is still deferred; current recommended visual-teaching path is screen share with tools like Excalidraw
- primary repo lint/format is now `oxlint` + `oxfmt`

## Environment Variables That Matter Right Now

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` for admin auth
- `CLERK_SECRET_KEY` for admin auth
- `CLERK_FRONTEND_API_URL` preferred, or `CLERK_JWT_ISSUER_DOMAIN` as fallback, for Clerk-backed Convex auth
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `LIVEKIT_AGENT_NAME` optional, enables token-side agent dispatch
- `LIVEKIT_AGENT_STT_MODEL`
- `LIVEKIT_AGENT_LLM_MODEL`
- `LIVEKIT_AGENT_TTS_MODEL`
- `LIVEKIT_AGENT_CHILD_TTS_MODEL`
- `LIVEKIT_AGENT_WRAP_TTS_MODEL`
- `LIVEKIT_WEBHOOK_API_KEY` optional, falls back to `LIVEKIT_API_KEY`
- `LIVEKIT_WEBHOOK_API_SECRET` optional, falls back to `LIVEKIT_API_SECRET`
- `LIVEKIT_RECORDING_ENABLED`
- `LIVEKIT_RECORDING_AUDIO_ONLY`
- `LIVEKIT_RECORDING_TEMPLATE_URL`
- `LIVEKIT_RECORDING_STORAGE_BUCKET`
- `LIVEKIT_RECORDING_STORAGE_REGION`
- `LIVEKIT_RECORDING_STORAGE_ACCESS_KEY`
- `LIVEKIT_RECORDING_STORAGE_SECRET_KEY`
- `INNGEST_APP_ID`
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `KYMA_PROCESSING_WRITE_KEY` optional but recommended for protecting assessment writes from background jobs/routes
- `KYMA_ENABLE_DEMO_INVITE` optional for local/demo invite behavior

`NEXT_PUBLIC_CONVEX_SITE_URL` and `CONVEX_DEPLOYMENT` are generated by Convex bootstrap and usually should not be hand-authored.

## Testing Path Right Now

1. ensure `.env.local` contains LiveKit credentials, plus Clerk credentials when testing admin/auth paths
2. ensure `NEXT_PUBLIC_CONVEX_URL` exists from `bun run convex:once`
3. visit `/candidate` and start a mock interview, or open a screening invite at `/i/[token]`
4. enter candidate name
5. complete the LiveKit prejoin flow
6. click `Join interview`
7. confirm room connection and selected media publication
8. if running `bun run agent:dev`, confirm the interviewer agent joins the same room
9. let the candidate reach the child-persona teaching simulation and confirm the agent handoff happens
10. optionally start screen sharing and confirm the event appears in the candidate timeline
11. speak in the room and confirm transcript segments start appearing in the transcript rail
12. submit the interview, then reload the invite and confirm it no longer allows a second attempt
13. try an invalid invite id and confirm the unavailable screen renders
14. confirm the agent greets the candidate warmly, waits for readiness, then eventually runs the teaching simulation
15. open `/recruiter/candidates` and confirm sessions show up in the recruiter queue
16. open `/recruiter/candidates/[sessionId]` for a real session and confirm transcript/session detail renders even before report generation exists
17. if LiveKit webhook delivery is configured, confirm session events and recording artifacts start appearing from webhook traffic
18. submit the interview and confirm a report plus evidence appear on the recruiter detail page after processing
19. confirm the recruiter detail page shows teaching-simulation status and whether screen share was used
20. create a screening batch at `/recruiter/screenings/new` and confirm invite links are generated for the eligible candidates
21. on a recruiter detail page, save a note and ask a recruiter-chat question

## Research Findings Worth Not Repeating

- `AI SDK` is useful here for structured generation and orchestration, but it is not the media transport layer
- browser Web Speech should not be the primary production STT path
- LiveKit tokens can include room config with agent dispatch, so the frontend can stay stable while the agent worker arrives later
- LiveKit Node agents are an official supported path and should be the agent-kit direction for this repo
- LiveKit webhooks are the right path for reflecting room and egress lifecycle into Convex
- LiveKit egress is the right path for recruiter-facing replay artifacts and downloadable recordings
- the first reliable report pipeline should be deterministic and evidence-backed before adding model-based grading
- the current standout slice is the guided teaching simulation, not a generic Q&A bot
- the working v1 product direction is documented in `.docs/v1-product-livekit-plan.md`
- `oxlint` and `oxfmt` are now the primary local quality tools for the product code; generated/vendor-like files are intentionally ignored there

## Source Index

Use these first before re-researching the current implementation choices:

- LiveKit React components: https://docs.livekit.io/reference/components/react/
- LiveKit React guide: https://docs.livekit.io/reference/components/react/guide/
- LiveKit webhooks and room events: https://docs.livekit.io/intro/basics/rooms-participants-tracks/webhooks-events/
- LiveKit JS `WebhookReceiver`: https://docs.livekit.io/reference/server-sdk-js/classes/WebhookReceiver.html
- LiveKit egress/composite recording: https://docs.livekit.io/transport/media/ingress-egress/egress/composite-recording/
- Inngest Next.js serving: https://www.inngest.com/docs/learn/serving-inngest-functions
- Inngest Next.js quickstart: https://www.inngest.com/docs/getting-started/nextjs-quick-start
- Inngest event sending: https://www.inngest.com/docs/events
- Inngest `createFunction()` reference: https://www.inngest.com/docs/reference/typescript/functions/create
- Inngest AI orchestration: https://www.inngest.com/docs/features/inngest-functions/steps-workflows/step-ai-orchestration
- AgentKit overview: https://agentkit.inngest.com/
- Convex schemas: https://docs.convex.dev/database/schemas
- Convex indexes: https://docs.convex.dev/database/reading-data/indexes/
- Vendor research log (dated notes, not requirements): `.docs/vendor-and-research-log.md`

## Next Best Work

**Shipped on main (usable ship):** security/SaaS stack #3–#15; commercial #18 (Dodo, quotas, invite email, GDPR, BYOK gate, template policy); operational credibility #20 (finalize honesty, reaper, copilot guardrails, audits).

Immediate owner work:

1. **Phase A (owner-run):** full LiveKit path with `bun run live-path:preflight` + `bun run dev:full` (see `.plans/operational-credibility-next.md`)
2. Owner-run `.docs/verification-pending.md` items 1–4 / 6
3. Set `RESEND_API_KEY` + `NEXT_PUBLIC_APP_URL` for real invite delivery (log-only without Resend)
4. Live Dodo products/webhooks when ready for paid plans (override path works via `KYMA_ORG_PLAN_OVERRIDE`)

Still open product/tech debt:

- persist/reconcile `reconnecting` server-side and promote `connecting → live` without waiting solely on webhooks
- freeze policy snapshot at invite/session start (today recomputed at report time)
- wire `interviewStyleMode` into agent behavior (`convex/agentConfig.ts` / `agents/interviewer.ts`)
- Convex API cutover (#19): port #20 Next-route hardening into Convex actions/http before merge
- replace in-memory HTTP rate limits with a shared store for multi-instance deploys
- BYOK KMS rotation + broader lifecycle (`.docs/byok-architecture.md`)

## Validation log

- 2026-07-10 — Code-only Phase B/C/D/E slice landed (finalize honesty, policy UI, copilot guardrails/citations/gating, livekitToken rate limit, screening/BYOK audits, BYOK design doc). Live room E2E still pending owner credentials.
- _Append dated rows here after manual LiveKit / end-to-end runs (same PR as behavior changes when possible)._

## Local Developer Experience

- `bun run convex:once` bootstraps Convex and writes `NEXT_PUBLIC_CONVEX_URL`
- `bun run dev` starts Next.js only
- `bun run convex:dev` starts Convex watch mode
- `bun run dev:stack` starts Next.js plus Convex together
- `bun run dev:full` also starts the LiveKit worker
- `bun run lint` uses `oxlint`
- `bun run lint:fix` runs `oxlint --fix` for automated lint remediation
- `bun run test` runs Vitest; `bun run test:e2e` runs Playwright (see `playwright.config.ts`)
- `bun run fmt` uses `oxfmt`; `bun run fmt:check` validates formatting in CI/local checks
- public candidate-flow work can proceed without Clerk configured
