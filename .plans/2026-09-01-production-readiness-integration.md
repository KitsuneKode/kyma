# Production Readiness Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the cumulative PR stack, close the confirmed correctness and
capacity gaps, and produce a fully verified merge candidate with live-only
gates reported separately.

**Architecture:** Keep PRs #21-#29 as a bottom-up stack and keep PR #19 as the
final Convex-boundary change on top. Put deterministic CI checks in shared
scripts, isolate LiveKit event adaptation from transcript state logic, keep
Convex list queries bounded, and move expensive time-derived screening metrics
to a separately refreshed operational summary.

**Tech Stack:** Next.js 16, React 19, TypeScript 6, Bun, Vitest, Playwright,
Convex, LiveKit Agents, Inngest 4, AI SDK 6, GitHub Actions.

**Spec:** `.docs/production-readiness-integration-design.md`

## Global Constraints

- Performance, reliability, predictable failure behavior, and correctness take
  priority over convenience.
- Read `convex/_generated/ai/guidelines.md` before every Convex task.
- Preserve `.worktrees/` and unrelated user changes.
- Use `bun run test`, never plain `bun test`.
- Run `bun run fmt` before lint, typecheck, or commit verification.
- Keep `/api/inngest` on Next; keep bootstrap, report chat, LiveKit webhooks,
  and Clerk webhooks on Convex.
- Every scoring and recruiter-chat output remains structured,
  evidence-backed, and human-reviewable.
- Do not push, retarget, merge, deploy, or mutate production data until the
  relevant local gates and pre-operation checks in this plan pass.
- A skipped credentialed/live test is an outstanding gate, never a pass.

---

## File Structure

- `lib/ci/conflict-markers.ts`: pure merge-marker scanner used by tests and the
  executable repository check.
- `scripts/check-conflict-markers.ts`: scans tracked files and exits nonzero on
  unresolved merge markers.
- `agents/transcript-persistence.ts`: stateful, LiveKit-independent transcript
  persistence controller.
- `convex/helpers/screeningLimits.ts`: shared screening size and pagination
  limits.
- `convex/screeningBatchOps.ts`: bounded operational-stat computation and
  refresh functions.
- `convex/migrations/screeningBatchCounters.ts`: bounded backfill for legacy
  batch counters and operational-stat rows.
- Existing files retain their current responsibilities; changes below avoid
  introducing duplicate policy or route-local business logic.

### Task 1: Repair generated state and make CI detect integration residue

**Files:**

- Create: `lib/ci/conflict-markers.ts`
- Create: `lib/ci/conflict-markers.test.ts`
- Create: `scripts/check-conflict-markers.ts`
- Modify: `convex/_generated/api.d.ts` through Convex generation only
- Modify: `vitest.config.ts`
- Modify: `playwright.config.ts`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**

- Produces: `findConflictMarkers(files: readonly TrackedTextFile[]):
ConflictMarkerFinding[]`
- Produces: package script `check:conflicts`
- Produces: deterministic test discovery that excludes `.worktrees/**`

- [ ] **Step 1: Add failing merge-marker scanner tests**

```ts
import { describe, expect, test } from 'vitest'

import { findConflictMarkers } from './conflict-markers'

describe('findConflictMarkers', () => {
  test('reports every diff3 marker with its file and line', () => {
    expect(
      findConflictMarkers([
        {
          path: 'broken.ts',
          contents:
            'const ok = true\n<<<<<<< HEAD\nours\n||||||| base\nbase\n=======\ntheirs\n>>>>>>> branch\n',
        },
      ])
    ).toEqual([
      { path: 'broken.ts', line: 2, marker: '<<<<<<< HEAD' },
      { path: 'broken.ts', line: 4, marker: '||||||| base' },
      { path: 'broken.ts', line: 6, marker: '=======' },
      { path: 'broken.ts', line: 8, marker: '>>>>>>> branch' },
    ])
  })

  test('does not flag ordinary comparison operators or prose', () => {
    expect(
      findConflictMarkers([
        { path: 'clean.ts', contents: 'const result = left >= right\n' },
      ])
    ).toEqual([])
  })
})
```

