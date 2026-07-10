# Operational Credibility Plan

> Goal: turn Kyma from a technically functional screener into a hiring product a team can run daily.
> Source of truth for priorities: `.docs/next-phase-prd.md`
> Current state: `.docs/current-findings.md`
> Owner-run verification queue: `.docs/verification-pending.md`

**Status:** Active  
**Baseline:** waves 001–011 DONE; foundations exist; remaining work is trust, reliability, and ops quality  
**Non-goals this phase:** weak-student multi-agent, avatar polish, facial scoring, broad provider sprawl

---

## Success definition

One hiring team can:

1. create a screening with explicit policy
2. send invites
3. run a live voice interview with agent + teaching sim
4. get transcript, recording, and evidence-backed report without manual repair
5. review and decide in the recruiter UI with grounded chat

---

## Phase map (do in order)

| Phase | Name                       | Outcome                                              | Depends on         |
| ----- | -------------------------- | ---------------------------------------------------- | ------------------ |
| A     | Live-path proof            | One real session completes invite → report           | Env + agent worker |
| B     | Runtime gap fixes          | No hanging sessions; artifacts land reliably         | A findings         |
| C     | Template-driven policy     | Screening behavior from template/batch, not defaults | B stable           |
| D     | Recruiter copilot trust    | Grounded, model-backed chat with provenance          | C optional         |
| E     | Security + BYOK boundaries | Abuse controls + safe provider design                | D design gate      |
| F     | Expand only after A–E      | Richer eval / sim / polish                           | A–E solid          |

---

## Phase A — Live-path proof (P0)

### Why

Code compiles and the product loop exists. Proof still depends on real LiveKit credentials, agent runtime, webhooks, and recording.

### Preconditions

- [ ] `.env.local` has Clerk, Convex, LiveKit, agent model keys
- [ ] `KYMA_PROCESSING_WRITE_KEY` set for non-dev
- [ ] `bun run live-path:preflight` passes
- [ ] `bun run dev:full` (Next + Convex + agent worker)

### Execution checklist

Use `.docs/current-findings.md` → Testing Path and `.docs/backend-verification-runbook.md` items 3–4.

| #   | Step                                               | Pass criteria                                              |
| --- | -------------------------------------------------- | ---------------------------------------------------------- |
| A1  | Open invite `/i/[token]` or mock from `/candidate` | Lobby shows policy (duration, single-use, expiry)          |
| A2  | PreJoin → Join interview                           | Room connects; selected devices publish                    |
| A3  | Agent joins                                        | Interviewer present in same room                           |
| A4  | Welcome + readiness → screening → teaching sim     | Handoff to child persona works                             |
| A5  | Optional screen share                              | Event appears in session timeline                          |
| A6  | Speak                                              | Transcript segments appear in rail / Convex                |
| A7  | Submit interview                                   | Invite locks; no second start                              |
| A8  | Processing                                         | Session → `processing` → `completed` or `manual_review`    |
| A9  | Recruiter detail                                   | Report, evidence, teaching/sim signals, notes, chat        |
| A10 | Webhook + recording (if configured)                | `sessionEvents` + recording artifacts on detail page       |
| A11 | Reconnect smoke                                    | Timer continuity; identity preserved (verification item 4) |

### Deliverables

- Append dated pass/fail rows to `.docs/current-findings.md` → Validation log
- Update `.docs/verification-pending.md` items 3–4 with evidence
- File concrete bugs found as Phase B tasks (do not skip ahead)

### Exit criteria

One real session completes end-to-end **without manual Convex data repair**.

---

## Phase B — Runtime gap fixes (P0)

### Why

Phase A will surface the real reliability gaps. Fix those before product expansion.

### Likely work areas (confirm from A)

| Area                     | Key files                                                                      | Fix until                                           |
| ------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------- |
| Agent join / STT-LLM-TTS | `agents/interviewer.ts`, `agents/worker.ts`, env model strings                 | Agent joins every time; transcript quality usable   |
| Session state machine    | `lib/interview/session-machine.ts`, `convex/interviews/*`, `convex/livekit.ts` | No ambiguous hanging states after disconnect/submit |
| Webhook ingestion        | `app/api/livekit/webhook/route.ts`, `convex/livekit.ts`                        | Events deduped; room lifecycle reflected in Convex  |
| Recording egress         | `lib/livekit/recording.ts`, storage env                                        | Artifact rows + playable URLs when enabled          |
| Processing pipeline      | `lib/assessment/process-session.ts`, Inngest `/api/inngest`                    | Idempotent; report + evidence always appear         |
| Room lifecycle / media   | `components/interview/*`                                                       | No duplicate media acquisition; clean leave         |

### Rules

