# Audit Remediation — Merged Plan (authoritative)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every verified finding from the two 2026-08-21 audits, ordered so trust-boundary and data-loss holes are shut before any engine or UI work builds on top of them.

**Architecture:** Six phases. Phase 0 closes holes that let an attacker or an ordinary recruiter destroy data — these gate everything else. Phase 1 makes post-call processing idempotent and bounded. Phase 2 rebuilds scoring on one shared rubric resolver; it is deliberately _after_ M2, because a template save currently wipes `rubricConfig` and scoring work on a rubric that does not survive a rename is wasted. Phases 3-5 cover transcript integrity, metering, compliance, and the perf/hygiene tail.

**Tech Stack:** Next.js 16 (App Router), Convex, Clerk, LiveKit Agents 1.4, AI SDK v6, Vitest, TypeScript, Bun.

**Supersedes:** `.plans/2026-08-21-audit-remediation.md` (Plan A) and `.plans/2026-08-21-audit-remediation-plan-b.md` (Plan B). Both remain in the repo as source material; **this file is the one to execute.** Where a task says "full code in Plan A Task N", that code block is correct and was written against verified line numbers — copy it rather than re-deriving.

## Global Constraints

- Package manager is `bun`. Never `npm`/`yarn`.
- Run `bun run fmt` before `bun run lint`, `bun run typecheck` or committing.
- Tests are Vitest: `bun run test`. Never plain `bun test`.
- Verification gate for every task: `bun run fmt && bun run lint && bun run typecheck && bun run test`.
- Read `convex/_generated/ai/guidelines.md` before editing anything under `convex/`.
- Anything not meant for browser callers must be `internalQuery`/`internalMutation`/`internalAction`.
- Conventional commits (`commitlint` runs on commit-msg).
- **Convex patch semantics:** `ctx.db.patch(id, { field: undefined })` **deletes** the field. Every optional field in every patch must use conditional spread. This is the root cause of M2 and M9 and must be checked in any patch this plan touches.

---

## Provenance and verification status

Every finding below was re-read in source by me before inclusion. I did not take either audit's word for it — one in five of Plan B's headline claims was wrong.

**Verified real (execute these):**

| ID      | Source         | Claim                                                                                  | Verified at                                                                            |
| ------- | -------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| M1      | B-B1           | Candidate-controlled `source` bypasses state ownership                                 | `convex/interviews/sessionEvents.ts:64`, `lib/interview/session-state-ownership.ts:31` |
| M2      | B-B4           | Template save wipes prompts + rubric                                                   | `convex/recruiter/templates.ts:268-273`                                                |
| M3      | A-T1 + B-B3    | Dev seed/wipe reachable in production                                                  | `convex/devSeed.ts:38-49`, `lib/env/shared.ts:6-8`                                     |
| M4      | B-B16 (+new)   | Oldest-first sampling: quota bypass **and** recent batches invisible                   | `convex/recruiter/screenings.ts:28,79,250`                                             |
| M5      | B-B11          | Processing recovery re-scores and can downgrade reports                                | `processingReaper.ts:139-143`, `process-session.ts:99`, `assessmentReports.ts:76-95`   |
| M6      | B-B6           | Billing event for unmirrored org stranded; org sync wipes slug/imageUrl                | `convex/billing.ts:118-122`, `convex/orgs.ts:43-48`                                    |
| M7-M12  | A-T4..T9, B-B7 | Scoring engine: resolver, derivation, gates, coverage, calibration, UI                 | see Phase 2                                                                            |
| M13     | A-T2           | Every candidate turn stored twice                                                      | `agents/interviewer.ts:269,298`                                                        |
| M14     | A-T3 + B-B19   | Quadratic transcript lookup                                                            | `convex/helpers/transcriptSegments.ts:66-78`                                           |
| M15-M16 | A-T10, A-T11   | No usage metering; no minutes cap                                                      | `convex/helpers/interviewSession.ts:228`                                               |
| M17     | A-T12 + B-B10  | Unbounded scoring call                                                                 | `lib/assessment/llm-report.ts:365`                                                     |
| M18     | B-B15          | GDPR erasure skips sessions and orphans PII                                            | `convex/compliance.ts:233-245,253`                                                     |
| M19     | B-B17          | Completed reports flagged as stale sessions                                            | `convex/recruiter/dashboard.ts:73,149`                                                 |
| M20     | B-B21          | N+1 invite reads inside per-batch loop                                                 | `convex/recruiter/screenings.ts:82-98`                                                 |
| M21     | A-T13          | Internal errors, invite token in room name, BYOK summary leak                          | `bootstrap/route.ts:173`, `interviews/bootstrap.ts:162`, `:12-46`                      |
| M22     | A-T14          | Timing-unsafe compare, duplicated guard, unbound BYOK ciphertext, dead helper          | `convex/orgs.ts:13`, `encryption.ts:53`, `lib/saas/plans.ts:41-78`                     |
| M23     | A-T15/16       | Dashboard has no charts; docs drifted                                                  | `app/(admin)/recruiter/page.tsx`, `TODO.md`                                            |
| M6b     | B-B30          | Agent silently runs on default prompts; failed processing request loses the interview  | `lib/agent/session-port.ts:66,151`                                                     |
| M13\*   | B-B32          | STT partials each mint a new segment id → N rows per answer, drives the quadratic scan | `agents/interviewer.ts:271`                                                            |
| M23b    | B-B31          | Redispatch resets phase and turn counters; budget evadable by refreshing               | `agents/interviewer.ts:664-669,866`                                                    |

**Rejected — do not execute:**

| ID   | Claim                                                       | Why rejected                                                                                                                                                                                                                                                                                                           |
| ---- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-B2 | Committed Clerk secret needs rotation + git history rewrite | The value is literally `sk_test_ci_placeholder`. `git log --all -p -- .env.convex-ci` shows only that placeholder was ever committed. The prescribed remedy (`git filter-repo`/BFG) rewrites shared history destructively for a non-secret. **Do not run.** Optional hygiene only: rename to `.env.convex-ci.example`. |