- [ ] **Step 2: Run the scanner test and verify it fails**

Run: `bun run test -- lib/ci/conflict-markers.test.ts`

Expected: FAIL because `./conflict-markers` does not exist.

- [ ] **Step 3: Implement the pure scanner and tracked-file executable**

```ts
export type TrackedTextFile = { path: string; contents: string }
export type ConflictMarkerFinding = {
  path: string
  line: number
  marker: string
}

const CONFLICT_MARKER =
  /^(<<<<<<<(?: .*)?|\|{7}(?: .*)?|=======|>>>>>>>(?: .*)?)$/

export function findConflictMarkers(
  files: readonly TrackedTextFile[]
): ConflictMarkerFinding[] {
  return files.flatMap(({ path, contents }) =>
    contents
      .split(/\r?\n/)
      .flatMap((line, index) =>
        CONFLICT_MARKER.test(line)
          ? [{ path, line: index + 1, marker: line }]
          : []
      )
  )
}
```

`scripts/check-conflict-markers.ts` must obtain paths with
`git ls-files -z`, read each regular file as bytes, skip files containing a NUL
byte, call `findConflictMarkers`, print `path:line: marker`, and set exit code 1
when findings exist.

- [ ] **Step 4: Prove the executable catches the existing generated conflict**

Run: `bun run scripts/check-conflict-markers.ts`

Expected: FAIL and report markers in `convex/_generated/api.d.ts`.

- [ ] **Step 5: Regenerate Convex API bindings from source**

Run: `bun run convex:ci`

Expected: `convex/_generated/api.d.ts` is regenerated without markers and
contains `helpers/usageRollup`, `http`, `httpWebhooks`, `integrationSeed`,
`interviews/bootstrapActions`, and `recruiter/reportChat`.

- [ ] **Step 6: Fix local tool discovery boundaries**

Change Vitest to:

```ts
exclude: ['node_modules', '.next', 'e2e', '.worktrees/**'],
```

Change Playwright's config-only import to:

```ts
import { runtimeEnv } from './lib/env/runtime'
```

This removes Knip's dependency on an application alias while loading the
configuration file.

- [ ] **Step 7: Wire the conflict check into local and remote gates**

Add to `package.json`:

```json
"check:conflicts": "bun run scripts/check-conflict-markers.ts"
```

Place `bun run check:conflicts` immediately after `fmt:check` in `check`, and
add a GitHub Actions `Conflict marker check` step immediately after format
checking.

- [ ] **Step 8: Verify Task 1**

Run:

```bash
bun run test -- lib/ci/conflict-markers.test.ts
bun run check:conflicts
bun run test
bun run knip
bun run typecheck
git diff --check
```

Expected: all commands exit 0; the unit suite contains only the parent
checkout's tests.

- [ ] **Step 9: Commit Task 1**

```bash
git add .github/workflows/ci.yml package.json playwright.config.ts vitest.config.ts convex/_generated/api.d.ts lib/ci scripts/check-conflict-markers.ts
git commit -m "fix(ci): reject integration residue and nested worktrees"
```

### Task 2: Enforce the assessment processing timeout

**Files:**

- Create: `inngest/functions/process-interview-assessment.test.ts`
- Modify: `inngest/functions/process-interview-assessment.ts`

**Interfaces:**

- Produces: `ASSESSMENT_PROCESSING_FINISH_TIMEOUT = '2m'`
- Preserves: three Inngest retries and `markAssessmentFailed` failure handling

- [ ] **Step 1: Add a failing configuration regression test**

```ts
import { describe, expect, test } from 'vitest'

import {
  ASSESSMENT_PROCESSING_FINISH_TIMEOUT,
  processInterviewAssessmentFunction,
} from './process-interview-assessment'

describe('assessment processing durability', () => {
  test('cancels a hung run after the 90 second provider timeout', () => {
    expect(ASSESSMENT_PROCESSING_FINISH_TIMEOUT).toBe('2m')
    const config = processInterviewAssessmentFunction.getConfig({
      baseUrl: new URL('https://example.test'),
      appPrefix: 'kyma',
      isConnect: false,
    })
    expect(config.timeouts?.finish).toBe('2m')
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run:
`bun run test -- inngest/functions/process-interview-assessment.test.ts`

Expected: FAIL because the exported timeout and function configuration do not
exist.

- [ ] **Step 3: Configure the function timeout**

```ts
export const ASSESSMENT_PROCESSING_FINISH_TIMEOUT = '2m' as const