- Prefer shared helpers over page-local patches
- Keep scoring conservative (deterministic + evidence); do not replace with opaque LLM scoring yet
- Convex remains product source of truth; normalize provider state into product state
- Inngest steps must be idempotent and recoverable

### Code-only progress (2026-07-10)

| Item                                                                              | Status                          |
| --------------------------------------------------------------------------------- | ------------------------------- |
| B1 Honest finalize + normalize connecting/reconnecting → interrupted → processing | Done                            |
| B4 Stale pre-processing reaper (`connecting`/`live`/`interrupted`)                | Done                            |
| B5 `markAssessmentProcessing` idempotent for in-flight/completed/manual_review    | Done                            |
| B6 `/api/interviews/process` goes through finalize before enqueue                 | Done                            |
| B2/B3 reconnect persistence + client→server live promotion                        | Open (needs LiveKit validation) |
| Agent/STT/recording live quality                                                  | Open (Phase A owner-run)        |

### Exit criteria

- Repeat Phase A checklist twice in a row with pass
- Session never stuck needing manual repair
- Recruiter detail consistent after completion

---

## Phase C — Template-driven screening policy (P1)

### Why

Some policy is already stored (`policySnapshot`, template/batch fields), but creation and candidate behavior still lean on defaults in places. Product-configurable policy is required for multi-role screening.

### Required policy fields

- target duration
- expiry policy
- allowed attempts
- resume policy
- role / skill focus
- rubric version
- optional interview style mode

### Work breakdown

| Task                                             | Where                                          | Done when                                    | Status                                                                              |
| ------------------------------------------------ | ---------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| C1 Audit defaults vs template/batch fields       | `convex/schema.ts`, screening create UI, lobby | Gap list written                             | Done (explore)                                                                      |
| C2 Expose policy inputs on screening create      | `/recruiter/screenings/new`, admin mutations   | Recruiter can set policy without code change | Already shipped; template create/edit now expose duration/resume/style              |
| C3 Resolve policy for candidate lobby + session  | invite snapshot, bootstrap                     | Lobby/session use configured values          | Done — lobby shows attempts/resume; meeting cap uses `policy.targetDurationMinutes` |
| C4 Persist `policySnapshot` on completed reports | assessment pipeline                            | Recruiter sees which policy version applied  | Done — review UI renders snapshot                                                   |
| C5 Tests for resolution + snapshot               | Vitest                                         | Defaults vs override cases covered           | Done — `interviewPolicy.test.ts`                                                    |

### Exit criteria

- Creating a screening with non-default duration/attempts/expiry changes candidate behavior
- Report shows the policy snapshot used
- No hardcoded “single source of truth” left only in app constants for those fields

---

## Phase D — Recruiter copilot hardening (P1)

### Why

Chat exists with citations and fallback. It is not yet trustworthy enough as a daily hiring tool.

### Work breakdown

| Task                                | Where                                           | Done when                                                             | Status                                                              |
| ----------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| D1 Provenance UX                    | `components/recruiter/recruiter-chat.tsx`       | Citations jump to transcript/evidence; visible fallback vs model mode | Done — `citation-resolve.ts` + CitationList jumps                   |
| D2 Guardrails                       | `lib/recruiter/report-chat.ts`                  | Unsupported questions refuse conservatively                           | Done — classify + refuse unmatched                                  |
| D3 Durable metadata                 | `reportChatMessages`                            | `answerSource`, model, citations persisted and reviewable             | Partial — persisted; UI shows source/modelId; chat audit still open |
| D4 Recruiter prompts                | report-chat prompts                             | Strengths / risks / recommendation / missing evidence / follow-ups    | Done — fallback handlers + stronger prompts                         |
| D5 Model path (after E design gate) | provider resolve + `/api/recruiter/report-chat` | Model-backed answers when keys configured; fallback otherwise         | Done — explicit config + credentials gating                         |

### Exit criteria

- Answers grounded only in transcript, evidence, report, session metadata
- Recruiter can tell fallback vs live model
- History is durable and auditable

---

## Phase E — Security, abuse controls, BYOK design (P1)

### Why

Provider flexibility without boundaries becomes insecure and unmaintainable.

### Already shipped (do not rebuild)

- HTTP rate limits on bootstrap (`publicSnapshot` + `livekitToken`) / process / report-chat (Convex rate-limiter)
- Processing write key enforcement
- Audit events for review decisions, notes, screening batch create/expiry extend, and workspace BYOK/settings (no raw keys)
- Org-scoped recruiter access (owner-run verification still pending)
- BYOK design note: `.docs/byok-architecture.md`

### Remaining work

