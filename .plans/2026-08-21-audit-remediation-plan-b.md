# Audit Remediation Plan B — Full-Surface Audit (2026-08-21)

- Baseline commit: `3f838d7`
- Verification baseline at audit time: `bun run typecheck` ✅ · `bun run test` ✅ (286/286, 55 files) · runtime probes ✅ (`/` 200; `/recruiter` → Clerk redirect; bootstrap validates input → 400 clean message; LiveKit webhook rejects unsigned → 401; report-chat requires org ctx, returns sanitized error + requestId)
- Companion to: `.plans/2026-08-21-audit-remediation.md` ("Plan A"). This plan covers the **full audit surface**; Plan A concentrates on the scoring engine and cost metering. See comparison section at the bottom.
- Finding ID legend: C-nn = backend correctness audit · S-nn = scoring/report/graph audit · P-nn = perf/arch/deps/DX/docs audit · SEC-nn = security surface.
- Every P0/P1 finding below was personally re-verified in source by the lead auditor before inclusion.

---

## Phase 0 — Trust-boundary & data-loss holes (P0, ship-blockers)

### Task B1: Stop trusting client-supplied `source` for session-state writes

- Findings: [C-01] HIGH confidence, verified.
- Evidence: `convex/interviews/sessionEvents.ts:26,38,64` passes `args.source` into `insertSessionEventWithTransition`; `lib/interview/session-state-ownership.ts:21-31` grants ANY state write when `source ∈ {'livekit-webhook','livekit-agent','assessment-pipeline'}`; transition applies `processing` via `convex/helpers/interviewSession.ts:243-255`.
- Impact: any invite holder can force-finalize their interview (`source:'assessment-pipeline', state:'processing'`) outside the assessed pipeline — invite consumed, eligibility burned, no report ever generated. The entire FINALIZE_OWNED_STATES design is enforced on an attacker-controlled string.
- Fix: in `appendSessionEvent`, ignore `args.source` unless the request carries the validated processing key; hardcode `'candidate-client'` on the invite-token path. Server/webhook callers already pass explicit sources internally.
- Verify: new vitest case asserting a candidate-client write of `state:'processing'` is recorded as an event but never transitions session state. Run `bun run test`.

### Task B2: Rotate the committed Clerk secret; move CI secrets out of git

- Findings: [SEC-01].
- Evidence: `.env.convex-ci:2` contains a Clerk `sk_test_…` value committed to the repo, consumed by `convex:ci` (`package.json:30`). Contradicts `CONTRIBUTING.md` policy.
- Fix: rotate the key in the Clerk dashboard, delete from repo **and history** (`git filter-repo` or BFG), store as GitHub Actions secrets, add `.env.convex-ci.example` placeholder.
- Verify: `git log --all -- .env.convex-ci` shows only the example file after cleanup; CI green.

### Task B3: Internalize dev-seed/wipe actions; align dev-mode gate

- Findings: [C-04].
- Evidence: `convex/devSeed.ts:44-54` public `resetDevData` action gated only by confirmation string + `assertDevelopmentMode()` (NODE_ENV-only signal); rest of codebase uses dual `KYMA_DEPLOYMENT_ENV`/`NODE_ENV` convention (`lib/env/deployment-mode.ts`, `convex/helpers/auth.ts:92-102`); `seedDevDataForActiveOrg` clears tables globally.
- Fix: re-register as `internalAction`/`internalMutation`; use the shared dual-signal dev check; scope table clearing to target org or document global blast radius.
- Verify: `bunx convex run devSeed:resetDevData` fails against a deployment without the processing key/dev signals.

### Task B4: Conditional patch semantics in template updates