**Inherited but NOT verified — re-verify before executing:**

B-B5 (rubric weight validation), B-B12 (chat citation validation), B-B13 (candidate-facing summary leak — also a product decision), B-B14 (truncation asymmetry), B-B18 (bootstrap double-session race), B-B20 (the nine-item small-correctness batch C-09/12/13/14/15/16/17, S-09/11/12), B-B22..B-B28 (perf, god-file splits, deps, CI, docs). These are listed in Phase 5 with a verification step as their first action. Do not implement any of them on the audit's say-so.

---

## Phase 0 — Trust boundary and data loss

### Task M1: Stop trusting client-supplied `source`

**Files:**

- Modify: `convex/interviews/sessionEvents.ts:19-68`
- Test: `convex/sessionEvents.trust.test.ts` (create)

**Interfaces:**

- Consumes: `hasTrustedProcessingKey` from `convex/helpers/processingAuth.ts:53`
- Produces: no new exports; `appendSessionEvent` keeps its arg shape (`source` stays accepted, but is ignored on the invite path).

**The defect, verified:** `appendSessionEvent` is a public mutation with two auth paths. On the invite-token path the caller is an ordinary candidate, yet line 64 forwards `source: source ?? 'candidate-client'` straight from args into `insertSessionEventWithTransition`. `isSessionStateWriteAllowed` (`lib/interview/session-state-ownership.ts:31`) returns `true` for any source in `{'livekit-webhook','livekit-agent','assessment-pipeline'}`. So a candidate posting `{ inviteToken, sessionId, source: 'assessment-pipeline', state: 'processing' }` forces the session into `processing` outside `finalizeInterviewForProcessing` — invite consumed, eligibility burned, no assessment ever enqueued. The entire ownership model is enforced on an attacker-supplied string.

- [ ] **Step 1: Write the failing test**

Create `convex/sessionEvents.trust.test.ts`:

```ts
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'

import { api } from './_generated/api'
import schema from './schema'
import { seedInviteSession } from './lib/testSeed'

const modules = import.meta.glob('./**/*.ts')

describe('appendSessionEvent trust boundary', () => {
  test('a candidate cannot claim a privileged source to force processing', async () => {
    const t = convexTest(schema, modules)
    const { sessionId, inviteToken } = await seedInviteSession(t)

    await t.mutation(api.interviews.sessionEvents.appendSessionEvent, {
      inviteToken,
      sessionId,
      type: 'candidate-submitted',
      detail: 'attempt to self-finalize',
      source: 'assessment-pipeline',
      state: 'processing',
    })

    const session = await t.run(async (ctx) => ctx.db.get(sessionId))
    expect(session?.state).not.toBe('processing')
  })

  test('the event is still recorded, attributed to the candidate', async () => {
    const t = convexTest(schema, modules)
    const { sessionId, inviteToken } = await seedInviteSession(t)

    await t.mutation(api.interviews.sessionEvents.appendSessionEvent, {
      inviteToken,
      sessionId,
      type: 'candidate-submitted',
      detail: 'attempt to self-finalize',
      source: 'assessment-pipeline',
      state: 'processing',
    })

    const events = await t.run(async (ctx) =>
      ctx.db
        .query('sessionEvents')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .collect()
    )

    expect(events.at(-1)?.source).toBe('candidate-client')
  })

  test('a trusted caller with the processing key keeps its declared source', async () => {
    const t = convexTest(schema, modules)
    const { sessionId } = await seedInviteSession(t)

    await t.mutation(api.interviews.sessionEvents.appendSessionEvent, {
      processingKey: '__dev_preview__',
      sessionId,
      type: 'processing-requested',
      detail: 'pipeline finalize',
      source: 'assessment-pipeline',
    })

    const events = await t.run(async (ctx) =>
      ctx.db
        .query('sessionEvents')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .collect()
    )

    expect(events.at(-1)?.source).toBe('assessment-pipeline')
  })
})
```

If `convex/lib/testSeed.ts` does not export a helper matching `seedInviteSession`, read that file and use whatever seeding helper it does export, or inline the inserts following the pattern in `convex/bootstrap.test.ts`.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test convex/sessionEvents.trust.test.ts`
Expected: the first test FAILS — session state is `processing`. That failure is the vulnerability.

- [ ] **Step 3: Bind source to the authenticated identity**

In `convex/interviews/sessionEvents.ts`, replace the handler body from `const session =` through the return with:

```ts
const isTrustedCaller = hasTrustedProcessingKey(processingKey)
const session = isTrustedCaller
  ? await ctx.db.get(sessionId)
  : (await requireInviteSessionWriteAccess(ctx, sessionId, inviteToken ?? ''))
      .session

if (!session) {
  throw new ConvexError('Interview session not found.')
}

await assertSessionEventThrottle(ctx, sessionId)

// `source` decides whether a state write is permitted, so it must reflect
// who the caller actually is - never what they claim to be. Only a caller
// holding the processing key may declare a privileged source.
const resolvedSource = isTrustedCaller
  ? (source ?? 'assessment-pipeline')
  : 'candidate-client'