export const processInterviewAssessmentFunction = inngest.createFunction(
  {
    id: 'process-interview-assessment',
    name: 'Process interview assessment',
    retries: 3,
    timeouts: { finish: ASSESSMENT_PROCESSING_FINISH_TIMEOUT },
    triggers: { event: INTERVIEW_PROCESSING_REQUESTED_EVENT },
  }
  // existing handler
)
```

Update the adjacent comment to distinguish the 90-second provider abort from
the two-minute durable run deadline.

- [ ] **Step 4: Verify Task 2**

Run:

```bash
bun run test -- inngest/functions/process-interview-assessment.test.ts lib/assessment/llm-report.test.ts
bun run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit Task 2**

```bash
git add inngest/functions/process-interview-assessment.ts inngest/functions/process-interview-assessment.test.ts
git commit -m "fix(processing): bound assessment function runtime"
```

### Task 3: Make recruiter-chat citations resolvable

**Files:**

- Modify: `lib/recruiter/report-chat.ts`
- Modify: `lib/recruiter/report-chat.test.ts`

**Interfaces:**

- Produces: `parseRecruiterCitations(text: string, detail: DetailShape):
RecruiterCitation[]`
- Preserves: deterministic citation fallback and a maximum of five citations

- [ ] **Step 1: Add failing citation tests**

Add model-answer tests covering:

```ts
it.each([
  ['CITATIONS: evidence:99:clarity'],
  ['CITATIONS: transcript:2099-01-01T00:00:00.000Z'],
  ['CITATIONS: dimension:invented'],
  ['CITATIONS: evidence:0:clarity, dimension:invented'],
])(
  'falls back when a model citation is unresolved: %s',
  async (citationLine) => {
    generateTextMock.mockResolvedValue({
      text: `Grounded answer.\n${citationLine}`,
    } as Awaited<ReturnType<typeof generateText>>)

    const answer = await answerRecruiterQuestion(
      'What are the strengths?',
      baseDetail,
      { modelId: 'openai/gpt-4.1-mini' }
    )

    expect(answer.citations.map((citation) => citation.ref)).toEqual([
      'evidence:0:clarity',
      'transcript:2026-07-10T12:00:05.000Z',
    ])
  }
)
```

Also assert that all three valid forms resolve:
`evidence:0:clarity`, `transcript:2026-07-10T12:00:05.000Z`, and
`dimension:clarity`.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `bun run test -- lib/recruiter/report-chat.test.ts`

Expected: invalid prefixed references are incorrectly accepted.

- [ ] **Step 3: Implement exact reference resolution**

Build exact valid-reference maps from the detail:

```ts
const validRefs = new Map<string, RecruiterCitation>()

for (const [index, entry] of detail.evidence.slice(0, 8).entries()) {
  const ref = `evidence:${index}:${entry.dimension}`
  validRefs.set(ref, { kind: 'evidence', ref, label: ref })
}
for (const entry of detail.transcript.slice(-14)) {
  const ref = `transcript:${entry.startedAt}`
  validRefs.set(ref, { kind: 'transcript', ref, label: ref })
}
for (const entry of detail.report?.dimensionScores ?? []) {
  const ref = `dimension:${entry.dimension}`
  validRefs.set(ref, { kind: 'dimension', ref, label: ref })
}
```

Every parsed reference must resolve through `validRefs.get(ref)`. If the line
is empty, any reference is missing, or more than five references are supplied,
return `citationsFromDetail(detail).slice(0, 3)`. Remove prefix-only acceptance.

- [ ] **Step 4: Verify Task 3**

Run:

```bash
bun run test -- lib/recruiter/report-chat.test.ts
bun run typecheck
```