- Findings: [C-02]/[S-10], verified.
- Evidence: `convex/recruiter/templates.ts:268-273` patches `systemPrompt`, `childPersonaPrompt`, `simulationPersonaPrompt`, `wrapUpPrompt`, `rubricConfig`, `modelOverrides` unconditionally — Convex deletes fields patched to `undefined`. Neighboring lines 256–267 do it correctly. `rubricVersion` bumps on every save (line ~246).
- Impact: recruiter editing only a name silently erases system prompt + rubric + model overrides for every subsequent interview; version history snapshots the destruction.
- Fix: wrap every optional field in `...(args.x !== undefined ? { x: args.x } : {})`; bump `rubricVersion` only when `rubricConfig` provided.
- Verify: unit test "no-op save preserves prompts/rubric"; `bun run test`.

### Task B5: Validate rubric weights server-side

- Findings: [S-04].
- Evidence: `convex/recruiter/templates.ts:23-32` `weight: v.number()` accepts negatives/zero/unbounded; normalization in `lib/assessment/scoring-policy.ts:79-88` divides by totalWeight → out-of-range scores render verbatim.
- Fix: reject non-finite, `<0`, sum≤0 weights in `updateAssessmentTemplate` + shared validator; mirror inline feedback in `components/admin/rubric-config-editor.tsx`.
- Verify: mutation rejects negative-weight payload (vitest).

### Task B6: Billing/org-sync webhook integrity

- Findings: [C-11].
- Evidence: `convex/billing.ts:106-122` unknown-org events dropped permanently (`applied:false`, no retry) — org stranded on wrong plan until an unrelated webhook arrives; `convex/orgs.ts:43-48` wipes `slug`/`imageUrl` when partial Clerk payloads omit them; single shared static `KYMA_PROCESSING_WRITE_KEY` guards five public surfaces compared with `!==` (not constant-time), no scoping.
- Fix: schedule delayed retry (or apply-on-next-sync) for unknown-org billing events; merge semantics (`?? existing`) for slug/imageUrl; split per-purpose keys with constant-time compare (`crypto.timingSafeEqual`); sign webhook payloads instead of bearer string where feasible.
- Verify: vitest — billing event for not-yet-mirrored org is retried/applied later; partial Clerk sync preserves existing slug/imageUrl.

---

## Phase 1 — Scoring integrity (the "does the rating work" core)

Verdict context: scoring pipeline WORKS end-to-end on happy path incl. conservative fallbacks (empty transcript / LLM failure / malformed output all land in `manual_review`). These tasks close integrity gaps that let non-compliant outputs ship as `completed`.

### Task B7: Enforce full rubric dimension coverage in LLM reports

- Findings: [S-01]. Evidence: `lib/assessment/llm-report-schema.ts:80` `min(1)` allows any subset; `llm-report.ts:458-470` never diffs returned dimensions against `resolveRubricDimensionNames(...)`; duplicates cause React key collisions in `rubric-score-bars-chart.tsx:90`.
- Fix: post-parse diff vs configured dimensions; missing or duplicated ⇒ force `needsManualReview`. Unit test with subset fixture.

### Task B8: Recompute weightedScore server-side

- Findings: [S-02], verified. Evidence: `lib/assessment/llm-report.ts:342` stores model-asserted `weightedScore` (±1 tolerance lets drift ship as completed); deterministic path uses `computeAssessmentWeightedScore` but LLM path doesn't.
- Fix: recompute via `computeAssessmentWeightedScore(sanitized.dimensionScores, resolvedWeights)`; keep model value only for cross-check.

### Task B9: Make configured hard gates real

- Findings: [S-03]. Evidence: `report-engine.ts:254` ignores `_isHardGate`; `scoring-policy.ts:25-37` consults only DEFAULT_HARD_GATE_DIMENSIONS while the LLM prompt advertises configured gates (`llm-report.ts:254`); charts star default gates only (`review-assessment-bento.tsx:87`).
- Fix: thread configured gate set through `buildAssessmentReport` → `isHardGateTriggered`; persist effective gate list on report/policySnapshot; pass to chart components. Migration note for stored reports.

### Task B10: Bound the LLM scoring call