return await insertSessionEventWithTransition(ctx, {
  session,
  sessionId,
  type,
  detail,
  source: resolvedSource,
  dedupeKey,
  state: state as InterviewSessionState | undefined,
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test convex/sessionEvents.trust.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Confirm no legitimate caller regressed**

Run: `grep -rn "appendSessionEvent" app lib agents convex --include=*.ts`

Every call site must either pass `processingKey` (agent, pipeline, webhook) or be a candidate-client call that does not depend on setting a privileged source. If a browser call site passes `source`, it was relying on the hole — remove the argument.

- [ ] **Step 6: Audit the sibling entry points**

Run: `grep -rn "insertSessionEventWithTransition" convex`

Every other caller must derive `source` server-side, never from args. Fix any that do not, following the same pattern.

- [ ] **Step 7: Full gate and commit**

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test
git add convex/interviews/sessionEvents.ts convex/sessionEvents.trust.test.ts
git commit -m "fix(security): derive session-event source from caller identity, not client input"
```

### Task M2: Stop template saves from wiping prompts and rubric

**Files:**

- Modify: `convex/recruiter/templates.ts:246-280`
- Test: `convex/templates.patch.test.ts` (create)

**The defect, verified:** the patch at `templates.ts:256-267` correctly guards `name`, `jobFamily`, `simulationMode`, `targetDurationMinutes`, `allowsResume`, `interviewStyleMode` with conditional spread. Lines 268-273 then set `systemPrompt`, `childPersonaPrompt`, `simulationPersonaPrompt`, `wrapUpPrompt`, `rubricConfig`, `modelOverrides` **unconditionally**. Convex deletes any field patched to `undefined`. A recruiter who edits only the template name therefore erases the system prompt and the entire rubric for every subsequent interview — and `rubricVersion` bumps unconditionally at line 249, so `assessmentTemplateVersions` snapshots the destruction as if it were an intentional edit.

This gates Phase 2: building a rubric resolver on a `rubricConfig` that a rename silently deletes is wasted work.

- [ ] **Step 1: Write the failing test**

Create `convex/templates.patch.test.ts`:

```ts
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'

import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

describe('updateAssessmentTemplate patch semantics', () => {
  test('renaming a template preserves prompts, rubric and model overrides', async () => {
    const t = convexTest(schema, modules)

    const templateId = await t.run(async (ctx) =>
      ctx.db.insert('assessmentTemplates', {
        orgId: 'org_test',
        name: 'Original',
        systemPrompt: 'You are a careful interviewer.',
        wrapUpPrompt: 'Thank the candidate.',
        rubricConfig: {
          dimensions: [{ name: 'clarity', weight: 2, isHardGate: true }],
        },
        rubricVersion: 'v1',
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
      } as never)
    )

    // Simulate a name-only save: every other optional arg is undefined.
    await t.run(async (ctx) => {
      const template = await ctx.db.get(templateId)
      if (!template) throw new Error('missing')
      await ctx.db.patch(templateId, {
        ...(('Renamed' as string).trim() ? { name: 'Renamed' } : {}),
      })
    })

    const after = await t.run(async (ctx) => ctx.db.get(templateId))

    expect(after?.name).toBe('Renamed')
    expect(after?.systemPrompt).toBe('You are a careful interviewer.')
    expect(after?.rubricConfig?.dimensions).toHaveLength(1)
  })
})
```

This test asserts the _intended_ semantics directly. After Step 3, replace its body with a real call to the exported mutation via `t.mutation(...)` with only `{ templateId, name: 'Renamed' }` supplied, so it exercises the production path rather than a simulation. Read `convex/recruiter/templates.ts` for the exact mutation name and required auth context (it uses a `recruiterWriteMutation` custom function, so the test needs an identity — follow the pattern in `convex/reviews.auth.test.ts`).

- [ ] **Step 2: Run test to verify current behaviour**

Run: `bun run test convex/templates.patch.test.ts`
Expected: after converting to the real mutation call in Step 1's note, this FAILS — `systemPrompt` and `rubricConfig` come back `undefined`.

- [ ] **Step 3: Guard every optional field**

In `convex/recruiter/templates.ts`, replace the six unconditional lines in the patch (currently `systemPrompt:` through `modelOverrides:`) with:

```ts
      ...(args.systemPrompt !== undefined
        ? { systemPrompt: args.systemPrompt }
        : {}),
      ...(simulationPersonaPrompt !== undefined
        ? {
            childPersonaPrompt: simulationPersonaPrompt,
            simulationPersonaPrompt,
          }
        : {}),
      ...(args.wrapUpPrompt !== undefined
        ? { wrapUpPrompt: args.wrapUpPrompt }
        : {}),
      ...(args.rubricConfig !== undefined
        ? { rubricConfig: args.rubricConfig }
        : {}),
      ...(args.modelOverrides !== undefined
        ? { modelOverrides: args.modelOverrides }
        : {}),
```

- [ ] **Step 4: Bump the rubric version only when the rubric changed**

Still in the same handler, replace the unconditional `rubricVersion: nextRubricVersion` in the patch with:

```ts
      ...(args.rubricConfig !== undefined
        ? { rubricVersion: nextRubricVersion }
        : {}),
```

and make the `assessmentTemplateVersions` insert below conditional on the same predicate, so a name-only save does not create a phantom rubric version. Read the insert block (starting around line 277) and wrap it:

```ts
if (args.rubricConfig !== undefined) {
  await ctx.db.insert('assessmentTemplateVersions', {
    // ...existing fields unchanged
  })
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun run test convex/templates.patch.test.ts`
Expected: PASS.

- [ ] **Step 6: Sweep for the same bug elsewhere**

Run: `grep -rn "ctx.db.patch" convex --include=*.ts | wc -l` then review each hit.

Any patch that sets an optional field without a conditional spread has this bug. Known instance already scheduled: `convex/orgs.ts:43-48` (Task M6). Record any others found as new tasks rather than fixing them inline here.

- [ ] **Step 7: Full gate and commit**

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test
git add convex/recruiter/templates.ts convex/templates.patch.test.ts
git commit -m "fix(templates): stop name-only saves from erasing prompts and rubric"
```

### Task M3: Gate dev seeding and make the actions internal

Full task body — steps, code, env docs — is **Plan A Task 1**, verified and unchanged. Execute it exactly as written there, with one addition from Plan B:

- [ ] **Steps 1-9: Execute Plan A Task 1 verbatim** (`.plans/2026-08-21-audit-remediation.md`, "Task 1: Gate dev seeding on deployment mode and identity")

- [ ] **Step 10: Scope or document the global wipe blast radius**

`seedDevDataForActiveOrg` authenticates the caller but `clearTableChunk` clears tables globally, not per-org. Either scope the clear to the caller's `orgId`, or add an explicit comment at the top of `convex/devSeed.ts` documenting that this wipes all orgs on the deployment. Pick scoping if the seed data model allows it.

- [ ] **Step 11: Commit**

```bash
git add convex/devSeed.ts
git commit -m "fix(devseed): scope or document global table clear blast radius"
```

### Task M4: Fix oldest-first sampling

**Files:**

- Modify: `convex/recruiter/screenings.ts:75-105` (list), `:246-275` (quota)
- Modify: `convex/schema.ts` (add `by_org_id_and_created_at` index on `screeningBatches` and `candidateInvites`)
- Test: `convex/screenings.sampling.test.ts` (create)

**The defect, verified:** `MAX_SCREENING_BATCHES = 100` (line 28). Both `.take(100)` calls run on the `by_org_id` index, which returns **ascending** creation order — the oldest 100 rows. Two consequences:

1. **Quota bypass** (Plan B's B16): line 250 takes the oldest 100 batches then filters `createdAt >= thirtyDaysAgo`. For any org with more than 100 lifetime batches every sampled row is older than 30 days, so `batchesLast30Days` is 0 and the per-30-day quota never fires.
2. **Recent batches invisible** (not in either audit): line 79 takes the oldest 100 then `.toSorted()` descending _in memory_. A mature org's screenings list shows its 100 oldest batches sorted newest-first — the recruiter never sees anything they created recently. This is the more user-visible half and is the reason to fix ordering rather than just raising the cap.

- [ ] **Step 1: Add descending-capable indexes**

In `convex/schema.ts`, add to the `screeningBatches` table definition:

```ts
    .index('by_org_id_and_created_at', ['orgId', 'createdAt'])
```

and to `candidateInvites`:

```ts
    .index('by_org_id_and_created_at', ['orgId', 'createdAt'])
```

- [ ] **Step 2: Write the failing test**

Create `convex/screenings.sampling.test.ts` asserting that with 120 seeded batches — 110 older than 30 days, 10 created today — the quota check counts 10, not 0, and the list query returns the 10 recent ones. Seed via `t.run` direct inserts. Follow the identity/auth setup pattern in `convex/screenings.policy.test.ts`, which already exercises these mutations.

- [ ] **Step 3: Run test to verify it fails**

Run: `bun run test convex/screenings.sampling.test.ts`
Expected: FAIL — count is 0 and the list returns old batches.

- [ ] **Step 4: Query newest-first**

Replace both `.take(MAX_SCREENING_BATCHES)` calls with descending order on the new index:

```ts
      .withIndex('by_org_id_and_created_at', (q) => q.eq('orgId', orgId))
      .order('desc')
      .take(MAX_SCREENING_BATCHES)
```

For the quota check at line 250, prefer a bounded range over a sample — it is exact rather than approximate:

```ts
const recentBatches = await ctx.db
  .query('screeningBatches')
  .withIndex('by_org_id_and_created_at', (q) =>
    q.eq('orgId', orgId).gte('createdAt', thirtyDaysAgo)
  )
  .take(quotas.maxBatchesPer30Days + 1)
const batchesLast30Days = recentBatches.length
```

Move the `thirtyDaysAgo` declaration above this block. With the range query the in-memory `.filter()` becomes redundant — delete it.

- [ ] **Step 5: Apply the same fix to the active-invite scan**

Line 268's `.take(Math.min(quotas.maxActiveInvites + 50, 5_000))` has the same oldest-first problem. Use the new invite index with `.order('desc')`, and note in a comment that this remains a bounded approximation until denormalized counters land (Task M20).

- [ ] **Step 6: Run tests and regenerate**

```bash
bun run test convex/
bun run convex:once
```

Expected: PASS; new indexes appear in the generated schema.

- [ ] **Step 7: Full gate and commit**

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test
git add convex/schema.ts convex/recruiter/screenings.ts convex/screenings.sampling.test.ts convex/_generated
git commit -m "fix(screenings): sample newest-first so quotas fire and recent batches are visible"
```

---

## Phase 1 — Processing integrity

### Task M5: Make processing recovery idempotent

**Files:**

- Modify: `lib/assessment/process-session.ts:99-105`
- Modify: `convex/helpers/assessmentReports.ts:76-95`
- Modify: `convex/processingReaper.ts:139-143`
- Test: extend `convex/processingReaper.test.ts`

**The defect, verified — three parts:**

1. `process-session.ts:99` skips only on `status === 'completed'`. A report already at `manual_review` is fully re-scored by a reaper retry: another LLM call, another bill, and a human-routed review can be flipped back to `completed`.
2. `assessmentReports.ts:76-95` builds `reportFields` with an unconditional `status`, so a straggler calling `markAssessmentFailed` after a successful run patches `completed` → `failed`.
3. `processingReaper.ts:141` forces a unique `-reap-${now}` event id every tick, bypassing Inngest dedupe. Bounded by `GIVE_UP_AFTER_MS` (1h) so it is not unbounded — Plan B overstated this — but it still permits repeated concurrent runs of the same session within that window.

- [ ] **Step 1: Write the failing tests**

Extend `convex/processingReaper.test.ts` with three cases: a `manual_review` report is not re-scored; a `failed` write does not overwrite a `completed` report; two reaper ticks inside the retry window enqueue once.

- [ ] **Step 2: Run to verify they fail**

Run: `bun run test convex/processingReaper.test.ts`

- [ ] **Step 3: Treat manual_review as terminal**

In `lib/assessment/process-session.ts`, change the guard at line 99:

```ts
if (
  detail.report?.status === 'completed' ||
  detail.report?.status === 'manual_review'
) {
  logger.info({
    event: 'assessment.processing.skip',
    detail: `Report already ${detail.report.status}; skipping duplicate processing.`,
  })
  return null
}
```

This matches `markAssessmentProcessing` at `process-session.ts:31-39`, which already treats both as terminal — the two guards currently disagree.

- [ ] **Step 4: Refuse report downgrades**

In `convex/helpers/assessmentReports.ts`, before the patch, add:

```ts
const TERMINAL_STATUSES = new Set(['completed', 'manual_review'])
const wouldDowngrade =
  existingReport &&
  TERMINAL_STATUSES.has(existingReport.status) &&
  args.status === 'failed'

if (wouldDowngrade) {
  return existingReport._id
}
```

- [ ] **Step 5: Suppress repeat re-enqueues**

In `convex/processingReaper.ts`, bucket the forced event id so ticks inside the same retry window collapse:

```ts
const retryBucket = Math.floor(now / STUCK_AFTER_MS)
await ctx.scheduler.runAfter(0, internal.processingPipeline.run, {
  sessionId: session._id,
  forceEventId: `${interviewProcessingEventId(`${session._id}`)}-reap-${retryBucket}`,
})
```

- [ ] **Step 6: Run tests, full gate, commit**

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test
git add lib/assessment/process-session.ts convex/helpers/assessmentReports.ts convex/processingReaper.ts convex/processingReaper.test.ts
git commit -m "fix(processing): make recovery idempotent and refuse report downgrades"
```

### Task M6: Fix webhook sync data loss

**Files:**

- Modify: `convex/orgs.ts:43-48`
- Modify: `convex/billing.ts:118-122`
- Test: `convex/orgSync.test.ts` (create)

**The defect, verified:** `orgs.ts:44` merges `name` correctly (`args.name ?? existing.name`) but lines 45-46 set `slug` and `imageUrl` unconditionally — a partial Clerk payload wipes them. Separately, `billing.ts:118-122` records an event for an unmirrored org into `billingWebhookEvents` _before_ discovering the org is missing, so the dedupe check at line 100 permanently suppresses any retry. A subscription webhook that arrives before Clerk's `organization.created` strands that org on the free plan indefinitely.

- [ ] **Step 1: Write the failing tests**

Create `convex/orgSync.test.ts` with: a partial org sync preserves existing slug/imageUrl; a billing event for an unknown org is _not_ recorded as processed, so a later replay applies it.

- [ ] **Step 2: Run to verify they fail**

Run: `bun run test convex/orgSync.test.ts`

- [ ] **Step 3: Merge instead of overwrite**

In `convex/orgs.ts`, replace the patch at lines 43-48:

```ts
await ctx.db.patch(existing._id, {
  name: args.name ?? existing.name,
  ...(args.slug !== undefined ? { slug: args.slug } : {}),
  ...(args.imageUrl !== undefined ? { imageUrl: args.imageUrl } : {}),
  updatedAt: now,
})
```

- [ ] **Step 4: Let unknown-org billing events retry**

In `convex/billing.ts`, move the `billingWebhookEvents` insert to _after_ the org lookup succeeds, and return without recording when the org is missing:

```ts
const org = await ctx.db
  .query('organizations')
  .withIndex('by_clerk_org_id', (q) => q.eq('clerkOrgId', args.clerkOrgId))
  .unique()

if (!org) {
  // Do NOT record the event: the org is not mirrored yet, and recording it
  // would make the dedupe check suppress the retry permanently. Dodo
  // redelivers, and the org sync that follows will let it apply.
  return { applied: false, orgId: null }
}

await ctx.db.insert('billingWebhookEvents', {
  eventKey: args.eventKey,
  eventType: args.eventType,
  clerkOrgId: args.clerkOrgId,
  subscriptionId: args.subscriptionId,
  processedAt: Date.now(),
})
```

Verify the webhook route returns a non-2xx for `applied: false` when the org is unknown, so the provider actually redelivers. If it returns 200 unconditionally, change that too — otherwise this fix is inert.

- [ ] **Step 5: Run tests, full gate, commit**

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test
git add convex/orgs.ts convex/billing.ts convex/orgSync.test.ts
git commit -m "fix(sync): preserve org fields on partial payloads and retry unmirrored billing events"
```

### Task M6b: Stop the agent losing work silently

**Files:**

- Modify: `lib/agent/session-port.ts:58-67` (`fetchConfig`), `:141-160` (`requestProcessing`)
- Test: `lib/agent/session-port.test.ts` (create)

**The defect, verified:** every write in the agent's Convex port is swallow-and-log, which is correct for best-effort telemetry and wrong for the two calls that carry the interview itself.

1. `fetchConfig()` ends in `.catch(() => null)` (`session-port.ts:66`). A transient Convex failure returns `null`, and the caller falls back to default prompts and persona. For a BYOK org that means the interview silently runs on the wrong template with the wrong model — no event, no log, no operator signal.
2. `requestProcessing()` catches and warns (`:151-158`). If this fails, the interview is **never processed**: no report, no failure state, nothing for the reaper to find, and the candidate sees a successful submission. This is the single worst failure mode in the codebase — a completed interview that silently produces nothing.

The repo's stated priorities put predictable behaviour under failure first; these two are the clearest violations of that.

- [ ] **Step 1: Write the failing tests** — a failing `fetchConfig` must not resolve to `null` silently; a failing `requestProcessing` must retry and then surface a durable failure signal.

- [ ] **Step 2: Make config fetch loud**

In `lib/agent/session-port.ts`, replace the `.catch(() => null)` on `fetchConfig` with a catch that records an event and rethrows, so `startSession` aborts rather than interviewing on defaults:

```ts
return await fetchQuery(api.agentConfig.getInterviewAgentConfig, {
  sessionId: id,
  processingKey,
}).catch((error) => {
  logger.error({
    event: 'agent.config.fetch.failed',
    detail:
      'Unable to load interview config; refusing to run on default prompts.',
    sessionId,
    error,
  })
  throw error instanceof Error
    ? error
    : new Error('Interview config fetch failed.')
})
```

Then confirm the caller at `agents/interviewer.ts:443` treats a throw as a session-abort path rather than crashing the worker — it already has a `agent.session.failed` branch at `:489`.

- [ ] **Step 3: Give processing requests bounded retries**

Replace the `requestProcessing` body with three attempts and exponential backoff, then a durable failure event:

```ts
    async requestProcessing(detail) {
      if (!id) {
        return
      }

      const delaysMs = [0, 1_000, 4_000]
      let lastError: unknown

      for (const delayMs of delaysMs) {
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }

        try {
          await fetchMutation(api.agentConfig.requestInterviewProcessing, {
            processingKey,
            sessionId: id,
            detail,
          })
          return
        } catch (error) {
          lastError = error
        }
      }

      // Every retry failed. The interview would otherwise complete with no
      // report and no signal, so record a durable event the reaper and the
      // health panel can both see.
      logger.error({
        event: 'agent.processing.request.exhausted',
        detail: 'Processing request failed after retries.',
        sessionId,
        error: lastError,
      })

      await this.appendEvent(
        'processing-request-failed',
        'Agent could not request post-call processing after 3 attempts.'
      ).catch(() => undefined)
    },
```

Note the port is an object literal — if `this` binding is awkward, hoist `appendEvent` into a local `const` above the returned object and call that from both places.

- [ ] **Step 4: Confirm the reaper sees it**

`convex/processingReaper.ts` sweeps sessions stuck outside terminal states. Verify a session that never left `live` because processing was never requested is caught by `reapStaleSessions` (`:171-210`, gated on `STALE_SESSION_MS`). If it is not, that is the gap this task exists to close — extend the reaper.

- [ ] **Step 5: Full gate and commit**

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test
git add lib/agent/session-port.ts lib/agent/session-port.test.ts agents/interviewer.ts
git commit -m "fix(agent): fail loudly on config fetch and retry processing requests"
```

---

## Phase 2 — Scoring engine

Runs **after** M2. Full task bodies with complete test and implementation code are in Plan A; execute them in this order:

- [ ] **Task M7 — shared rubric resolver.** Plan A Task 4 verbatim (creates `lib/rubric/resolve-rubric.ts`).
- [ ] **Task M8 — outcome derivation.** Plan A Task 5 verbatim (adds `deriveAssessmentOutcome`, widens `isHardGateTriggered`).
- [ ] **Task M9 — deterministic engine uses the resolver.** Plan A Task 6 verbatim (removes the dead `_isHardGate` parameter, honours template gates).
- [ ] **Task M10 — stop trusting model arithmetic.** Plan A Task 7 verbatim (recomputes weighted score, gate, recommendation).
- [ ] **Task M11 — calibration suite.** Plan A Task 8 verbatim. Also serves as the characterization net required before any god-file split in Phase 5.
- [ ] **Task M12 — review UI reads the shared resolver.** Plan A Task 9 verbatim (plus tooltip and readable radius scale).

### Task M12b: Enforce rubric dimension coverage (from B-B7)

**Files:**

- Modify: `lib/assessment/llm-report.ts` (in `buildHybridAssessmentReport`)
- Test: extend `lib/assessment/llm-report.test.ts`

**Verified:** `llm-report-schema.ts:80` requires `.min(1)` dimension scores, not full coverage, and nothing diffs the returned set against `resolveRubricDimensions`. A model returning 2 of 9 dimensions produces a report scored on a fraction of the rubric and marked `completed`. Duplicates additionally cause React key collisions in the chart components.

- [ ] **Step 1: Write the failing test** — a model report covering 1 of 2 configured dimensions must land in `manual_review`; a report with a duplicated dimension must too.

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Add the coverage check** in `buildHybridAssessmentReport`, after `dimensions` is resolved (Plan A Task 7 Step 4 introduces that variable):

```ts
const returnedNames = sanitizedReport.dimensionScores.map(
  (item) => item.dimension
)
const expectedNames = new Set(dimensions.map((item) => item.name))
const hasDuplicates = new Set(returnedNames).size !== returnedNames.length
const missesDimension = [...expectedNames].some(
  (name) => !returnedNames.includes(name)
)
const incompleteCoverage = hasDuplicates || missesDimension
```

Add `incompleteCoverage ||` to the `needsManualReview` expression.

- [ ] **Step 4: Run tests, full gate, commit.**

```bash
git commit -m "fix(scoring): route incomplete rubric coverage to manual review"
```

---

## Phase 3 — Transcript, metering, bounded calls

> **Read this before starting M13.** Plan B's later B32 finding changes the shape of this phase. `agents/interviewer.ts:271` keys candidate segments as `` `candidate:${event.createdAt}` ``, and `event.createdAt` is a **fresh timestamp on every STT partial** — verified in source. So every partial produces a distinct `sourceSegmentId`, misses the `by_session_and_source_segment_id` index, falls through to the `.collect()` fallback, and **inserts a new row**.
>
> This reframes both findings. The "stored twice" defect (M13) is really _N+1 rows per spoken answer_ — one per partial plus the `ConversationItemAdded` copy. And the quadratic scan (M14) is not an independent inefficiency: the unstable segment id is what _drives_ the fallback on the hot path. Fixing the lookup without fixing the id leaves N rows per answer; fixing the id without the lookup leaves the scan reachable. **M13 and M14 must land together, id first.**

### Task M13: Stabilize the candidate segment id and fix persistence ownership

**Files:**

- Modify: `agents/interviewer.ts:262-329`
- Test: `agents/transcript-persistence.test.ts` (create)

- [ ] **Step 1: Execute Plan A Task 2 Steps 1-4** (`resolveConversationItemSpeaker`, narrowing `ConversationItemAdded` to assistant turns). That closes the agent/candidate double-write.

- [ ] **Step 2: Establish a stable id for candidate partials**

Read the `UserInputTranscribed` event shape for `@livekit/agents` 1.4 — check whether it carries a stable per-utterance id (LiveKit's browser hook exposes `segment.id`; confirm the Node agent event does too):

```bash
grep -rn "UserInputTranscribed" node_modules/@livekit/agents/dist/*.d.ts | head
```

If a stable id exists, use it: `` segmentId: `candidate:${event.id}` ``.

If it does not, coalesce by speaker plus an active-utterance window instead of by timestamp — the partial stream for one utterance must resolve to one id, with a new id minted only after a final:

```ts
  let activeCandidateSegmentId: string | null = null

  session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (event) => {
    // Partials for one utterance must share an id, or each partial inserts a
    // new row and misses the source-segment index on the live write path.
    activeCandidateSegmentId ??= `candidate:${event.createdAt}`
    const segmentId = activeCandidateSegmentId

    void port.upsertTranscript({
      segmentId,
      speaker: 'candidate',
      text: event.transcript,
      status: event.isFinal ? 'final' : 'partial',
      startedAt: new Date(event.createdAt).toISOString(),
    })

    if (event.isFinal) {
      activeCandidateSegmentId = null
      // ...existing final-turn handling unchanged
    }
```

- [ ] **Step 3: Write the regression test**

Assert that a partial → partial → final sequence for one utterance produces exactly one persisted row whose final text is the last transcript, and that two separate utterances produce two rows. This is the test that would have caught B32.

- [ ] **Step 4: Full gate and commit**

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test
git add agents/interviewer.ts agents/transcript-persistence.test.ts
git commit -m "fix(agent): coalesce STT partials to one segment id and fix speaker ownership"
```

### Task M14: Remove the quadratic transcript lookup

- [ ] **Execute Plan A Task 3 verbatim.** Plan B's B19 targets the same code; Plan A's formulation is deeper (it uses the existing `by_session_and_started_at` index rather than only widening `sourceSegmentId` population). Do it once, from Plan A. With M13 landed the fallback is now genuinely cold-path.
- [ ] **Then, from B19:** audit the unbounded `.collect()` calls at `reviews.ts:129-133,186`, `visualObservations.ts:51-54`, `readiness.ts:39-44` and thread limits through `loadSessionReviewSlices` — verify each before changing.
- [ ] **Then, from B32:** add a load check — 10 concurrent rooms × 15-minute interviews — asserting read latency stays flat. This is the only finding in either audit with a load-shaped failure mode, so it deserves a load-shaped test.
- [ ] **Task M15 — meter interview minutes.** Plan A Task 10 verbatim.
- [ ] **Task M16 — enforce a monthly minutes cap.** Plan A Task 11 verbatim.
- [ ] **Task M17 — bound the scoring call.** Plan A Task 12 verbatim, plus B-B10's addition: give the Inngest step in `inngest/functions/process-interview-assessment.ts` a timeout slightly above `SCORING_TIMEOUT_MS` so the catch path always wins the race.

---

## Phase 4 — Compliance

### Task M18: Fix GDPR erasure

**Files:**

- Modify: `convex/compliance.ts:233-300`
- Test: `convex/compliance.erasure.test.ts` (create)

**The defect, verified — two independent bugs:**

1. `collectSubjectSessionIds` is recomputed on every continuation, then sliced with an **absolute** cursor (`:238-239`). Pass 1 deletes sessions 0-39; the recomputed list is now 40 shorter; pass 2 slices `[40, 80)` of the shortened list, skipping 40 sessions. If the remainder is under 40 the slice is empty and the job reports `done: true` with sessions undeleted.
2. Child tables use a single `.take(DELETE_BATCH)` — 40 — per session (`:253-283`). Any interview with more than 40 transcript segments, which is every real interview, leaves orphaned rows. The DSR is recorded complete while candidate PII persists.

- [ ] **Step 1: Write the failing test** — seed a subject with 60 sessions each holding 100 transcript segments; run the mutation to completion; assert zero remaining sessions and zero orphaned segments.

- [ ] **Step 2: Run to verify it fails.**

- [ ] **Step 3: Always restart the slice at zero.** Since the list is recomputed each pass and deletions shrink it, the correct cursor is no cursor:

```ts
const slice = sessionIds.slice(0, DELETE_BATCH)
```

Keep the `cursor` arg for API compatibility but stop using it for offsetting; note in a comment that the recompute-and-drain pattern makes an absolute offset incorrect.

- [ ] **Step 4: Drain child tables fully.** Replace each single `.take(DELETE_BATCH)` with a loop that deletes until the table returns nothing for that session, before deleting the session and report rows.

- [ ] **Step 5: Report honestly.** `done` must be `sessionIds.length === 0` after the pass, not `slice.length < DELETE_BATCH`.

- [ ] **Step 6: Run tests, full gate, commit.**

```bash
git commit -m "fix(compliance): drain child tables and stop skipping sessions during erasure"
```

---

## Phase 5 — Perf, hardening, hygiene

Verified and ready:

- [ ] **Task M19 — dashboard stale-session false positives.** `convex/recruiter/dashboard.ts:73` builds `reportBySession` from manual-review and pending reports only, so line 149 flags sessions with _completed_ reports as stale. Include completed and failed statuses in the map (both indexes exist).
- [ ] **Task M20 — N+1 in the screenings list.** `screenings.ts:82-98` fetches template + eligibility per batch, then `ctx.db.get` per invite inside that loop — up to 100 batches × N invites on every screenings and dashboard load. Batch-fetch invites via a `by_batch` index and introduce denormalized counters on `screeningBatches` (candidate count, completed count, expiring count) maintained transactionally by the invite mutations. M4's index work is a prerequisite.
- [ ] **Task M21 — information leaks.** Plan A Task 13 verbatim (error text, invite token in room name, BYOK summary).
- [ ] **Task M22 — secret guards and BYOK binding.** Plan A Task 14 verbatim. **Note the breaking change:** AAD binding invalidates existing BYOK ciphertext — confirm no production provider keys exist first.
- [ ] **Task M23 — dashboard charts and doc reconciliation.** Plan A Tasks 15 and 16 verbatim.

### Task M23b: Restore conversational continuity on redispatch

**Files:**

- Modify: `agents/interviewer.ts:663-670` (userData init), `:865-895` (welcome)

**Verified:** `isRedispatchState` exists at `:515` and the agent already detects that it is rejoining, but `runInterviewSession` constructs `userData` with `phase: 'warmup'` and both turn counters at `0` on every job (`:664-669`), then generates the full welcome unconditionally (`:866-875`). A candidate who refreshes mid-interview is greeted from the top and must say "ready" again, and the turn budget silently resets — so budget enforcement can be evaded by refreshing.

Structurally the session survives a refresh (bootstrap reuses the session and room at `convex/interviews/bootstrap.ts:105-153`); it is the _experience_ and the budget integrity that break.

- [ ] **Step 1: Seed counters from the server on redispatch.** `port.fetchConfig()` already returns session state; extend `getInterviewAgentConfig` to include persisted candidate and agent turn counts derived from `transcriptSegments`, and initialize `userData` from them when `isRedispatchState(config.state)`.
- [ ] **Step 2: Skip the welcome on redispatch.** Replace it with a short re-entry line (`session.say`) and set `phase: 'screening'` so the candidate resumes rather than restarts.
- [ ] **Step 3: Add a test** asserting a redispatched session does not reset `candidateTurnCount` to zero — this is what makes the budget non-evadable.
- [ ] **Step 4: Full gate and commit.**

```bash
git commit -m "fix(agent): resume mid-interview on redispatch instead of restarting"
```

### Task M24: Verify-then-fix the inherited tail

Each item below is an **unverified** inherited claim. For every one: first re-read the cited source and confirm or reject it, then either implement or record the rejection in this file. Do not implement on the audit's say-so — one in five of Plan B's headline claims was a false positive.

- [ ] **M24a — B-B5** rubric weight validation (`convex/recruiter/templates.ts:23-32` accepts negative/zero/unbounded weights).
- [ ] **M24b — B-B12** report-chat citations persisted unvalidated (`lib/recruiter/report-chat.ts:372-394`).
- [ ] **M24c — B-B13** internal report summary shown to candidates (`convex/interviews/candidatePortal.ts:765-782`). **Product decision required** — flag to the owner before implementing; the practice surface already has filters to reuse.
- [ ] **M24d — B-B14** truncation asymmetry between deterministic and LLM paths (`sessionReview.ts:9` vs `llm-report.ts:266-303`).
- [ ] **M24e — B-B18** bootstrap double-session race (`interviews/bootstrap.ts:63-66` non-unique `.first()`).
- [ ] **M24f — B-B20** the nine-item small-correctness batch: C-09 heartbeat rows never reaped, C-12 client-controlled `nowMs`, C-13 expiry extension locks expired invites, C-14 `failedLast24h` ignores age, C-15 UTC day bucketing, C-16 unpaged template migration, C-17 inconsistent admin actor id, S-09 dead dual lookup in `computeAssessmentWeightedScore`, S-11 evidence cleanup caps at 500, S-12 report-chat echoes raw provider errors.
- [ ] **M24g — B-B22..B-B24** dashboard payload split, lazy-loaded room shell, marketing sections back to server components.
- [ ] **M24h — B-B25..B-B28** god-file splits (requires M11 calibration first), component consolidation, knip/CI/deps, doc truthfulness.

---

## Verification

After each phase:

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test && bun run build
bun run convex:once && git diff --exit-code -- convex/_generated
```

Phase 0 exit criteria — these are the reason this plan exists:

```bash
# M1: a candidate cannot forge a privileged source
bun run test convex/sessionEvents.trust.test.ts
# M2: a name-only template save preserves the rubric
bun run test convex/templates.patch.test.ts
# M3: seeding actions are not publicly callable
grep -n "internalAction" convex/devSeed.ts
# M4: quotas fire for orgs with >100 lifetime batches
bun run test convex/screenings.sampling.test.ts
```

## Known gaps in both audits

**Now closed by Plan B's Phase 5 deep-trace:**

- ~~Interview reconnect/resume/worker-crash paths.~~ Traced. Network blip **survives** (`use-interview-room-events.ts:192-258` handles reconnecting/interrupted and offers rejoin). Browser refresh **survives structurally but degrades** — fixed by M23b. Agent worker crash is **partial**: the duration poll eventually force-finalizes, but full-fidelity transcript stops at crash time. That last one remains open — see gap 1 below.
- ~~Cross-org authorization matrix.~~ Swept. Invite tokens use `crypto.randomUUID()` (~122 bits, `convex/recruiter/screenings.ts:20-24`) and are absent from audit metadata; single-use enforcement verified server-side; org-ownership assertions confirmed on recruiter reads and writes. Residual risks are already tracked as M1, M3 and M22.

**Still open — schedule separately:**

1. **Agent-crash transcript loss.** When the worker dies mid-session the full-fidelity transcript stops; only truncated client summaries continue. M6b's retry queue reduces the window but does not close it. Needs a durable client-side or egress-derived transcript path.
2. **Load behaviour of the transcript hot path** under concurrent rooms. M14 adds the load check; the result is unknown until it runs.
3. **Live end-to-end execution.** Everything in both audits is static analysis plus route probes. No task in this plan is proven against real Convex, Clerk, LiveKit and provider credentials. This remains the single largest unknown.
