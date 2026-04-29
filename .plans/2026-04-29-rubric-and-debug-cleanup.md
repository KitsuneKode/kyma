# Rubric Radar Chart + Debug Log Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove a hardcoded debug-log network call that fires in production, and add a radar chart to the recruiter rubric view so dimension scores are visible at a glance.

**Architecture:** The debug leak is a self-contained removal in one component. The radar chart is a new `RubricRadar` component rendered inside `RubricVerdict` above the existing dimension list; it uses recharts `RadarChart` fed by the same `dimensionScores` prop that already exists.

**Tech Stack:** Next.js 15 App Router, React, recharts (new dep), shadcn/ui, motion/react, TypeScript, Convex, Vitest.

---

## File Map

| Action | File                                           | Purpose                                                  |
| ------ | ---------------------------------------------- | -------------------------------------------------------- |
| Modify | `components/interview/interview-workspace.tsx` | Remove `emitDebugLog` function + all 2 call sites        |
| Create | `components/recruiter/rubric-radar.tsx`        | Radar chart component wrapping recharts `RadarChart`     |
| Modify | `components/recruiter/rubric-verdict.tsx`      | Import and render `RubricRadar` above the dimension list |

---

## Task 1: Remove debug log leak

**Files:**

- Modify: `components/interview/interview-workspace.tsx:117-141` (function definition), `237-249` (first call site), `640-651` (second call site)

- [ ] **Step 1: Delete the `emitDebugLog` function body (lines 117–141)**

Open `components/interview/interview-workspace.tsx`. Delete this entire block:

```ts
function emitDebugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>
) {
  // #region agent log
  fetch('http://127.0.0.1:7775/ingest/c816eaeb-acd1-4edb-bd45-1464db25af33', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'af8e6a',
    },
    body: JSON.stringify({
      sessionId: 'af8e6a',
      runId: 'baseline',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion
}
```

- [ ] **Step 2: Remove first call site inside `handleParticipantConnected`**

Delete the entire `emitDebugLog(...)` block at around line 237 (inside `handleParticipantConnected`). The block looks like:

```ts
emitDebugLog(
  'J3',
  'components/interview/interview-workspace.tsx:handleParticipantConnected',
  'remote participant connected',
  {
    participantIdentity: participant.identity,
    isAgentLike:
      participant.identity.includes('agent') ||
      participant.identity.includes('tutor-screener'),
  }
)
```

- [ ] **Step 3: Remove second call site inside `handleRoomConnected`**

Delete the entire `emitDebugLog(...)` block inside `handleRoomConnected` (around line 640):

```ts
emitDebugLog(
  'J4',
  'components/interview/interview-workspace.tsx:handleRoomConnected',
  'candidate connected to room and awaiting remote participants',
  {
    roomName: roomNameRef.current ?? bootstrappedSession?.roomName ?? null,
  }
)
```

- [ ] **Step 4: Typecheck to confirm no dangling references**

```bash
bun run typecheck
```

Expected: No errors referencing `emitDebugLog`.

- [ ] **Step 5: Commit**

```bash
git add components/interview/interview-workspace.tsx
git commit -m "fix(interview): remove hardcoded debug log network calls"
```

---

## Task 2: Install recharts

**Files:**

- Modify: `package.json` (via bun)

- [ ] **Step 1: Add recharts**

```bash
bun add recharts
```

- [ ] **Step 2: Verify it resolved**

```bash
bun run typecheck
```

Expected: Passes (recharts ships its own types).

- [ ] **Step 3: Commit lockfile**

```bash
git add package.json bun.lock
git commit -m "chore(deps): add recharts for rubric radar chart"
```

---

## Task 3: Build `RubricRadar` component

**Files:**

- Create: `components/recruiter/rubric-radar.tsx`

The component receives the same `dimensionScores` shape that `RubricVerdict` already has, maps dimension keys through the existing `formatDimensionLabel` formatter, and renders a recharts `RadarChart`.

- [ ] **Step 1: Create the file**

```tsx
// components/recruiter/rubric-radar.tsx
'use client'

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts'
import { formatDimensionLabel } from '@/lib/recruiter/format'

type RadarDatum = {
  dimension: string
  score: number
  label: string
}

type RubricRadarProps = {
  dimensionScores: Array<{
    dimension: string
    score: number
  }>
}

export function RubricRadar({ dimensionScores }: RubricRadarProps) {
  const data: RadarDatum[] = dimensionScores.map((d) => ({
    dimension: d.dimension,
    label: formatDimensionLabel(d.dimension),
    score: d.score,
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart
        data={data}
        margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
      >
        <PolarGrid gridType="polygon" stroke="rgba(255,255,255,0.07)" />
        <PolarAngleAxis
          dataKey="label"
          tick={{
            fill: 'hsl(var(--muted-foreground))',
            fontSize: 10,
            fontWeight: 500,
          }}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.15}
          strokeWidth={1.5}
          dot={false}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck
```

Expected: No errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add components/recruiter/rubric-radar.tsx
git commit -m "feat(rubric): add RubricRadar component"
```

---

## Task 4: Wire `RubricRadar` into `RubricVerdict`

**Files:**

- Modify: `components/recruiter/rubric-verdict.tsx`

- [ ] **Step 1: Add the import at the top of `rubric-verdict.tsx`**

Add after the existing imports:

```tsx
import { RubricRadar } from './rubric-radar'
```

- [ ] **Step 2: Render the radar between the donut and the dimension list**

In `rubric-verdict.tsx`, find the closing `</div>` of the donut section (the block with `mb-8 flex flex-col items-center py-6`) and add `<RubricRadar>` immediately after it, before the `<div className="flex flex-col gap-1">` that opens the dimension list:

```tsx
{
  /* Dimension radar overview */
}
;<div className="mb-6 px-2">
  <RubricRadar dimensionScores={dimensionScores} />
</div>
```

The full updated return of `RubricVerdict` should look like:

```tsx
return (
  <div className="flex flex-col">
    {/* Massive Typographic Focal Point + Animated Ring */}
    <div className="mb-8 flex flex-col items-center py-6">
      {/* ... existing SVG donut unchanged ... */}
    </div>

    {/* Dimension radar overview */}
    <div className="mb-6 px-2">
      <RubricRadar dimensionScores={dimensionScores} />
    </div>

    <div className="flex flex-col gap-1">
      {/* ... existing dimension list unchanged ... */}
    </div>
  </div>
)
```

- [ ] **Step 3: Typecheck**

```bash
bun run typecheck
```

Expected: Clean.

- [ ] **Step 4: Lint and format**

```bash
bun run fmt && bun run lint
```

Expected: No errors or warnings.

- [ ] **Step 5: Commit**

```bash
git add components/recruiter/rubric-verdict.tsx
git commit -m "feat(rubric): render radar chart above dimension list in RubricVerdict"
```

---

## Self-Review Checklist

- [x] **Debug leak removed**: All 3 locations (function + 2 call sites) covered in Task 1.
- [x] **No placeholder code**: Every step has actual code.
- [x] **Type consistency**: `dimensionScores` prop type is `Array<{ dimension: string; score: number }>` in both `RubricVerdict` (existing) and `RubricRadar` (new) — the shape flows through unchanged.
- [x] **`formatDimensionLabel` exists**: Confirmed at `lib/recruiter/format.ts` — both components use the same import path.
- [x] **recharts installed before use**: Task 2 adds the dep, Tasks 3–4 use it.
- [x] **Processing key gate**: Already correctly enforced in `convex/recruiter.ts:467–474` — no code change needed.
- [x] **Middleware gap**: Intentionally out of scope — it's a future hardening task, not a bug today.