- Findings: [S-05]. Evidence: `generateObject` has `maxRetries:2` but no abortSignal (`llm-report.ts:365-370`); Inngest step lacks timeout (`inngest/functions/process-interview-assessment.ts:31`).
- Fix: `abortSignal: AbortSignal.timeout(env-tunable, default 90s)`; Inngest step timeout slightly above so catch/`markAssessmentFailed` always wins.

### Task B11: De-duplicate stuck-processing recovery

- Findings: [C-05]. Evidence: `processingReaper.ts:140-143` enqueues fresh `-reap-${now}` event ids every tick bypassing dedupe; `process-session.ts:99-105` skip-guard misses `manual_review`; unconditional report patches let stragglers downgrade `completed`→`failed` (`helpers/assessmentReports.ts:71-97`).
- Fix: in-flight retry marker suppresses repeat re-enqueues; treat `manual_review` as terminal; refuse report downgrades except explicit give-up path.

### Task B12: Validate chat citations before persisting

- Findings: [S-06]. Evidence: `lib/recruiter/report-chat.ts:372-394` accepts any refs unvalidated; persisted to `reportChatMessages.citationsJson` (`route.ts:122-126`).
- Fix: filter refs resolvable against `detail.evidence` bounds + transcript timestamps; store only validated refs with labels.

### Task B13: Candidate-safe summary for released reports

- Findings: [S-07]. Evidence: `candidatePortal.ts:765-782` returns internal `report.summary` verbatim ("likely reject unless a recruiter finds counter-evidence"); practice surface already filters hire/reject terms (`candidatePortal.ts:397-402`).
- Fix: render band + strengths/growth copy candidate-side (reuse practice filters) or generate dedicated `candidateSummary` at scoring time. Product decision required — flag for owner.

### Task B14: Align truncation between scoring paths + surface it

- Findings: [S-08] MED confidence. Evidence: processing reads last 500 segments (`sessionReview.ts:9`); LLM prompt further truncates to 48k chars head60/tail (`llm-report.ts:266-303`) while deterministic consumes full slice — input asymmetry causes spurious disagreement → manual_review for long sessions; shrink-loop exits at 1 line even over budget.
- Fix: compute both paths from one shared slice; append transcriptQualityNote when truncated.

---

## Phase 2 — Scale correctness (quotas, stats, DSR, races)

### Task B15: Fix GDPR erasure batching + cursor skip

- Findings: [C-03], logic verified. Evidence: `convex/compliance.ts:233-245` recomputes subject session ids each continuation then slices with absolute cursor — after pass-1 deletions shrink the list, `slice(40,…)` is empty ⇒ job reports done with sessions remaining; child-table drain uses single `.take(40)` per table ⇒ orphaned transcript segments (PII persists despite "completed" DSR event).
- Fix: stable id snapshot (or always restart slice at 0 until empty); loop take/delete until each child table drains BEFORE deleting report+session; log truncation binds.
- Verify: integration test with >DELETE_BATCH sessions + many segments; assert zero orphans.

### Task B16: Kill oldest-first sampling; denormalize quota counters

- Findings: [C-06] + [P-06] same root cause. Evidence: `screenings.ts:247-253` quota counts oldest 100 batches ascending (quota bypasses for large orgs); `265-273` active-invite scan oldest min(max+50,5000); same pattern `candidates.ts:54-67,215-249`, `screenings.ts:434-459`, `processingReaper.ts:274-288`.
- Fix: order desc + `(orgId, createdAt)` indexes for stats; maintain denormalized counters on batches/org (updated transactionally by invite/batch mutations); surface scanned<total truncation.
- Verify: seed >100 batches; quota check reflects recent window exactly.

### Task B17: Dashboard false-positive "stale sessions"

- Findings: [C-07]. Evidence: `recruiter/dashboard.ts:73-89` builds report map only from manual_review+pending; `149-156` flags any >1h session without map entry ⇒ completed reports appear as problems.
- Fix: include completed/failed statuses (indexes exist).