Expected: all citation cases pass and the return type remains unchanged.

- [ ] **Step 5: Commit Task 3**

```bash
git add lib/recruiter/report-chat.ts lib/recruiter/report-chat.test.ts
git commit -m "fix(review): require resolvable report citations"
```

### Task 4: Test transcript coalescing at the agent event boundary

**Files:**

- Create: `agents/transcript-persistence.ts`
- Modify: `agents/interviewer.ts`
- Modify: `agents/transcript-persistence.test.ts`

**Interfaces:**

- Produces: `createTranscriptPersistenceController(options)`
- Produces controller methods: `onCandidateTranscript`, `onConversationItem`,
  and `flush`
- Consumes: `AgentSessionPort['upsertTranscript']`

- [ ] **Step 1: Replace the shallow role-only test with a failing flow test**

```ts
test('partial, partial, final produces one finalized candidate utterance', async () => {
  const rows = new Map<string, AgentTranscriptSegment>()
  const controller = createTranscriptPersistenceController({
    persist: async (segment) => rows.set(segment.segmentId, segment),
    onCandidateFinal: () => undefined,
    onAgentFinal: () => undefined,
    onError: (error) => {
      throw error
    },
  })

  controller.onCandidateTranscript({
    transcript: 'I would',
    isFinal: false,
    createdAt: 1_000,
  })
  controller.onCandidateTranscript({
    transcript: 'I would begin',
    isFinal: false,
    createdAt: 1_100,
  })
  controller.onCandidateTranscript({
    transcript: 'I would begin with an example',
    isFinal: true,
    createdAt: 1_200,
  })
  await controller.flush()

  expect([...rows.values()]).toEqual([
    expect.objectContaining({
      segmentId: 'candidate:1000',
      speaker: 'candidate',
      status: 'final',
      text: 'I would begin with an example',
    }),
  ])
})
```

Add a second test proving two finalized utterances use two different segment
IDs, and retain the assistant/user role-ownership assertions.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `bun run test -- agents/transcript-persistence.test.ts`

Expected: FAIL because the controller module does not exist.

- [ ] **Step 3: Extract the controller without changing behavior**

The controller owns `activeCandidateSegmentId` and the serialized promise
chain. `interviewer.ts` retains LiveKit event registration and translates
events into controller calls. Candidate-final and agent-final callbacks update
turn counts, invoke budget checks, and perform existing phase/logging behavior.

Use the first partial's timestamp for the candidate segment ID and started-at
time until a final event closes the utterance. `flush()` must await every queued
write, including writes queued before a previous rejection.

- [ ] **Step 4: Verify both event and Convex persistence seams**

Run:

```bash
bun run test -- agents/transcript-persistence.test.ts convex/transcriptSegments.test.ts convex/transcriptSegments.load.test.ts
bun run typecheck
```

Expected: event-level and storage-level coalescing tests pass.

- [ ] **Step 5: Commit Task 4**

```bash
git add agents/interviewer.ts agents/transcript-persistence.ts agents/transcript-persistence.test.ts
git commit -m "test(agent): cover streamed transcript persistence"
```

### Task 5: Lock redispatch turn counters to persisted transcript state

**Files:**

- Create: `convex/agentConfig.redispatch.test.ts`
- Modify only if the test exposes a defect: `convex/agentConfig.ts`

**Interfaces:**

- Verifies: `getInterviewAgentConfig` returns final candidate and agent turn
  counts while ignoring partial and system transcript rows

- [ ] **Step 1: Add the redispatch regression test**

Using `convexTest`, `schema`, and `seedInterview`, insert two final candidate
segments, one candidate partial, three final agent segments, and one final
system segment. Query:

```ts
const config = await t.query(api.agentConfig.getInterviewAgentConfig, {
  processingKey: 'test-processing-key',
  sessionId,
})

expect(config).toMatchObject({
  candidateTurnCount: 2,
  agentTurnCount: 3,
})
```

Set the processing-key test environment through the existing processing-auth
test helper; do not weaken production authentication.

- [ ] **Step 2: Run the focused test**

