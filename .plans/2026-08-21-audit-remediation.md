# Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the 18 findings from the 2026-08-21 codebase audit — starting with an unauthenticated production database wipe, then making the rubric arithmetic real, the transcript accurate, and interview cost bounded.

**Architecture:** Five phases ordered by dependency, not by severity alone. Phase 1 closes the security hole. Phase 2 fixes transcript data integrity _before_ Phase 3 touches scoring — the double-write corrupts `candidateWords`/`candidateTurns`, which are the exact inputs scoring thresholds read, so fixing the math first would calibrate it against corrupt data. Phase 3 introduces one shared rubric resolver that both the deterministic engine and the LLM path derive outcomes from, replacing three separate re-derivations. Phases 4 and 5 add cost control and close the remaining hardening findings.

**Tech Stack:** Next.js 16 (App Router), Convex, Clerk, LiveKit Agents 1.4, AI SDK v6, Vitest, TypeScript, Bun.

**Spec:** The audit report published 2026-08-21 (artifact `87b31873-e1c8-4f58-b411-2d41ab0c131b`). Finding IDs below (`F-01`…`F-18`) refer to it.

## Global Constraints

- Package manager is `bun`. Never `npm`/`yarn`.
- Run `bun run fmt` before `bun run lint`, `bun run typecheck` or committing — avoids formatter-only diffs.
- Tests are Vitest: `bun run test`. Never plain `bun test`.
- Verification gate for every task: `bun run fmt && bun run lint && bun run typecheck && bun run test`.
- Convex functions: read `convex/_generated/ai/guidelines.md` before editing anything under `convex/`.
- Public Convex functions must be `query`/`mutation`/`action`; anything not meant for browser callers must be `internalQuery`/`internalMutation`/`internalAction`.
- Commit style is conventional commits (`commitlint` runs on commit-msg). Types in use: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`.
- Duplicate logic across files is treated as a design smell in this repo — prefer extracting a shared module over local patches.
- Do not introduce new dependencies without flagging it; every task below uses what is already installed.

## Correction carried into this plan

The audit's **F-07** claimed `maxCandidatesPerBatch` was unenforced. It is enforced inline at `convex/recruiter/screenings.ts:236-241`. The real defect is that `assertCandidatesPerBatch` / `PlanQuotaExceededError` in `lib/saas/plans.ts:41-78` are dead code duplicating that inline check. Severity drops from Medium to Low; handled in Task 13, not Phase 4.

## File Structure

**Created:**

- `lib/rubric/resolve-rubric.ts` — single resolver turning an optional template `RubricConfig` into concrete dimension definitions (name, weight, hard-gate). The one place hard-gate and weight semantics live.
- `lib/rubric/resolve-rubric.test.ts`
- `lib/assessment/derive-outcome.test.ts`
- `convex/helpers/usageRollup.ts` — org usage accumulation and monthly period keys.
- `convex/usage.test.ts`
- `components/recruiter/dashboard-charts.tsx` — recruiter dashboard visualizations.

**Modified:**

- `convex/devSeed.ts` — F-01 gate.
- `agents/interviewer.ts:298-328` — F-04 speaker ownership.
- `convex/helpers/transcriptSegments.ts:59-78` — F-05 indexed lookup.
- `lib/assessment/scoring-policy.ts` — F-02/F-03 `deriveAssessmentOutcome`.
- `lib/assessment/report-engine.ts` — consume shared resolver.
- `lib/assessment/llm-report.ts` — derive rather than trust model output.
- `components/recruiter/rubric-radar-chart.tsx` — F-11/F-12.
- `convex/schema.ts` — usage table.
- `lib/saas/plans.ts` — minutes quota, remove dead helper.
- `convex/interviews/bootstrap.ts` — F-06 enforcement, F-09 room naming.
- `app/api/interviews/bootstrap/route.ts`, `app/api/interviews/process/route.ts` — F-08.
- `convex/orgs.ts` — F-14/F-15.
- `convex/helpers/encryption.ts` — F-16.
- `TODO.md` — F-18.

---

## Phase 1 — Close the wipe

### Task 1: Gate dev seeding on deployment mode and identity

**Files:**

- Modify: `convex/devSeed.ts:1-50` (imports and `assertDevelopmentMode`), and the three exported actions at `:44`, `:74`, `:123`
- Test: `convex/devSeed.guard.test.ts` (create)

**Interfaces:**

- Consumes: `isConvexDevelopmentMode({ KYMA_DEPLOYMENT_ENV, NODE_ENV })` from `lib/env/deployment-mode.ts:25`
- Produces: `assertDevSeedAllowed(env: { KYMA_DEPLOYMENT_ENV?: string; NODE_ENV?: string }): void` — throws `ConvexError` unless the deployment is unambiguously development.

**Why the current guard fails:** `assertDevelopmentMode` at `convex/devSeed.ts:38` tests `convexEnv.NODE_ENV === 'production'`. `NODE_ENV` is declared `.default('development')` in `lib/env/shared.ts:6-8`, and no script, runbook or env template sets it on a Convex deployment. On production Convex the guard reads `development` and passes. The actions are public and unauthenticated; the confirmation string `RESET_DEV_ONLY` ships in `package.json`.

- [ ] **Step 1: Write the failing test**

Create `convex/devSeed.guard.test.ts`:

```ts
import { describe, expect, test } from 'vitest'

import { assertDevSeedAllowed } from './devSeed'