### Task B18: Close bootstrap double-session race

- Findings: [C-10] MED confidence. Evidence: `interviews/bootstrap.ts:63-66` non-unique `.first()`; no-patch path (pre-opened portal invites) means concurrent bootstraps don't OCC-collide ⇒ two rooms, double attemptCount burn.
- Fix: sentinel invite patch before insert (serialize on OCC) or per-invite lock doc; re-check attemptCount after acquiring.

### Task B19: Transcript hot-path index + bound collects

- Findings: [C-08]. Evidence: `helpers/transcriptSegments.ts:65-78` fallback linear scan of ALL segments up to 120×/min live; guideline-violating collects at `reviews.ts:129-133,186`, `visualObservations.ts:51-54`, `readiness.ts:39-44`, `candidatePortal.ts` ×3, migration helpers.
- Fix: always populate `sourceSegmentId` so indexed lookup suffices (or composite index); thread limits through `loadSessionReviewSlices`; paged loops elsewhere.
- NOTE: overlaps Plan A Task 3 — adopt whichever formulation is deeper; do once.

### Task B20: Small correctness batch

- [C-13] expiry extension locks marked-expired invites forever (`screenings.ts:494-501` vs `helpers/interviewSession.ts:53-58`) — reset status on extend or exclude from count.
- [C-14] `failedLast24h` counts any failure regardless of age (`screenings.ts:441-453`) — add `emailStatusChangedAt`, filter on it, order desc.
- [C-15] `sessionsToday` UTC-vs-local day bucketing (`dashboard.ts:82-85`) — accept tz offset arg or rolling 24h.
- [C-12] client-controlled `nowMs` decides expired/consumed in read models (`public.ts:158-165`, `candidatePortal.ts:204-213`) — clamp to server clock.
- [C-09] agent heartbeat rows never reaped (`agentWorker.ts` workerId-per-boot; no TTL cron) — add cron'd batch delete + cap liveness query.
- [C-16] template migration loads all templates in one mutation (`migrations/assessmentTemplatesHorizontal.ts:19-20`) — paged self-rescheduling pattern.
- [C-17] `adminQuery` actor = `identity.subject` vs `tokenIdentifier ?? subject` everywhere else (`lib/customFunctions.ts:80`) — standardize.
- [S-09] dead dual lookup in `computeAssessmentWeightedScore` (`scoring-policy.ts:79-86`) — collapse + warn on unknown dimension.
- [S-11] evidence cleanup caps at 500 rows (`assessmentReports.ts:100-105`) — paginate until empty.
- [S-12] report-chat catch echoes raw provider/zod messages (`route.ts:141-157`) — generic 400 + requestId (rate-limit path already correct).

---

## Phase 3 — Recruiter performance & product polish

### Task B21: Denormalized batch counters + N+1 elimination

- Findings: [P-01], [P-02], verified. Evidence: `screenings.ts:96-98` per-invite gets inside per-batch loop (+2 queries/invite stuck-check) ≈150K reads worst case, runs on EVERY screenings page AND dashboard load; `161-170` ~2 reads × 500 rows per batch-detail open.
- Fix: same counter strategy as B16 (shared abstraction — one rollup module, not two patches); batch-fetch sessions via `by_batch` index; paginate detail candidates.

### Task B22: Split dashboard payload + stop nowMs resubscription

- Findings: [P-03]. Evidence: `dashboard.ts:173-203` three queries each rebuild full payload (~900 docs); `recruiter-dashboard.tsx:37-47` resubscribes every 60s tick; loader discards attention slices.
- Fix: cheap count queries + separate attention query; drop nowMs from reactive args (client-relative rendering or 5-min buckets).

### Task B23: Lazy-load the room shell