Run: `bun run test -- convex/agentConfig.redispatch.test.ts`

Expected: PASS with the current implementation. If it fails, preserve the
test, trace the incorrect count, and make the smallest change in
`convex/agentConfig.ts` that counts only final candidate/agent segments.

- [ ] **Step 3: Verify redispatch initialization in the agent**

Run:

```bash
bun run test -- convex/agentConfig.redispatch.test.ts lib/agent/session-port.test.ts agents/transcript-persistence.test.ts
bun run typecheck
```

Expected: all commands exit 0.

- [ ] **Step 4: Commit Task 5**

```bash
git add convex/agentConfig.redispatch.test.ts convex/agentConfig.ts
git commit -m "test(agent): preserve turn budgets across redispatch"
```

### Task 6: Make dev reset and index usage comply with Convex rules

**Files:**

- Modify: `convex/devSeedTables.ts`
- Modify: `convex/devSeedMutations.ts`
- Modify: `convex/devSeed.guard.test.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/recruiter/screenings.ts`
- Modify: `convex/helpers/usageRollup.ts`

**Interfaces:**

- Produces: `ORG_ID_SEED_TABLES` and `CLERK_ORG_ID_SEED_TABLES` as disjoint,
  exhaustive table groups
- Renames: `by_org_id_and_email_delivery_status`
- Renames: `by_org_id_and_period`

- [ ] **Step 1: Add failing source-contract and behavior tests**

Extend `convex/devSeed.guard.test.ts` to assert every table in
`SEED_ORG_TABLES` belongs to exactly one supported indexed group and that an
org-scoped clear deletes only the requested organization's rows.

Add a source contract that reads `convex/devSeedMutations.ts` and rejects
`.filter(`. This is a narrow regression guard for the exact Convex guideline
violation.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `bun run test -- convex/devSeed.guard.test.ts`

Expected: FAIL because org reset still uses query filters.

- [ ] **Step 3: Replace dynamic filters with indexed, exhaustively switched reads**

Define table groups in `devSeedTables.ts`:

```ts
export const CLERK_ORG_ID_SEED_TABLES = [
  'organizations',
  'orgMemberships',
] as const

export const ORG_ID_SEED_TABLES = SEED_ORG_TABLES.filter(
  (table) => !(CLERK_ORG_ID_SEED_TABLES as readonly string[]).includes(table)
)
```

In `clearOrgTableChunk`, use an exhaustive `switch` with literal table names so
TypeScript can select `by_clerk_org_id`, `by_org_id`, or the prefix of
`by_org_id_and_period`. Every branch must end with `.take(limit)`; no database
or JavaScript filtering is allowed.

- [ ] **Step 4: Rename misleading indexes and every caller**

```ts
.index('by_org_id_and_email_delivery_status', [
  'orgId',
  'emailDeliveryStatus',
])

.index('by_org_id_and_period', ['orgId', 'period'])
```

Update `convex/recruiter/screenings.ts` and
`convex/helpers/usageRollup.ts`. Confirm the old names no longer occur.

- [ ] **Step 5: Verify Task 6**

Run:

```bash
bun run test -- convex/devSeed.guard.test.ts convex/usage.test.ts
rg -n "by_org_id_and_email_status|by_org_and_period|\.filter\(" convex/devSeedMutations.ts convex/schema.ts convex/recruiter/screenings.ts convex/helpers/usageRollup.ts
bun run convex:ci
git diff --exit-code -- convex/_generated
bun run typecheck
```

Expected: tests and typecheck pass; the search prints no old index names or
database filters.

- [ ] **Step 6: Commit Task 6**

```bash
git add convex/devSeedTables.ts convex/devSeedMutations.ts convex/devSeed.guard.test.ts convex/schema.ts convex/recruiter/screenings.ts convex/helpers/usageRollup.ts convex/_generated
git commit -m "fix(convex): use indexed seed cleanup and accurate indexes"
```

### Task 7: Bound screening counters and remove list-query fan-out

**Files:**