describe('dev seed deployment guard', () => {
  test('blocks when NODE_ENV is unset (the production default trap)', () => {
    expect(() => assertDevSeedAllowed({})).toThrow(/blocked/i)
  })

  test('blocks when the deployment env says production', () => {
    expect(() =>
      assertDevSeedAllowed({
        KYMA_DEPLOYMENT_ENV: 'production',
        NODE_ENV: 'development',
      })
    ).toThrow(/blocked/i)
  })

  test('blocks under test NODE_ENV', () => {
    expect(() => assertDevSeedAllowed({ NODE_ENV: 'test' })).toThrow(/blocked/i)
  })

  test('allows only an explicit development NODE_ENV', () => {
    expect(() =>
      assertDevSeedAllowed({ NODE_ENV: 'development' })
    ).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test convex/devSeed.guard.test.ts`
Expected: FAIL — `assertDevSeedAllowed` is not exported from `./devSeed`.

- [ ] **Step 3: Replace the guard**

In `convex/devSeed.ts`, replace the `assertDevelopmentMode` function (currently lines 38-42) with:

```ts
/**
 * Dev seeding must be impossible on any deployment that is not explicitly
 * development. `NODE_ENV` defaults to `development` when unset, so an unset
 * value is treated as untrusted rather than as a development signal.
 */
export function assertDevSeedAllowed(env: {
  KYMA_DEPLOYMENT_ENV?: string
  NODE_ENV?: string
}) {
  const explicitlyDevelopment =
    env.NODE_ENV === 'development' && isConvexDevelopmentMode(env)

  if (!explicitlyDevelopment) {
    throw new ConvexError(
      'Dev seed/reset is blocked outside an explicit development deployment.'
    )
  }
}
```

Add the import at the top of the file, alongside the existing `convexEnv` import:

```ts
import { isConvexDevelopmentMode } from '../lib/env/deployment-mode'
```

- [ ] **Step 4: Update the three call sites**

In `convex/devSeed.ts`, replace each `assertDevelopmentMode()` call (at the handlers for `resetDevData`, `seedDevData`, `seedDevDataForActiveOrg` — lines 49, 97, 147) with:

```ts
assertDevSeedAllowed(convexEnv)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun run test convex/devSeed.guard.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Make the actions non-public**

Still in `convex/devSeed.ts`, change the import so internal builders are available:

```ts
import { action, internalAction } from './_generated/server'
```

Change `resetDevData` and `seedDevData` from `action({` to `internalAction({`. Leave `seedDevDataForActiveOrg` as `action` — it already authenticates via `getOrgContextFromIdentity` at line 161 and is called from the signed-in dev UI.

Then update `package.json` so the CLI scripts still reach them:

```json
    "db:reset:dev": "bunx convex run --internal devSeed:resetDevData '{\"confirm\":\"RESET_DEV_ONLY\"}'",
    "db:seed:dev": "bunx convex run --internal devSeed:seedDevData '{\"confirm\":\"SEED_DEV_ONLY\"}'",
```

- [ ] **Step 7: Verify the whole suite still passes**

Run: `bun run fmt && bun run lint && bun run typecheck && bun run test`
Expected: all pass. If `convex/devSeed.ts` is referenced by `convex/_generated/api.d.ts` as a public function, run `bun run convex:once` to regenerate, then re-run typecheck.

- [ ] **Step 8: Document the required production env**

In `.env.example`, under the deployment section (near line 47), add:

```
# REQUIRED on the Convex production deployment. Dev seeding and processing-key
# fallbacks are gated on this; unset is treated as untrusted, not as production.
KYMA_DEPLOYMENT_ENV=production
NODE_ENV=production
```

Add the same two variables to the env matrix in `.docs/deployment-runbook.md`.

- [ ] **Step 9: Commit**

```bash
git add convex/devSeed.ts convex/devSeed.guard.test.ts package.json .env.example .docs/deployment-runbook.md
git commit -m "fix(security): block dev seed/reset outside explicit development deployments"
```

---

## Phase 2 — Transcript integrity

### Task 2: Give each speaker exactly one persistence owner

**Files:**

- Modify: `agents/interviewer.ts:262-329` (`attachTranscriptPersistence`)
- Test: `agents/transcript-persistence.test.ts` (create)

**Interfaces:**

- Consumes: `AgentSessionPort.upsertTranscript(segment: AgentTranscriptSegment)` from `lib/agent/session-port.ts:42`
- Produces: no new exports; behavioural change only.

**The defect:** `UserInputTranscribed` (line 269) persists candidate speech keyed `candidate:${event.createdAt}`. `ConversationItemAdded` (line 298) persists the _same_ speech again for `role === 'user'`, keyed `event.item.id`. Convex deduplicates on `sourceSegmentId` (`convex/helpers/transcriptSegments.ts:62`), so both rows survive. Candidate word and turn counts roughly double, which inflates the confidence tier in `report-engine.ts`, doubles LLM prompt cost, and shows recruiters every line twice.

- [ ] **Step 1: Write the failing test**

Create `agents/transcript-persistence.test.ts`:

```ts
import { describe, expect, test } from 'vitest'

import { resolveConversationItemSpeaker } from './interviewer'

describe('conversation item speaker ownership', () => {
  test('assistant messages are persisted by the conversation-item handler', () => {
    expect(resolveConversationItemSpeaker('assistant')).toBe('agent')
  })

  test('user messages are ignored - UserInputTranscribed owns candidate speech', () => {
    expect(resolveConversationItemSpeaker('user')).toBeNull()
  })

  test('system and unknown roles are ignored', () => {
    expect(resolveConversationItemSpeaker('system')).toBeNull()
    expect(resolveConversationItemSpeaker('tool')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test agents/transcript-persistence.test.ts`
Expected: FAIL — `resolveConversationItemSpeaker` is not exported.

- [ ] **Step 3: Extract and narrow the speaker resolver**

In `agents/interviewer.ts`, add this exported function directly above `attachTranscriptPersistence` (above line 262):

```ts
/**
 * Candidate speech is owned by `UserInputTranscribed`, which carries
 * interim/final state and stable STT timing. `ConversationItemAdded` therefore
 * persists agent turns only - persisting user items here too would write every
 * candidate turn a second time under a different segment id, which the Convex
 * upsert cannot deduplicate.
 */
export function resolveConversationItemSpeaker(role: string): 'agent' | null {
  return role === 'assistant' ? 'agent' : null
}
```

- [ ] **Step 4: Use it in the handler**

In `agents/interviewer.ts`, inside the `ConversationItemAdded` handler, replace the speaker block (currently lines 307-315, from `const speaker =` through the `if (!speaker) { return }`) with:

```ts
const speaker = resolveConversationItemSpeaker(event.item.role)

if (!speaker) {
  return
}

session.userData.agentTurnCount += 1
onBudgetCheck?.()
```

Then delete the now-duplicated `if (speaker === 'agent') { ... }` block that followed it (previously lines 317-320), since the increment moved above. Leave the trailing `void port.upsertTranscript({ ... })` call unchanged.

- [ ] **Step 5: Run test to verify it passes**

Run: `bun run test agents/transcript-persistence.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Verify no other caller depended on user items**

Run: `grep -rn "ConversationItemAdded" agents lib convex`
Expected: only the one handler in `agents/interviewer.ts`. If another site consumes user-role conversation items for transcript writes, it has the same bug and must be narrowed the same way.

- [ ] **Step 7: Full gate and commit**

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test
git add agents/interviewer.ts agents/transcript-persistence.test.ts
git commit -m "fix(agent): stop persisting every candidate turn twice"
```

### Task 3: Remove the quadratic transcript lookup

**Files:**

- Modify: `convex/helpers/transcriptSegments.ts:52-98`
- Test: `convex/transcriptSegments.test.ts` (create)

**Interfaces:**

- Consumes: existing indexes `by_session_and_source_segment_id` and `by_session_and_started_at` on `transcriptSegments` (`convex/schema.ts:281-297`)
- Produces: `upsertTranscriptSegmentForSession` keeps its exact current signature — `(ctx: MutationCtx, args: TranscriptSegmentWriteArgs) => Promise<Id<'transcriptSegments'>>`.

**The defect:** when the indexed lookup misses — which is every first write of every new segment — the fallback at lines 66-78 `.collect()`s the entire session transcript. A session with _n_ segments performs O(n²) row reads, and failures are swallowed by the agent's catch-and-log policy at `lib/agent/session-port.ts:106`, degrading into silent transcript loss rather than a visible error.

- [ ] **Step 1: Write the failing test**

Create `convex/transcriptSegments.test.ts`:

```ts
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'

import schema from './schema'
import { upsertTranscriptSegmentForSession } from './helpers/transcriptSegments'

const modules = import.meta.glob('./**/*.ts')

async function seedSession(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('interviewSessions', {
      orgId: 'org_test',
      inviteId: await ctx.db.insert('candidateInvites', {
        orgId: 'org_test',
        inviteToken: 'tok_test',
        templateId: await ctx.db.insert('assessmentTemplates', {
          orgId: 'org_test',
          name: 'Test template',
          createdAt: new Date().toISOString(),
        } as never),
        status: 'created',
        createdAt: new Date().toISOString(),
      } as never),
      state: 'live',
      provider: 'livekit',
      roomName: 'room_test',
      startedAt: new Date().toISOString(),
      reconnectCount: 0,
      activeDurationMs: 0,
    } as never)
  })
}

describe('transcript segment upsert', () => {
  test('a partial is patched in place, not duplicated', async () => {
    const t = convexTest(schema, modules)
    const sessionId = await seedSession(t)

    await t.run(async (ctx) => {
      await upsertTranscriptSegmentForSession(ctx, {
        sessionId,
        segmentId: 'seg-1',
        speaker: 'candidate',
        text: 'I would start',
        status: 'partial',
        startedAt: '2026-08-21T10:00:00.000Z',
      })
      await upsertTranscriptSegmentForSession(ctx, {
        sessionId,
        segmentId: 'seg-1',
        speaker: 'candidate',
        text: 'I would start with a simple example',
        status: 'final',
        startedAt: '2026-08-21T10:00:00.000Z',
      })
    })

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query('transcriptSegments')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .collect()
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]?.status).toBe('final')
    expect(rows[0]?.text).toBe('I would start with a simple example')
  })

  test('distinct segment ids produce distinct rows', async () => {
    const t = convexTest(schema, modules)
    const sessionId = await seedSession(t)

    await t.run(async (ctx) => {
      for (let index = 0; index < 5; index += 1) {
        await upsertTranscriptSegmentForSession(ctx, {
          sessionId,
          segmentId: `seg-${index}`,
          speaker: 'candidate',
          text: `turn ${index}`,
          status: 'final',
          startedAt: `2026-08-21T10:0${index}:00.000Z`,
        })
      }
    })

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query('transcriptSegments')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .collect()
    )

    expect(rows).toHaveLength(5)
  })
})
```

- [ ] **Step 2: Run test to verify current behaviour**

Run: `bun run test convex/transcriptSegments.test.ts`
Expected: these two PASS against the current implementation — they lock in correct behaviour before the refactor. If the seed helper's field shape is rejected by the schema validator, read `convex/schema.ts:200-297` and correct the inserted fields to match; do not weaken the assertions.

- [ ] **Step 3: Replace the fallback with an indexed range query**

In `convex/helpers/transcriptSegments.ts`, replace the body from `const indexedMatch` through the `const match =` assignment (lines 59-78) with:

```ts
const indexedMatch = await ctx.db
  .query('transcriptSegments')
  .withIndex('by_session_and_source_segment_id', (q) =>
    q.eq('sessionId', args.sessionId).eq('sourceSegmentId', sourceSegmentId)
  )
  .first()

// A partial written before the source id stabilised is found by its exact
// start time rather than by scanning the whole session transcript, which
// would make every new segment O(n) and the session as a whole O(n^2).
const match =
  indexedMatch ??
  (
    await ctx.db
      .query('transcriptSegments')
      .withIndex('by_session_and_started_at', (q) =>
        q.eq('sessionId', args.sessionId).eq('startedAt', args.startedAt)
      )
      .take(8)
  ).find(
    (segment) =>
      segment.speaker === args.speaker && segment.status === 'partial'
  )
```

- [ ] **Step 4: Run tests to verify they still pass**

Run: `bun run test convex/transcriptSegments.test.ts`
Expected: PASS, 2 tests — behaviour preserved, scan removed.

- [ ] **Step 5: Confirm the throttle still holds**

Run: `bun run test convex/`
Expected: all existing Convex tests pass, including any covering `assertTranscriptWriteThrottle`.

- [ ] **Step 6: Full gate and commit**

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test
git add convex/helpers/transcriptSegments.ts convex/transcriptSegments.test.ts
git commit -m "perf(convex): replace full-transcript scan with indexed segment lookup"
```

---

## Phase 3 — Make the rubric real

### Task 4: Extract one rubric resolver

**Files:**

- Create: `lib/rubric/resolve-rubric.ts`
- Create: `lib/rubric/resolve-rubric.test.ts`

**Interfaces:**

- Consumes: `RUBRIC_DIMENSIONS`, `DIMENSION_WEIGHTS`, `DEFAULT_HARD_GATE_DIMENSIONS`, `isDefaultHardGateDimension` from `lib/rubric/constants.ts`; `RubricConfig` from `lib/assessment/llm-report-schema.ts:30`
- Produces:
  - `type ResolvedRubricDimension = { name: string; weight: number; isHardGate: boolean }`
  - `resolveRubricDimensions(rubricConfig?: RubricConfig): ResolvedRubricDimension[]`
  - `hardGateNamesFrom(dimensions: ResolvedRubricDimension[]): string[]`

  Tasks 5, 6 and 7 all consume these exact names.

**Why:** hard-gate and weight semantics are currently derived in three places — `report-engine.ts:391-409`, `scoring-policy.ts:25-37`, and `rubric-radar-chart.tsx:38-44` — and they disagree. This is the single source of truth they will all read from.

- [ ] **Step 1: Write the failing test**

Create `lib/rubric/resolve-rubric.test.ts`:

```ts
import { describe, expect, test } from 'vitest'

import { hardGateNamesFrom, resolveRubricDimensions } from './resolve-rubric'

describe('resolveRubricDimensions', () => {
  test('falls back to the default nine dimensions when no rubric is configured', () => {
    const resolved = resolveRubricDimensions(undefined)

    expect(resolved).toHaveLength(9)
    expect(resolved.map((item) => item.name)).toContain('clarity')
    expect(resolved.find((item) => item.name === 'clarity')?.isHardGate).toBe(
      true
    )
    expect(resolved.find((item) => item.name === 'warmth')?.isHardGate).toBe(
      false
    )
  })

  test('honours a configured rubric, including custom dimension names', () => {
    const resolved = resolveRubricDimensions({
      dimensions: [
        { name: 'domain_depth', weight: 3, isHardGate: true },
        { name: 'warmth', weight: 1, isHardGate: false },
      ],
    })

    expect(resolved).toEqual([
      { name: 'domain_depth', weight: 3, isHardGate: true },
      { name: 'warmth', weight: 1, isHardGate: false },
    ])
  })

  test('a configured dimension can turn OFF a default hard gate', () => {
    const resolved = resolveRubricDimensions({
      dimensions: [{ name: 'clarity', weight: 1, isHardGate: false }],
    })

    expect(resolved[0]?.isHardGate).toBe(false)
  })

  test('blank dimension names are discarded', () => {
    const resolved = resolveRubricDimensions({
      dimensions: [
        { name: '  ', weight: 1, isHardGate: true },
        { name: 'clarity', weight: 2, isHardGate: true },
      ],
    })

    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.name).toBe('clarity')
  })

  test('an all-blank rubric falls back to defaults rather than scoring nothing', () => {
    const resolved = resolveRubricDimensions({
      dimensions: [{ name: '', weight: 1, isHardGate: false }],
    })

    expect(resolved).toHaveLength(9)
  })
})

describe('hardGateNamesFrom', () => {
  test('returns only the gated dimension names', () => {
    expect(
      hardGateNamesFrom([
        { name: 'clarity', weight: 1, isHardGate: true },
        { name: 'warmth', weight: 1, isHardGate: false },
      ])
    ).toEqual(['clarity'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test lib/rubric/resolve-rubric.test.ts`
Expected: FAIL — module `./resolve-rubric` does not exist.

- [ ] **Step 3: Write the resolver**

Create `lib/rubric/resolve-rubric.ts`:

```ts
import type { RubricConfig } from '@/lib/assessment/llm-report-schema'

import {
  DIMENSION_WEIGHTS,
  RUBRIC_DIMENSIONS,
  isDefaultHardGateDimension,
  isRubricDimension,
} from './constants'

export type ResolvedRubricDimension = {
  name: string
  weight: number
  isHardGate: boolean
}

/**
 * The single source of truth for what a rubric means at scoring time.
 *
 * A template's configured dimensions win outright, including the ability to
 * clear a hard gate that is on by default. Only when no usable configuration
 * exists do the built-in nine dimensions apply.
 */
export function resolveRubricDimensions(
  rubricConfig?: RubricConfig
): ResolvedRubricDimension[] {
  const configured = (rubricConfig?.dimensions ?? [])
    .map((dimension) => ({
      name: dimension.name.trim(),
      weight: dimension.weight,
      isHardGate: dimension.isHardGate,
    }))
    .filter((dimension) => dimension.name.length > 0)

  if (configured.length > 0) {
    return configured
  }

  return RUBRIC_DIMENSIONS.map((dimension) => ({
    name: dimension,
    weight: DIMENSION_WEIGHTS[dimension],
    isHardGate: isDefaultHardGateDimension(dimension),
  }))
}

export function hardGateNamesFrom(
  dimensions: ResolvedRubricDimension[]
): string[] {
  return dimensions
    .filter((dimension) => dimension.isHardGate)
    .map((dimension) => dimension.name)
}

export { isRubricDimension }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test lib/rubric/resolve-rubric.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
bun run fmt && bun run lint && bun run typecheck
git add lib/rubric/resolve-rubric.ts lib/rubric/resolve-rubric.test.ts
git commit -m "feat(rubric): add single resolver for dimension weights and hard gates"
```

### Task 5: Derive the outcome instead of asserting it

**Files:**

- Modify: `lib/assessment/scoring-policy.ts:25-37` and append
- Create: `lib/assessment/derive-outcome.test.ts`

**Interfaces:**

- Consumes: `ResolvedRubricDimension` from Task 4; `computeAssessmentWeightedScore`, `resolveRecommendation` already in `scoring-policy.ts`
- Produces:
  - `isHardGateTriggered(dimensionScores, dimensions?: ResolvedRubricDimension[]): boolean` — second parameter is new and optional, so existing callers and `lib/assessment/scoring-policy.test.ts` keep compiling.
  - `deriveAssessmentOutcome(args: { dimensionScores: Array<{ dimension: string; score: number }>; dimensions: ResolvedRubricDimension[]; confidence: Confidence }): { weightedScore: number; hardGateTriggered: boolean; overallRecommendation: Recommendation }`

  Tasks 6 and 7 both call `deriveAssessmentOutcome`.

- [ ] **Step 1: Write the failing test**

Create `lib/assessment/derive-outcome.test.ts`:

```ts
import { describe, expect, test } from 'vitest'

import { deriveAssessmentOutcome, isHardGateTriggered } from './scoring-policy'

const rubric = [
  { name: 'domain_depth', weight: 3, isHardGate: true },
  { name: 'warmth', weight: 1, isHardGate: false },
]

describe('isHardGateTriggered with an explicit rubric', () => {
  test('gates on a custom dimension the default list does not know', () => {
    expect(
      isHardGateTriggered(
        [
          { dimension: 'domain_depth', score: 2 },
          { dimension: 'warmth', score: 5 },
        ],
        rubric
      )
    ).toBe(true)
  })

  test('does not gate on a dimension the template left ungated', () => {
    expect(
      isHardGateTriggered(
        [
          { dimension: 'domain_depth', score: 5 },
          { dimension: 'warmth', score: 1 },
        ],
        rubric
      )
    ).toBe(false)
  })

  test('a template can clear a default hard gate', () => {
    expect(
      isHardGateTriggered(
        [{ dimension: 'clarity', score: 1 }],
        [{ name: 'clarity', weight: 1, isHardGate: false }]
      )
    ).toBe(false)
  })

  test('falls back to default gates when no rubric is supplied', () => {
    expect(isHardGateTriggered([{ dimension: 'clarity', score: 2 }])).toBe(true)
  })
})

describe('deriveAssessmentOutcome', () => {
  test('weights actually move the score', () => {
    const heavyOnStrength = deriveAssessmentOutcome({
      dimensionScores: [
        { dimension: 'domain_depth', score: 5 },
        { dimension: 'warmth', score: 1 },
      ],
      dimensions: rubric,
      confidence: 'high',
    })

    // (5 * 3 + 1 * 1) / 4 = 4.0
    expect(heavyOnStrength.weightedScore).toBe(4)

    const evenWeights = deriveAssessmentOutcome({
      dimensionScores: [
        { dimension: 'domain_depth', score: 5 },
        { dimension: 'warmth', score: 1 },
      ],
      dimensions: [
        { name: 'domain_depth', weight: 1, isHardGate: true },
        { name: 'warmth', weight: 1, isHardGate: false },
      ],
      confidence: 'high',
    })

    // (5 * 1 + 1 * 1) / 2 = 3.0
    expect(evenWeights.weightedScore).toBe(3)
  })

  test('a hard gate forces no even with a perfect weighted score', () => {
    const outcome = deriveAssessmentOutcome({
      dimensionScores: [
        { dimension: 'domain_depth', score: 2 },
        { dimension: 'warmth', score: 5 },
      ],
      dimensions: rubric,
      confidence: 'high',
    })

    expect(outcome.hardGateTriggered).toBe(true)
    expect(outcome.overallRecommendation).toBe('no')
  })

  test('low confidence caps the recommendation at mixed', () => {
    const outcome = deriveAssessmentOutcome({
      dimensionScores: [
        { dimension: 'domain_depth', score: 5 },
        { dimension: 'warmth', score: 5 },
      ],
      dimensions: rubric,
      confidence: 'low',
    })

    expect(outcome.overallRecommendation).toBe('mixed')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test lib/assessment/derive-outcome.test.ts`
Expected: FAIL — `deriveAssessmentOutcome` is not exported, and `isHardGateTriggered` takes one argument.

- [ ] **Step 3: Widen the hard-gate check**

In `lib/assessment/scoring-policy.ts`, replace `isHardGateDimension` and `isHardGateTriggered` (lines 25-37) with:

```ts
export function isHardGateDimension(
  dimension: string,
  dimensions?: ResolvedRubricDimension[]
) {
  const configured = dimensions?.find((item) => item.name === dimension)

  if (configured) {
    return configured.isHardGate
  }

  return dimensions ? false : isDefaultHardGateDimension(dimension)
}

export function isHardGateTriggered(
  dimensionScores: Array<{ dimension: string; score: number }>,
  dimensions?: ResolvedRubricDimension[]
) {
  return dimensionScores.some(
    (item) =>
      isHardGateDimension(item.dimension, dimensions) &&
      item.score <= HARD_GATE_SCORE_THRESHOLD
  )
}
```

Add to the imports at the top of the file:

```ts
import type { ResolvedRubricDimension } from '@/lib/rubric/resolve-rubric'
```

- [ ] **Step 4: Add the outcome derivation**

Append to `lib/assessment/scoring-policy.ts`:

```ts
/**
 * Derives every headline number on a report from the dimension scores and the
 * template rubric. Both the deterministic engine and the LLM path go through
 * here, so a recruiter's configured weights and hard gates have arithmetic
 * effect rather than merely appearing in a prompt.
 */
export function deriveAssessmentOutcome(args: {
  dimensionScores: Array<{ dimension: string; score: number }>
  dimensions: ResolvedRubricDimension[]
  confidence: Confidence
}): {
  weightedScore: number
  hardGateTriggered: boolean
  overallRecommendation: Recommendation
} {
  const weights = Object.fromEntries(
    args.dimensions.map((dimension) => [dimension.name, dimension.weight])
  )
  const weightedScore = computeAssessmentWeightedScore(
    args.dimensionScores,
    weights
  )
  const hardGateTriggered = isHardGateTriggered(
    args.dimensionScores,
    args.dimensions
  )

  return {
    weightedScore,
    hardGateTriggered,
    overallRecommendation: resolveRecommendation({
      weightedScore,
      confidence: args.confidence,
      hardGateTriggered,
    }),
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun run test lib/assessment/derive-outcome.test.ts lib/assessment/scoring-policy.test.ts`
Expected: both files PASS. The pre-existing `scoring-policy.test.ts` must still pass unchanged — that is the proof the optional second parameter is backwards compatible.

- [ ] **Step 6: Commit**

```bash
bun run fmt && bun run lint && bun run typecheck
git add lib/assessment/scoring-policy.ts lib/assessment/derive-outcome.test.ts
git commit -m "feat(scoring): derive weighted score, hard gate and recommendation from the rubric"
```

### Task 6: Make the deterministic engine use the shared resolver

**Files:**

- Modify: `lib/assessment/report-engine.ts:245-260` (drop the dead parameter), `:388-410` (use resolver), `:436-460` (use derivation)
- Test: `lib/assessment/report-engine.test.ts` (extend)

**Interfaces:**

- Consumes: `resolveRubricDimensions` (Task 4), `deriveAssessmentOutcome` (Task 5)
- Produces: `buildAssessmentReport` keeps its signature `(input: CandidateReviewInput, rubricConfig?: RubricConfig) => AssessmentComputation`.

**The defect:** `computeDimensionScore` accepts `_isHardGate` (line 254) — underscore-prefixed and never read — and the gate check at line 453 calls `isHardGateTriggered(dimensionScores)` with no rubric, so template hard gates are silently discarded.

- [ ] **Step 1: Write the failing test**

Append to `lib/assessment/report-engine.test.ts`:

```ts
import { describe, expect, test } from 'vitest'

import { buildAssessmentReport } from './report-engine'

function thinTranscript() {
  return [
    {
      speaker: 'candidate' as const,
      text: 'I am not sure. Maybe. I guess it depends, probably.',
      status: 'final' as const,
      startedAt: '2026-08-21T10:00:00.000Z',
    },
  ]
}

describe('report engine honours template hard gates', () => {
  test('a custom gated dimension can trigger the gate', () => {
    const report = buildAssessmentReport(
      {
        sessionId: 'sess_1',
        candidateName: 'Test Candidate',
        templateName: 'Custom rubric',
        transcript: thinTranscript(),
      },
      {
        dimensions: [
          { name: 'domain_depth', weight: 3, isHardGate: true },
          { name: 'warmth', weight: 1, isHardGate: false },
        ],
      }
    )

    expect(report.dimensionScores.map((item) => item.dimension)).toEqual([
      'domain_depth',
      'warmth',
    ])
    expect(report.hardGateTriggered).toBe(true)
    expect(report.overallRecommendation).toBe('no')
  })

  test('clearing a default gate stops it firing', () => {
    const report = buildAssessmentReport(
      {
        sessionId: 'sess_2',
        candidateName: 'Test Candidate',
        templateName: 'Ungated clarity',
        transcript: thinTranscript(),
      },
      { dimensions: [{ name: 'clarity', weight: 1, isHardGate: false }] }
    )

    expect(report.hardGateTriggered).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test lib/assessment/report-engine.test.ts`
Expected: FAIL — `hardGateTriggered` is `false` in the first test, because `isHardGateTriggered` currently ignores the rubric and `domain_depth` is not in the default gate list.

- [ ] **Step 3: Drop the dead parameter**

In `lib/assessment/report-engine.ts`, change the `computeDimensionScore` signature (lines 248-256) to remove the unused final parameter:

```ts
function computeDimensionScore(
  dimension: string,
  keywords: string[],
  segments: CandidateSegment[],
  candidateTurns: number,
  candidateWords: number
) {
```

- [ ] **Step 4: Use the shared resolver for dimension definitions**

Replace the `configuredDimensions` / `dimensionDefinitions` block (lines 388-410) with:

```ts
const dimensionDefinitions = resolveRubricDimensions(rubricConfig).map(
  (dimension) => ({
    ...dimension,
    keywords: isRubricDimension(dimension.name)
      ? KEYWORDS[dimension.name]
      : ['because', 'example', 'step', 'understand'],
  })
)
```

If the template supplied its own keywords they must still win, so use this instead when `rubricConfig` carries them:

```ts
const configuredKeywords = new Map(
  (rubricConfig?.dimensions ?? [])
    .filter((dimension) => (dimension.keywords?.length ?? 0) > 0)
    .map((dimension) => [dimension.name.trim(), dimension.keywords ?? []])
)

const dimensionDefinitions = resolveRubricDimensions(rubricConfig).map(
  (dimension) => ({
    ...dimension,
    keywords:
      configuredKeywords.get(dimension.name) ??
      (isRubricDimension(dimension.name)
        ? KEYWORDS[dimension.name]
        : ['because', 'example', 'step', 'understand']),
  })
)
```

Use the second form. Then update the mapping call below it to drop the removed argument:

```ts
const scoredDimensions = dimensionDefinitions.map((definition) =>
  computeDimensionScore(
    definition.name,
    definition.keywords,
    candidateSegments,
    candidateTurns,
    candidateWords
  )
)
```

- [ ] **Step 5: Derive the outcome**

Replace the `weightByDimension` / `weightedScore` block (lines 431-437) and the `hardGateTriggered` / `overallRecommendation` block (lines 453-458) with a single derivation placed _after_ `confidence` is computed:

```ts
const { weightedScore, hardGateTriggered, overallRecommendation } =
  deriveAssessmentOutcome({
    dimensionScores,
    dimensions: dimensionDefinitions,
    confidence,
  })
```

Note the ordering constraint: `confidence` is computed from `candidateTurns`, `candidateWords` and `evidence.length` and must be assigned before this call. Move the `transcriptQualityNote` assignment above it too if the compiler complains about use-before-assign.

Update the imports at the top of the file:

```ts
import {
  type Confidence,
  type Recommendation,
  computeAssessmentWeightedScore,
  deriveAssessmentOutcome,
  isHardGateDimension,
  isHardGateTriggered,
  resolveRecommendation,
} from './scoring-policy'
import { resolveRubricDimensions } from '@/lib/rubric/resolve-rubric'
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun run test lib/assessment/`
Expected: PASS. Existing `report-engine.test.ts` cases must still pass — if a default-rubric case shifted, the derivation is wrong, not the old test.

- [ ] **Step 7: Remove now-unused imports**

Run: `bun run lint`
Expected: clean. If `computeAssessmentWeightedScore`, `isHardGateTriggered` or `resolveRecommendation` are now unused in `report-engine.ts`, delete them from its import list.

- [ ] **Step 8: Commit**

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test
git add lib/assessment/report-engine.ts lib/assessment/report-engine.test.ts
git commit -m "fix(scoring): honour template hard gates in the deterministic engine"
```

### Task 7: Stop trusting the model's arithmetic

**Files:**

- Modify: `lib/assessment/llm-report.ts:333-354` (`llmReportToAssessmentComputation`), `:415-478` (`buildHybridAssessmentReport`)
- Modify: `lib/assessment/llm-report.test.ts` (extend)

**Interfaces:**

- Consumes: `resolveRubricDimensions` (Task 4), `deriveAssessmentOutcome` (Task 5)
- Produces: `llmReportToAssessmentComputation(report: LlmAssessmentReport, status: AssessmentComputation['status'], dimensions: ResolvedRubricDimension[]): AssessmentComputation` — **the third parameter is new and required**. Every call site must be updated in this task.

**The defect:** the function currently copies `report.weightedScore`, `report.overallRecommendation` and `report.hardGateTriggered` straight out of the model's JSON. Recruiter-configured weights reach the model only as prompt text (`llm-report.ts:248-256`), so they have no arithmetic effect, and the model can emit a weighted score that contradicts its own dimension scores.

- [ ] **Step 1: Write the failing test**

Append to `lib/assessment/llm-report.test.ts`:

```ts
import { describe, expect, test } from 'vitest'

import { llmReportToAssessmentComputation } from './llm-report'
import { resolveRubricDimensions } from '@/lib/rubric/resolve-rubric'

const rubric = resolveRubricDimensions({
  dimensions: [
    { name: 'domain_depth', weight: 3, isHardGate: true },
    { name: 'warmth', weight: 1, isHardGate: false },
  ],
})

function modelReport(overrides: Record<string, unknown> = {}) {
  return {
    overallRecommendation: 'strong_yes',
    confidence: 'high',
    summary: 'Model summary.',
    weightedScore: 4.9,
    hardGateTriggered: false,
    topStrengths: ['depth'],
    topConcerns: ['pace'],
    needsManualReview: false,
    dimensionScores: [
      {
        dimension: 'domain_depth',
        score: 2,
        rationale: 'Struggled with fundamentals.',
        evidence: [{ quote: 'I am not sure', rationale: 'uncertain' }],
      },
      {
        dimension: 'warmth',
        score: 5,
        rationale: 'Very personable.',
        evidence: [{ quote: 'great question', rationale: 'warm' }],
      },
    ],
    ...overrides,
  } as never
}

describe('llmReportToAssessmentComputation recomputes rather than trusts', () => {
  test('ignores the model weighted score and derives it from the rubric', () => {
    const result = llmReportToAssessmentComputation(
      modelReport(),
      'completed',
      rubric
    )

    // (2 * 3 + 5 * 1) / 4 = 2.75, not the model's claimed 4.9
    expect(result.weightedScore).toBe(2.75)
  })

  test('fires the template hard gate the model said was clear', () => {
    const result = llmReportToAssessmentComputation(
      modelReport(),
      'completed',
      rubric
    )

    expect(result.hardGateTriggered).toBe(true)
    expect(result.overallRecommendation).toBe('no')
  })

  test('keeps the model rationale, summary and evidence intact', () => {
    const result = llmReportToAssessmentComputation(
      modelReport(),
      'completed',
      rubric
    )

    expect(result.summary).toBe('Model summary.')
    expect(result.dimensionScores[0]?.rationale).toBe(
      'Struggled with fundamentals.'
    )
    expect(result.evidence).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test lib/assessment/llm-report.test.ts`
Expected: FAIL — the function takes two arguments, and returns the model's `4.9`.

- [ ] **Step 3: Rewrite the conversion to derive**

In `lib/assessment/llm-report.ts`, replace `llmReportToAssessmentComputation` (lines 333-354) with:

```ts
/**
 * Converts a model report into a persisted assessment.
 *
 * The model supplies dimension scores, rationale, evidence and prose. Every
 * headline number - weighted score, hard gate, recommendation - is recomputed
 * here from the template rubric, so a model cannot assert an outcome its own
 * dimension scores do not support.
 */
export function llmReportToAssessmentComputation(
  report: LlmAssessmentReport,
  status: AssessmentComputation['status'],
  dimensions: ResolvedRubricDimension[]
): AssessmentComputation {
  const dimensionScores = report.dimensionScores.map((item) => ({
    dimension: item.dimension,
    score: item.score,
    rationale: item.rationale,
  }))

  const { weightedScore, hardGateTriggered, overallRecommendation } =
    deriveAssessmentOutcome({
      dimensionScores,
      dimensions,
      confidence: report.confidence,
    })

  return {
    status,
    overallRecommendation,
    confidence: report.confidence,
    summary: report.summary,
    weightedScore,
    hardGateTriggered,
    topStrengths: report.topStrengths,
    topConcerns: report.topConcerns,
    transcriptQualityNote: report.transcriptQualityNote,
    dimensionScores,
    evidence: toDimensionEvidence(report),
  }
}
```

Add to the imports at the top of `lib/assessment/llm-report.ts`:

```ts
import { deriveAssessmentOutcome } from './scoring-policy'
import {
  resolveRubricDimensions,
  type ResolvedRubricDimension,
} from '@/lib/rubric/resolve-rubric'
```

- [ ] **Step 4: Update both call sites in the hybrid builder**

In `buildHybridAssessmentReport`, resolve the rubric once and pass it through. Replace the two `llmReportToAssessmentComputation(...)` calls (lines 452-455 and 467-470) and add the resolution near the top of the function body:

```ts
const dimensions = resolveRubricDimensions(args.rubricConfig)
```

```ts
const llmAssessment = llmReportToAssessmentComputation(
  sanitizedReport,
  'processing',
  dimensions
)
```

```ts
const report = llmReportToAssessmentComputation(
  sanitizedReport,
  needsManualReview ? 'manual_review' : 'completed',
  dimensions
)
```

- [ ] **Step 5: Update the remaining call site**

In `generateLlmAssessmentReport` (line 407), the conversion also needs the rubric:

```ts
const assessment = llmReportToAssessmentComputation(
  object,
  'processing',
  resolveRubricDimensions(input.rubricConfig)
)
```

- [ ] **Step 6: Add the model-disagreement signal to the cross-check**

The model's self-reported numbers are now advisory, but a large gap is a quality signal worth surfacing. In `buildHybridAssessmentReport`, extend `needsManualReview` (lines 458-465) with:

```ts
const modelContradictedItself =
  Math.abs(sanitizedReport.weightedScore - llmAssessment.weightedScore) >= 1 ||
  sanitizedReport.hardGateTriggered !== llmAssessment.hardGateTriggered
```

and add `modelContradictedItself ||` to the `needsManualReview` expression.

- [ ] **Step 7: Run tests to verify they pass**

Run: `bun run test lib/assessment/`
Expected: PASS. If `process-session.test.ts` breaks, it is asserting on trusted-model values and should be updated to expect derived ones.

- [ ] **Step 8: Full gate and commit**

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test
git add lib/assessment/llm-report.ts lib/assessment/llm-report.test.ts
git commit -m "fix(scoring): recompute score, gate and recommendation instead of trusting the model"
```

### Task 8: Add a scoring calibration suite

**Files:**

- Create: `lib/assessment/calibration.test.ts`

**Interfaces:**

- Consumes: `buildAssessmentReport` from `lib/assessment/report-engine.ts`

**Why:** with Tasks 5-7 changing how every number is produced, there is currently no test that would catch a future prompt or threshold change silently shifting outcomes. This is the regression net.

- [ ] **Step 1: Write the calibration fixtures and assertions**

Create `lib/assessment/calibration.test.ts`:

```ts
import { describe, expect, test } from 'vitest'

import { buildAssessmentReport } from './report-engine'
import type { TranscriptEntry } from './report-engine'

function turn(text: string, index: number): TranscriptEntry {
  return {
    speaker: 'candidate',
    text,
    status: 'final',
    startedAt: new Date(Date.UTC(2026, 7, 21, 10, index)).toISOString(),
  }
}

const strongCandidate: TranscriptEntry[] = [
  'Let me start with a simple example, because I find it helps to ground the idea first.',
  'So think of it as a staircase - first we take one step, then the next, and each step builds on the last.',
  'That is okay, take your time. We can try again with a different approach if this one is not landing.',
  'You mentioned earlier that fractions felt confusing, so based on that let us slice a pizza instead.',
  'What do you think would happen if we doubled the number of slices? Does that make sense so far?',
  'Another way to see it is to imagine sharing sweets between friends, which is the same idea.',
  'Great question - I am glad you asked, because that is exactly the tricky part.',
  'Therefore the answer is one half, and that means the two fractions are equivalent.',
  'Let us try one more together, step by step, and then you can do the next one yourself.',
  'For example, if we had three friends instead of two, we would split it into thirds.',
  'As you said, it is about equal parts, so that is the important thing to hold on to.',
  'In other words, the bottom number tells us how many pieces the whole is cut into.',
  'Can you tell me what you would do next? I want to check I explained that clearly.',
  'No problem at all - that is a really common mix-up and it is fine to get it wrong first time.',
].map(turn)

const weakCandidate: TranscriptEntry[] = [
  'Um, yeah, I guess so.',
  'Maybe. I am not sure.',
  'Like, you know, it just kind of works that way probably.',
].map(turn)

describe('scoring calibration', () => {
  test('a strong teaching transcript does not produce a reject', () => {
    const report = buildAssessmentReport({
      sessionId: 'calib_strong',
      candidateName: 'Strong Candidate',
      templateName: 'Tutor screening',
      transcript: strongCandidate,
    })

    expect(report.hardGateTriggered).toBe(false)
    expect(['mixed', 'yes', 'strong_yes']).toContain(
      report.overallRecommendation
    )
    expect(report.weightedScore).toBeGreaterThanOrEqual(2.75)
  })

  test('a thin uncertain transcript does not produce a hire', () => {
    const report = buildAssessmentReport({
      sessionId: 'calib_weak',
      candidateName: 'Weak Candidate',
      templateName: 'Tutor screening',
      transcript: weakCandidate,
    })

    expect(['no', 'mixed']).toContain(report.overallRecommendation)
    expect(report.confidence).toBe('low')
    expect(report.status).toBe('manual_review')
  })

  test('an empty transcript is never a hire and always needs review', () => {
    const report = buildAssessmentReport({
      sessionId: 'calib_empty',
      candidateName: 'Silent Candidate',
      templateName: 'Tutor screening',
      transcript: [],
    })

    expect(report.overallRecommendation).toBe('no')
    expect(report.status).toBe('manual_review')
  })

  test('weighted score always stays inside the 1-5 band', () => {
    for (const transcript of [strongCandidate, weakCandidate, []]) {
      const report = buildAssessmentReport({
        sessionId: 'calib_band',
        candidateName: 'Candidate',
        templateName: 'Tutor screening',
        transcript,
      })

      expect(report.weightedScore).toBeGreaterThanOrEqual(1)
      expect(report.weightedScore).toBeLessThanOrEqual(5)
    }
  })
})
```

- [ ] **Step 2: Run and record actual behaviour**

Run: `bun run test lib/assessment/calibration.test.ts`
Expected: these assertions are deliberately loose bands, so they should PASS. If one fails, do **not** loosen the band — the failure is telling you the scorer disagrees with the intent of the fixture, which is a real finding. Investigate and report it before adjusting.

- [ ] **Step 3: Commit**

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test
git add lib/assessment/calibration.test.ts
git commit -m "test(scoring): add calibration fixtures guarding recommendation bands"
```

### Task 9: Align the review UI with the corrected gate semantics

**Files:**

- Modify: `components/recruiter/rubric-radar-chart.tsx:38-44` and `:65-98`
- Modify: `components/recruiter/rubric-score-bars-chart.tsx` (same duplicated helper, if present)

**Interfaces:**

- Consumes: `hardGateNamesFrom`, `resolveRubricDimensions` (Task 4)

**The defect:** the chart re-derives hard-gate status locally (F-12), starring dimensions the scorer previously never gated on. With Task 6 landed the engine is correct; this makes the UI read from the same resolver rather than a third copy. Also adds the missing tooltip and readable radius scale (F-11).

- [ ] **Step 1: Replace the local hard-gate helper**

In `components/recruiter/rubric-radar-chart.tsx`, delete the local `isHardGateDimension` function (lines 38-44) and its `isDefaultHardGateDimension` import. Replace the `data` construction with:

```ts
const gatedNames = new Set(hardGateDimensions ?? [])

const data: RadarDatum[] = dimensionScores.map((d) => {
  const hardGate = gatedNames.has(d.dimension)
  const baseLabel = formatDimensionLabel(d.dimension)
  return {
    dimension: d.dimension,
    label: hardGate ? `${baseLabel} *` : baseLabel,
    score: d.score,
    isHardGate: hardGate,
  }
})
```

Add the import:

```ts
import {
  hardGateNamesFrom,
  resolveRubricDimensions,
} from '@/lib/rubric/resolve-rubric'
```

- [ ] **Step 2: Make the caller supply resolved gate names**

Find the page rendering this chart:

Run: `grep -rn "RubricRadarChart" app components`

In that caller, pass gate names resolved from the template rubric rather than leaving the prop undefined:

```tsx
<RubricRadarChart
  dimensionScores={report.dimensionScores ?? []}
  hardGateDimensions={hardGateNamesFrom(
    resolveRubricDimensions(template?.rubricConfig)
  )}
/>
```

- [ ] **Step 3: Add a readable scale and tooltip**

In `components/recruiter/rubric-radar-chart.tsx`, replace the `PolarRadiusAxis` line (line 81) and add a tooltip inside `<RadarChart>`:

```tsx
          <PolarRadiusAxis
            domain={[0, 5]}
            tickCount={6}
            tick={{ fontSize: 9 }}
            axisLine={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
```

Extend the import from the chart primitives:

```ts
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
```

- [ ] **Step 4: Verify the primitives exist**

Run: `grep -n "export .*ChartTooltip" components/ui/chart.tsx`
Expected: both `ChartTooltip` and `ChartTooltipContent` are exported. If not, use the shadcn chart primitive names actually present in that file.

- [ ] **Step 5: Check it renders**

Run: `bun run build`
Expected: build succeeds with no type errors on the review route.

- [ ] **Step 6: Commit**

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test
git add components/recruiter/rubric-radar-chart.tsx app
git commit -m "fix(review): read hard gates from the shared resolver and make the radar readable"
```

---

## Phase 4 — Bound the cost

### Task 10: Meter interview minutes per org

**Files:**

- Modify: `convex/schema.ts` (add table after `agentWorkerHeartbeats`, line 506)
- Create: `convex/helpers/usageRollup.ts`
- Create: `convex/usage.test.ts`
- Modify: `convex/helpers/finalizeInterviewProcessing.ts`

**Interfaces:**

- Produces:
  - `currentUsagePeriod(nowMs: number): string` — `YYYY-MM` in UTC.
  - `recordInterviewUsage(ctx: MutationCtx, args: { orgId: string; durationMs: number; nowMs?: number }): Promise<void>`
  - `getUsageForPeriod(ctx: QueryCtx, args: { orgId: string; period: string }): Promise<{ interviewCount: number; interviewMinutes: number }>`

  Task 11 consumes `getUsageForPeriod` and `currentUsagePeriod`.

**Why:** `activeDurationMs` is tracked per session (`convex/helpers/interviewSession.ts:228`) but never aggregated, so there is no number to enforce a plan cap against and no number to invoice on (F-06).

- [ ] **Step 1: Add the table**

In `convex/schema.ts`, after the `agentWorkerHeartbeats` table definition, add:

```ts
  orgUsageRollups: defineTable({
    orgId: v.string(),
    period: v.string(),
    interviewCount: v.number(),
    interviewMinutes: v.number(),
    updatedAt: v.number(),
  }).index('by_org_and_period', ['orgId', 'period']),
```

- [ ] **Step 2: Write the failing test**

Create `convex/usage.test.ts`:

```ts
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'

import schema from './schema'
import {
  currentUsagePeriod,
  getUsageForPeriod,
  recordInterviewUsage,
} from './helpers/usageRollup'

const modules = import.meta.glob('./**/*.ts')

describe('org usage rollup', () => {
  test('period key is UTC year-month', () => {
    expect(currentUsagePeriod(Date.UTC(2026, 7, 21, 23, 30))).toBe('2026-08')
    expect(currentUsagePeriod(Date.UTC(2026, 0, 1, 0, 0))).toBe('2026-01')
  })

  test('accumulates minutes and counts across sessions', async () => {
    const t = convexTest(schema, modules)
    const nowMs = Date.UTC(2026, 7, 21)

    await t.run(async (ctx) => {
      await recordInterviewUsage(ctx, {
        orgId: 'org_a',
        durationMs: 10 * 60_000,
        nowMs,
      })
      await recordInterviewUsage(ctx, {
        orgId: 'org_a',
        durationMs: 5 * 60_000,
        nowMs,
      })
    })

    const usage = await t.run(async (ctx) =>
      getUsageForPeriod(ctx, { orgId: 'org_a', period: '2026-08' })
    )

    expect(usage.interviewCount).toBe(2)
    expect(usage.interviewMinutes).toBe(15)
  })

  test('orgs are isolated from each other', async () => {
    const t = convexTest(schema, modules)
    const nowMs = Date.UTC(2026, 7, 21)

    await t.run(async (ctx) => {
      await recordInterviewUsage(ctx, {
        orgId: 'org_a',
        durationMs: 60_000,
        nowMs,
      })
      await recordInterviewUsage(ctx, {
        orgId: 'org_b',
        durationMs: 60_000,
        nowMs,
      })
    })

    const usage = await t.run(async (ctx) =>
      getUsageForPeriod(ctx, { orgId: 'org_a', period: '2026-08' })
    )

    expect(usage.interviewCount).toBe(1)
  })

  test('an unseen period reads as zero, not undefined', async () => {
    const t = convexTest(schema, modules)

    const usage = await t.run(async (ctx) =>
      getUsageForPeriod(ctx, { orgId: 'org_new', period: '2026-08' })
    )

    expect(usage).toEqual({ interviewCount: 0, interviewMinutes: 0 })
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun run test convex/usage.test.ts`
Expected: FAIL — `./helpers/usageRollup` does not exist.

- [ ] **Step 4: Write the rollup helper**

Create `convex/helpers/usageRollup.ts`:

```ts
import type { MutationCtx, QueryCtx } from '../_generated/server'

export type OrgUsage = {
  interviewCount: number
  interviewMinutes: number
}

const EMPTY_USAGE: OrgUsage = { interviewCount: 0, interviewMinutes: 0 }

/** Billing periods are calendar months in UTC so they do not drift by tenant. */
export function currentUsagePeriod(nowMs: number = Date.now()): string {
  const date = new Date(nowMs)
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0')
  return `${date.getUTCFullYear()}-${month}`
}

export async function getUsageForPeriod(
  ctx: QueryCtx | MutationCtx,
  args: { orgId: string; period: string }
): Promise<OrgUsage> {
  const row = await ctx.db
    .query('orgUsageRollups')
    .withIndex('by_org_and_period', (q) =>
      q.eq('orgId', args.orgId).eq('period', args.period)
    )
    .first()

  if (!row) {
    return EMPTY_USAGE
  }

  return {
    interviewCount: row.interviewCount,
    interviewMinutes: row.interviewMinutes,
  }
}

/**
 * Accumulates one completed interview into the org's current billing period.
 * Called from finalize, which is the single point every interview passes
 * through regardless of whether it ended cleanly or was reaped.
 */
export async function recordInterviewUsage(
  ctx: MutationCtx,
  args: { orgId: string; durationMs: number; nowMs?: number }
): Promise<void> {
  const nowMs = args.nowMs ?? Date.now()
  const period = currentUsagePeriod(nowMs)
  const minutes = Math.max(0, Math.round(args.durationMs / 60_000))

  const existing = await ctx.db
    .query('orgUsageRollups')
    .withIndex('by_org_and_period', (q) =>
      q.eq('orgId', args.orgId).eq('period', period)
    )
    .first()

  if (existing) {
    await ctx.db.patch(existing._id, {
      interviewCount: existing.interviewCount + 1,
      interviewMinutes: existing.interviewMinutes + minutes,
      updatedAt: nowMs,
    })
    return
  }

  await ctx.db.insert('orgUsageRollups', {
    orgId: args.orgId,
    period,
    interviewCount: 1,
    interviewMinutes: minutes,
    updatedAt: nowMs,
  })
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun run test convex/usage.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Record usage at finalize**

Read `convex/helpers/finalizeInterviewProcessing.ts` in full. Inside `finalizeInterviewForProcessing`, after the session has been transitioned to `processing` and before the function returns, add:

```ts
await recordInterviewUsage(ctx, {
  orgId: session.orgId,
  durationMs: session.activeDurationMs ?? 0,
})
```

Add the import:

```ts
import { recordInterviewUsage } from './usageRollup'
```

Place the call inside the branch that actually performs the transition, so a no-op finalize on an already-processing session does not double-count.

- [ ] **Step 7: Verify no double-count**

Run: `bun run test convex/helpers/finalizeInterviewProcessing.test.ts`
Expected: PASS. Add a case asserting that calling finalize twice on the same session records usage once.

- [ ] **Step 8: Full gate and commit**

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test
bun run convex:once
git add convex/schema.ts convex/helpers/usageRollup.ts convex/usage.test.ts convex/helpers/finalizeInterviewProcessing.ts convex/_generated
git commit -m "feat(billing): meter interview minutes per org per month"
```

### Task 11: Enforce a monthly minutes cap

**Files:**

- Modify: `lib/saas/plans.ts:10-39`
- Modify: `convex/helpers/orgPlan.ts` (re-export surface)
- Modify: `convex/interviews/bootstrap.ts:60-90`
- Modify: `lib/saas/plans.test.ts`

**Interfaces:**

- Consumes: `getUsageForPeriod`, `currentUsagePeriod` (Task 10); `resolveOrgPlanForOrg`, `quotasForPlan` from `convex/helpers/orgPlan.ts`
- Produces: `PlanQuotas` gains `maxInterviewMinutesPerMonth: number`.

- [ ] **Step 1: Add the quota to the type and tiers**

In `lib/saas/plans.ts`, extend `PlanQuotas`:

```ts
export type PlanQuotas = {
  /** Max candidates per screening batch create. */
  maxCandidatesPerBatch: number
  /** Max screening batches created per rolling 30 days (soft product cap). */
  maxBatchesPer30Days: number
  /** Max active invites (status created/opened/in_progress) per org. */
  maxActiveInvites: number
  /** Max metered interview minutes per calendar month. Caps vendor spend. */
  maxInterviewMinutesPerMonth: number
}
```

and add to each tier in `PLAN_QUOTAS`:

```ts
  free: {
    maxCandidatesPerBatch: 10,
    maxBatchesPer30Days: 5,
    maxActiveInvites: 25,
    maxInterviewMinutesPerMonth: 120,
  },
  pro: {
    maxCandidatesPerBatch: 50,
    maxBatchesPer30Days: 50,
    maxActiveInvites: 500,
    maxInterviewMinutesPerMonth: 3_000,
  },
  enterprise: {
    maxCandidatesPerBatch: 200,
    maxBatchesPer30Days: 500,
    maxActiveInvites: 5_000,
    maxInterviewMinutesPerMonth: 40_000,
  },
```

- [ ] **Step 2: Write the failing enforcement test**

Append to `lib/saas/plans.test.ts`:

```ts
import { describe, expect, test } from 'vitest'

import { PLAN_QUOTAS, quotasForPlan } from './plans'

describe('minutes quota', () => {
  test('every tier declares a monthly minutes cap', () => {
    for (const plan of ['free', 'pro', 'enterprise'] as const) {
      expect(quotasForPlan(plan).maxInterviewMinutesPerMonth).toBeGreaterThan(0)
    }
  })

  test('caps increase monotonically with tier', () => {
    expect(PLAN_QUOTAS.free.maxInterviewMinutesPerMonth).toBeLessThan(
      PLAN_QUOTAS.pro.maxInterviewMinutesPerMonth
    )
    expect(PLAN_QUOTAS.pro.maxInterviewMinutesPerMonth).toBeLessThan(
      PLAN_QUOTAS.enterprise.maxInterviewMinutesPerMonth
    )
  })
})
```

- [ ] **Step 3: Run test to verify it passes**

Run: `bun run test lib/saas/plans.test.ts`
Expected: PASS once Step 1 is applied.

- [ ] **Step 4: Enforce at session creation**

In `convex/interviews/bootstrap.ts`, inside `bootstrapPublicSession`, after the expiry and already-submitted checks (after line 90) and **before** the existing-session early returns, add:

```ts
const plan = await resolveOrgPlanForOrg(ctx, invite.orgId)
const quotas = quotasForPlan(plan)
const usage = await getUsageForPeriod(ctx, {
  orgId: invite.orgId,
  period: currentUsagePeriod(),
})

if (usage.interviewMinutes >= quotas.maxInterviewMinutesPerMonth) {
  throw new ConvexError(
    'This workspace has reached its monthly interview limit. Please contact the hiring team.'
  )
}
```

Place it before the existing-session branch so a resumed session is still checked, and keep the message candidate-safe — this string is shown to an interviewee, not a recruiter.

Add the imports:

```ts
import { quotasForPlan, resolveOrgPlanForOrg } from '../helpers/orgPlan'
import { currentUsagePeriod, getUsageForPeriod } from '../helpers/usageRollup'
```

- [ ] **Step 5: Map the error to a clear status**

In `app/api/interviews/bootstrap/route.ts`, extend the status mapping (lines 148-155) with a case for the quota message so the candidate sees 429 rather than 500:

```ts
const status =
  message === 'RATE_LIMITED'
    ? 429
    : message.includes('monthly interview limit')
      ? 429
      : message === 'This interview link has expired.'
        ? 410
        : message === 'This interview has already been submitted.'
          ? 409
          : 500
```

- [ ] **Step 6: Surface usage in billing settings**

In `components/admin/billing-settings-panel.tsx`, near the existing quota rows (lines 145-160), add a minutes row showing consumption against the cap. The component already receives `quotas` from `quotasForPlan(billing.plan)`; pass current-period usage in from the page that renders it, using the query added in Task 10.

- [ ] **Step 7: Full gate and commit**

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test
git add lib/saas/plans.ts lib/saas/plans.test.ts convex/interviews/bootstrap.ts convex/helpers/orgPlan.ts app/api/interviews/bootstrap/route.ts components/admin/billing-settings-panel.tsx
git commit -m "feat(billing): enforce a monthly interview-minutes cap per plan"
```

### Task 12: Bound the scoring call

**Files:**

- Modify: `lib/assessment/llm-report.ts:365-405`

**Interfaces:**

- Consumes: `STUCK_AFTER_MS` from `convex/processingReaper.ts:13` (value `10 * 60 * 1000`)

**The defect:** `generateObject` sets `maxRetries: 2` but no `abortSignal` (F-10). A hung provider connection stalls the assessment until the reaper notices, and with BYOK the endpoint is partly customer-controlled.

- [ ] **Step 1: Add the timeout constant**

In `lib/assessment/llm-report.ts`, near `TRANSCRIPT_PROMPT_CHAR_BUDGET` (line 49), add:

```ts
/**
 * Must stay comfortably under the reaper's stuck-session threshold
 * (`STUCK_AFTER_MS`, 10 minutes) so a hung provider fails fast into the
 * deterministic fallback rather than being reaped as a stuck session.
 */
const SCORING_TIMEOUT_MS = 90_000
```

- [ ] **Step 2: Pass the signal**

In `generateLlmAssessmentReport`, add to the `generateObject` call options, alongside `maxRetries: 2`:

```ts
    abortSignal: AbortSignal.timeout(SCORING_TIMEOUT_MS),
```

- [ ] **Step 3: Verify the fallback catches it**

The existing `try`/`catch` in `lib/assessment/process-session.ts:132-177` already converts any thrown error into a deterministic report with `manual_review` status. Confirm by reading that block — no change needed there, but the abort must surface as a thrown error rather than a resolved empty object.

- [ ] **Step 4: Full gate and commit**

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test
git add lib/assessment/llm-report.ts
git commit -m "fix(scoring): bound the model call with an abort timeout"
```

---

## Phase 5 — Hardening and surface

### Task 13: Close the information leaks

**Files:**

- Modify: `app/api/interviews/bootstrap/route.ts:145-173`
- Modify: `app/api/interviews/process/route.ts:144-166`
- Modify: `convex/interviews/bootstrap.ts:12-46, 119, 162`
- Modify: `app/api/interviews/bootstrap/route.ts:74-102`

Covers F-08 (raw error text to public callers), F-09 (invite token in room name), F-17 (BYOK summary readable by any invite holder).

- [ ] **Step 1: Stop returning internal error text**

In `app/api/interviews/bootstrap/route.ts`, replace the final return (line 173) with:

```ts
return NextResponse.json(
  {
    error:
      status >= 500
        ? 'Unable to start this interview right now. Please try again.'
        : message,
    requestId,
  },
  { status }
)
```

Apply the same shape in `app/api/interviews/process/route.ts` (line 166):

```ts
return NextResponse.json(
  {
    error:
      status === 429
        ? message
        : 'Unable to submit this interview right now. Please try again.',
    requestId,
  },
  { status }
)
```

The full detail already reaches the logger and `reportError`, so nothing is lost operationally.

- [ ] **Step 2: Stop putting the invite token in the room name**

In `convex/interviews/bootstrap.ts`, replace both room-name constructions — the resume path (line 119) and the fresh path (line 162):

```ts
const reopenedRoomName = `interview-${existingSession._id}-${Date.now()}`
```

```ts
const roomName = `interview-${invite._id}-${Date.now()}`
```

Convex ids are opaque and already safe to log. The room-to-session lookup at `convex/livekit.ts:87` uses the `by_room_name` index and is unaffected.

- [ ] **Step 3: Reduce the BYOK summary to a verdict**

In `convex/interviews/bootstrap.ts`, change `getInviteBootstrapByokSummary` to return only what the caller needs:

```ts
export const getInviteBootstrapByokSummary = query({
  args: {
    inviteToken: v.string(),
  },
  returns: v.object({
    hasProviderKeys: v.boolean(),
    providerCount: v.number(),
  }),
  handler: async (ctx, { inviteToken }) => {
    const invite = await ctx.db
      .query('candidateInvites')
      .withIndex('by_invite_token', (q) => q.eq('inviteToken', inviteToken))
      .first()

    if (!invite) {
      return { hasProviderKeys: false, providerCount: 0 }
    }

    const settings = await ctx.db
      .query('workspaceSettings')
      .withIndex('by_org_id', (q) => q.eq('orgId', invite.orgId))
      .first()

    const providerKeys = settings?.providerKeys ?? []

    return {
      hasProviderKeys: providerKeys.length > 0,
      providerCount: providerKeys.length,
    }
  },
})
```

- [ ] **Step 4: Update the consumer**

`app/api/interviews/bootstrap/route.ts:78-102` currently passes `byokSummary.providerKeys` into `validateProviderKeysForBootstrap`. That validation needs the provider list, so move it server-side: add an internal query that returns the provider list and call it with the processing key, or fold the validation into the Convex mutation. Read `lib/agent/validate-provider-keys.ts` first to see exactly which fields it needs, then pick whichever is the smaller change and keep the 503 behaviour identical.

- [ ] **Step 5: Full gate and commit**

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test
git add app/api/interviews convex/interviews/bootstrap.ts
git commit -m "fix(security): stop leaking internal errors, invite tokens and provider config"
```

### Task 14: Consolidate the secret guards and bind BYOK ciphertext

**Files:**

- Modify: `convex/orgs.ts:6-16`
- Modify: `convex/helpers/processingAuth.ts` (add constant-time compare)
- Modify: `convex/helpers/encryption.ts:49-81`
- Modify: `lib/saas/plans.ts:41-78` (delete dead helper)

Covers F-13 (timing-unsafe compare), F-14/F-15 (duplicated guard, dead quota helper), F-16 (no AAD binding).

- [ ] **Step 1: Add a constant-time compare**

In `convex/helpers/processingAuth.ts`, add:

```ts
/** Length-independent comparison so a shared secret cannot be recovered byte-by-byte. */
export function secretsMatch(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }

  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return mismatch === 0
}
```

Use it in `hasTrustedProcessingKeyForEnv` (line 50):

```ts
return secretsMatch(processingKey?.trim() ?? '', configured)
```

- [ ] **Step 2: Fold the webhook guard onto it**

In `convex/orgs.ts`, replace `requireWebhookWriteKey` (lines 6-16) with:

```ts
function requireWebhookWriteKey(writeKey: string) {
  if (!hasTrustedProcessingKey(writeKey)) {
    throw new ConvexError('Invalid write key for Clerk webhook sync.')
  }
}
```

and import it:

```ts
import { hasTrustedProcessingKey } from './helpers/processingAuth'
```

This also strengthens the guard: it now honours the deployment-mode check that the local copy lacked.

- [ ] **Step 3: Bind ciphertext to its owner**

In `convex/helpers/encryption.ts`, add an `additionalData` parameter to both functions:

```ts
function buildAad(context: { orgId: string; provider: string; keyId: string }) {
  return new TextEncoder().encode(
    `${context.orgId}:${context.provider}:${context.keyId}`
  )
}

export async function encryptProviderKey(
  plaintext: string,
  context: { orgId: string; provider: string; keyId: string }
) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const cryptoKey = await getCryptoKey()
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: buildAad(context) },
    cryptoKey,
    new TextEncoder().encode(plaintext)
  )
  return {
    encryptedKey: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
  }
}

export async function decryptProviderKey(args: {
  encryptedKey: string
  iv: string
  context: { orgId: string; provider: string; keyId: string }
}) {
  const cryptoKey = await getCryptoKey()
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToBytes(args.iv),
      additionalData: buildAad(args.context),
    },
    cryptoKey,
    base64ToBytes(args.encryptedKey)
  )
  return new TextDecoder().decode(decrypted)
}
```

- [ ] **Step 4: Update every call site**

Run: `grep -rn "encryptProviderKey\|decryptProviderKey" convex lib`

Update each caller to pass the context. **This is a breaking change for existing ciphertext** — any provider key already stored will fail to decrypt. Since BYOK is not yet in production use, the migration is to have workspace owners re-enter their keys. If any production ciphertext exists, add a fallback that retries decryption without AAD once and re-encrypts with it; do not silently swallow the failure.

- [ ] **Step 5: Delete the dead quota helper**

In `lib/saas/plans.ts`, delete `PlanQuotaExceededError` (lines 41-63) and `assertCandidatesPerBatch` (lines 65-78). The candidate cap is enforced inline at `convex/recruiter/screenings.ts:236-241`; these are an unused second implementation.

Run: `grep -rn "assertCandidatesPerBatch\|PlanQuotaExceededError" .` and remove the now-dead assertions from `lib/saas/plans.test.ts`.

- [ ] **Step 6: Full gate and commit**

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test
git add convex/orgs.ts convex/helpers/processingAuth.ts convex/helpers/encryption.ts lib/saas/plans.ts lib/saas/plans.test.ts
git commit -m "refactor(security): unify secret guards, bind BYOK ciphertext, drop dead quota helper"
```

### Task 15: Give the dashboard something to look at

**Files:**

- Create: `components/recruiter/dashboard-charts.tsx`
- Modify: `convex/recruiter/dashboard.ts`
- Modify: `app/(admin)/recruiter/page.tsx`

Covers F-11's second half — the dashboard currently has no visualization at all, so an account with real data still looks empty.

- [ ] **Step 1: Read what the dashboard query already returns**

Run: `cat convex/recruiter/dashboard.ts`

Identify which of these are already available: session counts by state, report counts by recommendation, batch completion. Only add what is genuinely missing rather than duplicating existing aggregation.

- [ ] **Step 2: Extend the summary query with a recommendation mix**

In `convex/recruiter/dashboard.ts`, inside `getDashboardSummary`, add a recommendation tally computed from the org's released reports, returned as:

```ts
    recommendationMix: v.array(
      v.object({
        recommendation: recommendationValidator,
        count: v.number(),
      })
    ),
```

Use the existing `by_org_id_and_status` index on `assessmentReports` and bound the read with `.take()` — do not `.collect()` the org's full report history.

- [ ] **Step 3: Build the chart component**

Create `components/recruiter/dashboard-charts.tsx` as a client component rendering a bar chart of the recommendation mix, following the exact structure of `components/recruiter/rubric-score-bars-chart.tsx` — same `ChartContainer` usage, same `ChartEmptyState` import for the zero-data case, same `var(--chart-N)` colour tokens so it inherits theming.

- [ ] **Step 4: Render it**

In `app/(admin)/recruiter/page.tsx`, place the chart below the existing summary tiles, passing `summary.recommendationMix`.

- [ ] **Step 5: Verify the empty case**

Confirm a brand-new org with zero reports renders `ChartEmptyState` rather than an axis with no bars. This is the state most new customers see first.

- [ ] **Step 6: Full gate and commit**

```bash
bun run fmt && bun run lint && bun run typecheck && bun run test && bun run build
git add components/recruiter/dashboard-charts.tsx convex/recruiter/dashboard.ts app/\(admin\)/recruiter/page.tsx
git commit -m "feat(dashboard): chart the recommendation mix on the recruiter overview"
```

### Task 16: Reconcile the docs

**Files:**

- Modify: `TODO.md`
- Modify: `.docs/current-findings.md`

- [ ] **Step 1: Correct the email status**

In `TODO.md`, the "SaaS ops scaffolds" section states invite email call sites are still TODO. Invite email is wired at `lib/recruiter/send-batch-invite-emails.ts:89`. Update that line to record invite email as done and report-ready email as the remaining gap.

- [ ] **Step 2: Record what this plan changed**

Append a dated entry to `.docs/current-findings.md` summarising: the dev-seed gate now requires an explicit development deployment; scoring derives all headline numbers from the template rubric; transcripts are single-written per speaker; interview minutes are metered and capped per plan.

- [ ] **Step 3: Commit**

```bash
git add TODO.md .docs/current-findings.md
git commit -m "docs: reconcile TODO and findings with audit remediation"
```

---

## Verification

After all tasks, run the full repo gate:

```bash
bun run fmt && bun run lint && bun run test && bun run typecheck && bun run build
```

Then regenerate and diff the Convex API surface, which catches any function accidentally left public:

```bash
bun run convex:once && git diff --exit-code -- convex/_generated
```

Then confirm F-01 specifically, since it is the finding that motivated this plan:

```bash
grep -n "internalAction" convex/devSeed.ts
```

Expected: `resetDevData` and `seedDevData` are both `internalAction`.

## Self-review notes

- **Spec coverage:** F-01 → Task 1. F-02 → Task 7. F-03 → Tasks 4-6. F-04 → Task 2. F-05 → Task 3. F-06 → Tasks 10-11. F-07 (corrected) → Task 14 Step 5. F-08 → Task 13. F-09 → Task 13. F-10 → Task 12. F-11 → Tasks 9, 15. F-12 → Task 9. F-13 → Task 14. F-14 → Task 14. F-15 → Task 14. F-16 → Task 14. F-17 → Task 13. F-18 → Task 16. Task 8 adds the calibration net the audit recommended but did not number.
- **Known open question, Task 13 Step 4:** the BYOK validation currently needs the provider list on the Next.js side. Two viable shapes are described; the implementer picks after reading `lib/agent/validate-provider-keys.ts`. Flag the choice made in the commit message.
- **Breaking change, Task 14 Step 4:** AAD binding invalidates existing BYOK ciphertext. Confirm whether any production provider keys exist before running this task.