| Task                                           | Done when                                                                         | Status                                                                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| E1 Owner-run verification items 1–2, 2.1, 2.2  | Clerk sync + RBAC + cross-org isolation marked in `.docs/verification-pending.md` | Open (owner-run)                                                                                                                  |
| E2 Extend audit coverage                       | Screening batch create/update/delete audited if compliance needs it               | Done — `createScreeningBatch` + `extendBatchExpiry`; workspace provider key add/remove + model/release settings (no raw keys)     |
| E3 Rate-limit coverage gaps                    | Hot paths (e.g. token mint) covered; budgets tuned                                | Done — bootstrap asserts `livekitToken` (invite+IP) in addition to `publicSnapshot`                                               |
| E4 BYOK architecture note (design before code) | Doc: encrypt at rest, decrypt only in server/job, never client, redact logs       | Done — `.docs/byok-architecture.md`                                                                                               |
| E5 BYOK implementation only after E4           | Settings + KMS/envelope; `testProviderConnection`; no plaintext keys              | Partial / deferred — encrypt + settings + test connection already exist; KMS rotation + broader lifecycle still open per BYOK doc |
| E6 Owner-run item 6                            | BYOK provider validation pass                                                     | Open (owner-run)                                                                                                                  |

### BYOK principles (non-negotiable)

- keys never reach the client
- keys not stored in plaintext
- decrypt only for request/job execution
- all provider resolution through shared server boundaries
- logs/errors redact secrets

Until remaining E5 gaps (KMS rotation, broader lifecycle) and E6 owner-run validation are closed, keep expanding BYOK off the critical path; platform env keys are fine for D5 fallback.

### Exit criteria

- Verification queue access/identity items closed
- Written BYOK design accepted before broad provider UI
- Abuse controls documented and exercised

---

## Phase F — Explicit later (do not start early)

Only after A–E:

- weak-student / multi-agent simulation depth
- avatar-first experience
- model-primary scoring replacing deterministic evidence engine
- native collaborative whiteboard (screen share + Excalidraw remains recommended)
- marketing/UI polish without operational value

---

## Parallel owner-run track (can run alongside A–E)

From `.docs/verification-pending.md` — agents cannot fully close these without secrets:

| Item                               | Priority | Blocks                 |
| ---------------------------------- | -------- | ---------------------- |
| 1 Clerk webhook sync               | P1       | Identity trust         |
| 2 / 2.1 / 2.2 RBAC + org isolation | P1       | Recruiter trust        |
| 3 LiveKit invite + identity        | P0       | Phase A                |
| 4 Reconnect timer continuity       | P0       | Phase A/B              |
| 5 Candidate result gating          | P2       | Candidate portal trust |
| 6 BYOK provider validation         | P1       | Phase E                |
| 7 Template version history         | P2       | Phase C depth          |

Pre-flight: `bun run live-path:preflight` + `/recruiter/health`.

---

## Suggested sprint slices

### Slice 1 — Prove and stabilize

1. Run Phase A checklist
2. Fix Phase B blockers until A passes twice
3. Log validation evidence

### Slice 2 — Configurable screening

1. Phase C audit + UI + resolution + snapshot tests
2. Owner-run template version history (item 7) if in scope

### Slice 3 — Trust layer

1. Phase D grounding UX + prompts
2. Phase E verification + BYOK design
3. Model-backed chat only after provider boundary is clear

---

## Key files

| Concern              | Paths                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| Candidate live       | `components/interview/*`, `app/api/interviews/bootstrap`, `agents/*`                               |
| Webhooks / recording | `app/api/livekit/webhook`, `convex/livekit.ts`, `lib/livekit/*`                                    |
| Processing           | `lib/assessment/*`, `convex/processing/assessment.ts`, `/api/inngest`                              |
| Policy               | `convex/schema.ts`, screening create under `app/(admin)/recruiter/screenings/*`, invite snapshot   |
| Recruiter            | `components/recruiter/*`, `lib/recruiter/report-chat.ts`, `convex/recruiter/*`                     |
| Security             | `convex/helpers/auth.ts`, `lib/http/server-rate-limit.ts`, `.docs/security-and-maintainability.md` |

---

## Handoff / docs to update as you go

After each slice:

- [ ] `.docs/current-findings.md` — blockers cleared, validation log
- [ ] `.docs/verification-pending.md` — status flips with evidence
- [ ] `.context/session.md` — short handoff (done / in progress / next)
- [ ] This plan — checkboxes and exit criteria

---

## Definition of done for this plan

- [ ] Phase A exit met (real E2E without repair)
- [ ] Phase B exit met (two clean runs)
- [ ] Phase C exit met (policy drives behavior + snapshot)
- [ ] Phase D exit met (grounded, reviewable chat)
- [ ] Phase E exit met (verification + BYOK design; implementation if approved)
- [ ] Phase F still deferred intentionally