- Findings: [P-05]. Evidence: static imports of PreJoin/LiveKitRoom stack in `invite-lobby.tsx:6`, `meeting-shell.tsx:5-17`; only ProcessingSuccess is dynamic today.
- Fix: `next/dynamic ssr:false` for MeetingShell behind view gate (pattern exists at `interview-workspace.tsx:63`).

### Task B24: Marketing sections back to server components

- Findings: [P-04]. Evidence: all five landing sections 'use client' solely for motion entrance animations; SEO-critical route ships hydrated JS for static content.
- Fix: server components + CSS animation utilities (repo precedent: `metric-card-static.tsx`); client island only for interactive demo.

### Task B25: Split god files (after characterization tests)

- Findings: [ARCH-01]. Evidence: `agents/interviewer.ts` 912 lines (runInterviewSession spans ~614-900); `screening-creation-form.tsx` 901 lines; `candidatePortal.ts` 785 lines; `devSeedSpectrum.ts` 1039.
- Fix: extract interviewer config/prompts, budget enforcer, lifecycle helpers along existing seams (lines 262/542); wizard step components. Characterization tests FIRST (Plan A Task 8's calibration suite doubles as this for the scorer).

---

## Phase 4 — Hygiene, tooling, docs

### Task B26: Component consolidation + dead code

- [ARCH-02] unify admin/candidate sidebars (154 vs 144 line near-duplicates) + metric-card variants → `components/workspace/app-sidebar.tsx` with nav/footer slots.
- [ARCH-03] delete unused `getInviteEmailDeliverySummary`, `getDashboardSummary`, `searchCandidates`, `serverPreloadConvexQuery` (confirm no external HTTP callers first given pending cutover #19).
- [DX-01] fix knip: config entries for agents/worker, convex/\*_, scripts/_; resolve `@/lib/env/runtime` alias failure; wire into `bun run check`.

### Task B27: Supply-chain + CI

- [DEPS-02] no vuln scanning works with bun.lock (npm audit silent) — add `bun audit --production` non-blocking initially, blocking on high/critical.
- [DX-02] cache bun installs + Playwright browsers in both CI jobs; concurrency cancel-in-progress.
- [DX-03] make env contract test bidirectional (`INNGEST_EVENT_API_BASE_URL` currently undocumented).
- [DEPS-01] optional majors, small blast radius now: react-table v9 (1 file) → knip v6 → ai v7 LAST w/ codemod (2 modules, tests exist). motion v13 low priority.

### Task B28: Docs truthfulness

- [DOCS-01] repoint `current-findings.md` Important Files (`convex/admin.ts` and `convex/recruiter.ts` don't exist as referenced); remove phantom `KYMA_ENABLE_DEMO_INVITE`.
- [DOCS-02] fix/remove broken README WRITE_UP.md link.

### Task B29: Absorb from Plan A (kept — good ideas not surfaced by my audit)

- Minute metering per org + monthly cap enforcement (A Tasks 10-11): prerequisite for monetization cost control.
- Scoring calibration suite (A Task 8): golden-set regression harness for rubric changes — also serves as characterization tests for B25.
- Persistence-owner consolidation (A Task 2): single writer per speaker segment — complements B19.
- BYOK ciphertext binding review (A Task 14).

---

## Dependency order

```
B1 (trust boundary) ──┐
B2 (secrets) ─────────┤
B3 (dev wipe) ────────┼──► B6 (key splitting builds on B1's key validation)
B4+B5 (template) ─────┴──► B7-B9 (scoring reads templates safely)
B10+B11 (bounded, deduped processing) ──► B16 counters must exist before B21 UI perf work
B19 (transcript index) ──► A-Task2 persistence-owner consolidation (do together)
Calibration suite (A-8) ──► B25 god-file split (characterization first)
```

## Verification gates (every task)

`bun run fmt && bun run lint && bun run typecheck && bun run test` — plus task-specific tests listed inline. Runtime smoke after P0/P1: bootstrap 400-clean, webhook 401 unsigned, report-chat sanitized errors (probes documented above). E2E Playwright smoke after B23/B24.

## Explicit gaps in this audit (not covered — schedule separately)

1. ~~Interview E2E deep code trace~~ **CLOSED 2026-08-21** — manual lead-auditor trace completed; see Task B30 below.
2. ~~Authz matrix / token guessability~~ **CLOSED 2026-08-21** — see Task B31 below.
3. ~~Transcript hot-path load assessment~~ **CLOSED 2026-08-21** (analytical) — see Task B32 below. A live load test remains worthwhile after B19+B32 land.

---

## Phase 5 — Interview reliability deep-trace results (lead-auditor, 2026-08-21)

### Journey verdict (stage-by-stage)

| Stage                  | Verdict            | Biggest caveat                                                                                                                                    |
| ---------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry/Lobby            | WORKS              | device-ID duplicate-media mitigation still partial (known)                                                                                        |
| Bootstrap              | WORKS-WITH-CAVEATS | reuse path exists (`bootstrap.ts:63` existing session → same room); concurrent-create race known (B18)                                            |
| Room connect           | WORKS              | agent-join timeout detection present (`interview-workspace.tsx` AGENT_JOIN_TIMEOUT_MS warn)                                                       |
| Agent interaction      | WORKS-WITH-CAVEATS | welcome has scripted fallback (`interviewer.ts:876-891`) ✅; transient `fetchConfig` failure silently swaps default prompts/persona for BYOK orgs |
| Transcript persistence | BROKEN-IN-CODE     | fire-and-forget writes; agent is sole full-fidelity writer; browser stores only truncated summaries                                               |
| Submit/finalize        | WORKS-WITH-CAVEATS | completionRequestedRef guards double-submit client-side; `requestProcessing` failures swallowed silently                                          |
| Post-submit            | WORKS              | state machine locks invite, processing view renders                                                                                               |

### Survival answers

- **Network blip mid-answer**: SURVIVES — `use-interview-room-events.ts:192-258` handles Reconnecting/Reconnected/interrupted states, persists them, shows rejoin UI on hard disconnect (`handleDisconnected` → prejoin + "Rejoin when ready").
- **Browser refresh mid-interview**: SURVIVES STRUCTURALLY, DEGRADED EXPERIENCE — bootstrap reuses session+room (`bootstrap.ts:99`), redispatch detected (`interviewer.ts:504-517`), BUT the agent starts a brand-new AgentSession: phase resets to warmup, turn counters reset to 0, and the agent re-welcomes instead of resuming mid-conversation.
- **Agent worker crash mid-session**: PARTIAL — webhook/budget-polling safety nets exist (30s duration poll eventually force-finalizes at maxActiveDurationMs), but full-fidelity transcript stops at crash time; client summary events continue.

### Task B30 [INTERVIEW] Fix silent data-loss paths in the agent port

- Evidence: `lib/agent/session-port.ts:66` (`fetchConfig().catch(() => null)` → wrong template/persona silently used, nothing logged or persisted); `session-port.ts:147-158` (`requestProcessing` swallow-and-log — if this fails the interview NEVER processes and nobody is alerted); `agents/interviewer.ts:270,324` (`void port.upsertTranscript(...)` — failed evidence writes leave no trace beyond a warn).
- Impact: worst case is a completed interview with zero report and zero operator signal — the exact "predictable behavior under failure" priority AGENTS.md demands.
- Fix sketch: (1) `fetchConfig` failure must throw or persist an `agent-config-fetch-failed` event and abort rather than silently defaulting; (2) `requestProcessing` gets bounded retries (3× backoff) then a loud failure event + reaper visibility; (3) transcript upserts get a small in-memory retry queue flushed on interval/shutdown callback. Effort M, Risk LOW-MED, Confidence HIGH.

### Task B31 [INTERVIEW] Redispatch conversational continuity

- Evidence: `interviewer.ts:663-670` fresh userData on every job (counters/phase reset); welcome regenerated unconditionally at `:865-875`.
- Impact: refresh/rejoin candidates hear the full welcome again and must re-trigger readiness; turn budgets silently reset (weak integrity smell).
- Fix sketch: when `isRedispatchState`, skip welcome, seed counters from server-side counts (query transcriptSegments), start phase at 'screening'. Effort S-M, Confidence HIGH.

### Authz matrix result (Task closed)

- Invite tokens: name prefix + `crypto.randomUUID()` ≈122-bit entropy (`convex/recruiter/screenings.ts:20-24`), never stored in audit metadata (:413) — GUESSABILITY OK.
- Single-use enforcement: server-side invite lock verified in tests + finalize transitions — OK.
- Org boundaries: org-ownership assertions on recruiter reads/writes confirmed by backend audit — OK.
- Residual risks tracked elsewhere: B1 (client source trust), B3 (dev wipe), B6 (shared static key, non-timing-safe compare).

### Task B32 [PERF] Transcript hot path: partial-event write amplification

- Evidence: `interviewer.ts:271` uses `` segmentId: `candidate:${event.createdAt}` `` — a fresh timestamp per STT partial ⇒ (MED confidence on LiveKit createdAt semantics, HIGH on code shape) every partial misses the `(sessionId, segmentId)` index ⇒ triggers the C-08 fallback `.collect()` full-session scan AND inserts a new row per partial.
- Impact: per spoken answer: N partials → N rows + O(total²) scanned docs; with 120 writes/min guidance this compounds into transaction read-limit failures mid-interview exactly as sessions grow. Same mechanism likely applies to ConversationItemAdded ids (those look stable — lower risk).
- Fix sketch: derive segmentId from the STT segment's stable id when available (browser hook already receives `segment.id` — pass it through metadata), else coalesce partials by speaker+active window; land together with B19's index fix. Add a load test: 10 concurrent rooms × 15-min interviews asserting flat read latency. Effort M, Risk MED (touches live write path), Confidence MED-HIGH.

## Comparison vs Plan A (`.plans/2026-08-21-audit-remediation.md`)

| Axis                 | Plan A (existing, 16 tasks)                                                                                                                                                | Plan B (this, 29 tasks)           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Trust-boundary holes | Misses B1 entirely (worst finding)                                                                                                                                         | B1 first                          |
| Data loss            | Misses B4 template wipe                                                                                                                                                    | B4                                |
| Compliance           | Misses B15 GDPR breakage                                                                                                                                                   | B15                               |
| Billing integrity    | Misses B6                                                                                                                                                                  | B6                                |
| Scale/quota bugs     | Misses B16 quota bypass                                                                                                                                                    | B16                               |
| Recruiter perf       | Not covered                                                                                                                                                                | B21-B22                           |
| Scoring depth        | DEEPER: rubric resolver redesign (Tasks 4-6), outcome derivation (7), calibration (8), UI gate alignment (9)                                                               | Lighter: B7-B9 are narrower fixes |
| Cost control         | METERING (Tasks 10-11) — absent from B                                                                                                                                     | Absorbed as B29                   |
| Hardening overlap    | Dev-seed gate (T1), quadratic lookup (T3), model arithmetic (T7≈B8), bounded scoring call (T12≈B10), info leaks (T13≈S-12/S-07), secret guards (T14≈B2/B6), docs (T16≈B28) | Same targets                      |
| Prioritization order | Scoring-engine-first (phase 3 is its bulk)                                                                                                                                 | Security/data-integrity-first     |

**Ranking**: Plan A wins on scoring-engine _depth_ and monetization-readiness (metering). Plan B wins on _coverage_ (it contains every critical hole Plan A misses) and on ordering (trust boundaries before engine polish). **Recommended execution: Plan B as skeleton/phasing, grafting A Tasks 2/4-9/10-11 in as B29 specifies.** Neither plan alone is sufficient; merged coverage is.