- Create: `convex/helpers/screeningLimits.ts`
- Create: `convex/screeningBatchOps.ts`
- Create: `convex/screeningBatchOps.test.ts`
- Create: `convex/migrations/screeningBatchCounters.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/crons.ts`
- Modify: `convex/helpers/interviewSession.ts`
- Modify: `convex/recruiter/screenings.ts`
- Modify: `convex/screenings.sampling.test.ts`

**Interfaces:**

- Produces: `MAX_CANDIDATES_PER_SCREENING_BATCH = 500`
- Produces table: `screeningBatchOperationalStats` with one row per batch
- Produces internal action: `refreshScreeningBatchOperationalStats({ batchId })`
- Produces internal migration:
  `backfillScreeningBatchCounters({ cursor, numItems })`

- [ ] **Step 1: Add failing capacity and counter tests**

Add tests proving:

1. Batch creation rejects 501 candidates.
2. Transitioning one candidate to submitted increments an initialized counter
   once, including duplicate terminal events.
3. A legacy batch with at most 500 eligibility rows gets exact counters without
   an unbounded collection.
4. `listScreeningBatches` reads stored counters and operational stats without
   reading eligibility, invites, sessions, or reports for each listed batch.
5. Operational-stat refresh computes exact expiring and stuck counts for one
   bounded batch.

The list test must instrument the Convex test harness or isolate the list
projection helper so an eligibility/invite lookup throws; a passing query then
proves the fan-out is absent rather than merely returning the same values.

- [ ] **Step 2: Run focused tests and verify the capacity case fails**

Run:

```bash
bun run test -- convex/screeningBatchOps.test.ts convex/screenings.sampling.test.ts
```

Expected: FAIL because the list query still performs per-batch candidate reads
and no operational-stat table exists.

- [ ] **Step 3: Add shared limits and schema**

```ts
export const MAX_CANDIDATES_PER_SCREENING_BATCH = 500
```

Add:

```ts
screeningBatchOperationalStats: defineTable({
  orgId: v.string(),
  batchId: v.id('screeningBatches'),
  expiringInviteCount: v.number(),
  stuckCandidateCount: v.number(),
  computedAt: v.number(),
})
  .index('by_batch_id', ['batchId'])
  .index('by_org_id_and_computed_at', ['orgId', 'computedAt']),
```

Keep time-derived fields off `screeningBatches` so periodic refresh writes do
not contend with stable batch metadata and counters.

- [ ] **Step 4: Make operational-stat refresh bounded**

`refreshScreeningBatchOperationalStats` must:

- read at most 500 eligibility rows and 500 invites for one batch;
- reject or record an operational error if a legacy batch exceeds the supported
  maximum;
- fetch latest sessions and reports in chunks of at most 50 concurrent lookups;
- compute expiration with the existing `sessionOps` helpers;
- upsert one `screeningBatchOperationalStats` row;
- never scan multiple batches in the same query/mutation transaction.

Use a cron dispatcher that selects a bounded set of active batches and schedules
one refresh action per batch. The dispatcher and per-batch action must use
internal functions.

- [ ] **Step 5: Remove reactive list fan-out**

`listScreeningBatches` must read:

- at most 100 batch documents;
- unique template documents;
- at most one operational-stat document per batch.

It must not query `candidateEligibility`, `candidateInvites`,
`interviewSessions`, or `assessmentReports`. Return:

```ts
{
  candidateCount: batch.candidateCount ?? 0,
  completedCount: batch.completedCount ?? 0,
  expiringInvites: stats?.expiringInviteCount ?? 0,
  stuckCandidates: stats?.stuckCandidateCount ?? 0,
}
```

Expose `statsComputedAt` so the UI can distinguish a fresh zero from a pending
initial refresh without inventing counts.

- [ ] **Step 6: Bound legacy counter initialization**

Replace `.collect()` in `applySessionStateTransition` with `.take(501)`. For up
to 500 rows, compute exact initial counters; for 501 rows, throw a specific
operational error directing the operator to the migration. New batch creation
must reject more than 500 candidates, so the overflow path is legacy-only.

Implement `backfillScreeningBatchCounters` with Convex pagination over batches.
For each page, schedule one per-batch recomputation rather than reading every
batch's eligibility inside the pagination mutation.

- [ ] **Step 7: Verify Task 7**

Run:

```bash
bun run test -- convex/screeningBatchOps.test.ts convex/screenings.sampling.test.ts convex/processingIdempotency.test.ts
rg -n "\.collect\(\)" convex/helpers/interviewSession.ts convex/recruiter/screenings.ts convex/screeningBatchOps.ts convex/migrations/screeningBatchCounters.ts
bun run convex:ci
git diff --exit-code -- convex/_generated
bun run typecheck
```

Expected: all commands exit 0 and the search returns no unbounded collection in
these production paths.

- [ ] **Step 8: Commit Task 7**

```bash
git add convex/helpers/screeningLimits.ts convex/screeningBatchOps.ts convex/screeningBatchOps.test.ts convex/migrations/screeningBatchCounters.ts convex/schema.ts convex/crons.ts convex/helpers/interviewSession.ts convex/recruiter/screenings.ts convex/screenings.sampling.test.ts convex/_generated
git commit -m "fix(screenings): bound operational reads and counter repair"
```

### Task 8: Consolidate LiveKit webhook ingestion payloads

**Files:**

- Modify: `convex/httpWebhooks.ts`
- Modify: `convex/livekit.test.ts`

**Interfaces:**

- Produces: `ingestLiveKitWebhookEvent(ctx, base, event)` private helper
- Preserves: webhook signature validation and event-specific lifecycle mapping

- [ ] **Step 1: Extend webhook regression coverage**

Add table-driven coverage for participant joined, participant left, and egress
ended. Assert that shared room, participant, egress, timestamp, error, and detail
fields are forwarded exactly once and that the expected session transition is
unchanged.

- [ ] **Step 2: Run the webhook tests before refactoring**

Run: `bun run test -- convex/livekit.test.ts`

Expected: PASS, establishing the behavior-preservation baseline.

- [ ] **Step 3: Extract the shared dispatch helper**

Construct the common payload once:

```ts
const basePayload = {
  processingKey,
  roomName,
  participantIdentity,
  participantName,
  egressId,
  updatedAtMs,
  error,
  detail,
}
```

The helper adds only the event type and event-specific state/detail fields and
calls `ctx.runMutation(api.livekit.ingestWebhookEvent, payload)`. Do not change
public routes, signature validation, or dedupe semantics.

- [ ] **Step 4: Verify Task 8**

Run:

```bash
bun run test -- convex/livekit.test.ts
bun run typecheck
```

Expected: the same lifecycle assertions pass after extraction.

- [ ] **Step 5: Commit Task 8**

```bash
git add convex/httpWebhooks.ts convex/livekit.test.ts
git commit -m "refactor(livekit): share webhook ingestion payloads"
```

### Task 9: Run the complete deterministic release-candidate gate

**Files:**

- Modify generated/format-only files only when produced by the documented
  commands
- Update: `.context/session.md` with concise gate results and outstanding live
  work

**Interfaces:**

- Produces: one exact verified commit SHA suitable for remote PR update
- Produces: preserved logs for any credentialed integration failure

- [ ] **Step 1: Confirm repository and branch state**

Run:

```bash
git status --short --branch
git log --oneline --decorate -15
git diff --check
bun run check:conflicts
```

Expected: only the known `.worktrees/` entry is untracked; no merge/rebase is in
progress and no marker is present.

- [ ] **Step 2: Run deterministic gates in the required order**

Run each command separately and stop at the first failure:

```bash
bun install --frozen-lockfile
bun run fmt
bun run fmt:check
bun run lint
bun run test
bun run convex:ci
git diff --exit-code -- convex/_generated
bunx next typegen
bun run typecheck
bun run build
bun run test:e2e
bun run knip
```

If `bun run fmt` changes files, inspect and commit only relevant formatting,
then restart the entire sequence from `bun run fmt:check`.

- [ ] **Step 3: Run the local Convex integration harness**

Run: `bun run test:convex-integration`

Expected: bootstrap, signed LiveKit webhook, signed Clerk webhook, and processing
requeue steps pass against the local Convex deployment and Inngest sink. If the
sandbox blocks listening or network access, rerun with the required execution
approval; do not convert the failure into a pass.

- [ ] **Step 4: Run live-path preflight without exposing secrets**

Run: `bun run live-path:preflight`

Record each PASS, FAIL, and SKIP. Redact credentials and signed URLs from logs.
Do not mutate production environment values or webhook configuration during
this diagnostic step.

- [ ] **Step 5: Record the handoff state**

Update `.context/session.md` with:

- verified commit SHA;
- commands and pass/fail counts;
- PR topology and intended merge order;
- live/deployment gates still requiring credentials or operator action;
- exact next command.

Keep the file short and link to this plan rather than copying it.

- [ ] **Step 6: Commit verification-only generated or handoff changes**

```bash
git add .context/session.md convex/_generated
git commit -m "docs: record production candidate verification"
```

Skip this commit when neither path changed.

### Task 10: Update PR #19 and integrate the stack safely

**Files:**

- No source files
- Remote state: PRs #19 and #21-#29

**Interfaces:**

- Consumes: exact locally verified HEAD from Task 9
- Produces: updated PR #19 and, after checks, bottom-up merged stack

- [ ] **Step 1: Refresh remote state before rewriting anything**

Run:

```bash
git fetch origin
gh pr view 19 --json headRefOid,baseRefName,headRefName,mergeable,mergeStateStatus,statusCheckRollup
git rev-parse origin/cursor/convex-integration-consistency-ac65
git rev-parse HEAD
```

Expected: remote PR #19 still points to the previously observed two-commit head
or to a known successor containing no unreviewed third-party work. Stop if the
remote head changed unexpectedly.

- [ ] **Step 2: Rebase only if PR #29 moved**

Compare `git merge-base HEAD origin/fix/dev-leak-hardening` with
`git rev-parse origin/fix/dev-leak-hardening`. If they differ, rebase the local
PR #19 commits onto the refreshed PR #29 head, resolve from primary sources,
regenerate Convex bindings, and rerun all Task 9 deterministic gates.

- [ ] **Step 3: Update PR #19 with lease protection**

```bash
git push --force-with-lease origin HEAD:cursor/convex-integration-consistency-ac65
gh pr edit 19 --base fix/dev-leak-hardening
```

Then verify PR #19 contains only the intended incremental diff:

```bash
gh pr diff 19 --name-only
gh pr checks 19 --watch
```

- [ ] **Step 4: Recheck every stacked PR immediately before merging**

For each PR from #21 through #29, run:

```bash
gh pr view <number> --json baseRefName,headRefName,headRefOid,mergeable,mergeStateStatus,reviews,statusCheckRollup
gh pr checks <number>
```

Require the documented base, mergeable state, required approvals, and current
green checks. Merge one PR at a time in ascending order. After each merge,
refresh the next PR before acting.

- [ ] **Step 5: Retarget and revalidate PR #19**

After #29 is merged:

```bash
gh pr edit 19 --base main
gh pr view 19 --json baseRefName,headRefOid,mergeable,mergeStateStatus,statusCheckRollup
gh pr diff 19 --name-only
gh pr checks 19 --watch
```

If retargeting changes the merge base or exposes new conflicts, rebase onto the
current `origin/main`, rerun Task 9, and force-push with lease again.

- [ ] **Step 6: Merge PR #19 only after its final gate**

Use the repository's accepted merge method. Immediately after merge, verify:

```bash
git fetch origin
git log --oneline --decorate origin/main -20
gh run list --branch main --limit 10
```

Watch the final `main` CI run to completion. A merge commit is not a production
readiness signal until the post-merge run passes.

- [ ] **Step 7: Report readiness without collapsing gate categories**

Report separately:

- deterministic repository gates;
- PR review/merge gates;
- local Convex integration;
- live Clerk/LiveKit/Inngest/model/Dodo gates;
- deployment/configuration gates;
- capacity evidence and remaining load tests;
- production operations such as alerts, backup, and incident response.

Do not describe Kyma as production-ready while any required live or deployment
gate is unverified.
