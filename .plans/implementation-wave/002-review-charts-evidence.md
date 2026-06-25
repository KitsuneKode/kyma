# Plan 002: Review charts and evidence UX

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `.plans/implementation-wave/README.md`.
>
> **Drift check (run first)**: `git diff --stat e1fa1d1..HEAD -- components/recruiter/chart-states.tsx components/recruiter/session-activity-liveline.tsx components/recruiter/citation-list.tsx components/recruiter/video-evidence-panel.tsx components/recruiter/candidate-review-workspace.tsx`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: .plans/implementation-wave/001-recruiter-correctness.md
- **Category**: bug
- **Planned at**: commit `e1fa1d1`, 2026-06-25

## Why this matters

Review console charts lacked error fallbacks and playback sync; citations could not jump to transcript; empty video evidence vanished entirely. These gaps slow recruiter evidence review.

## Current state

- `components/recruiter/chart-states.tsx` — loading/empty; add `ChartErrorState`.
- `lib/recruiter/session-activity-series.ts` — `engagementAtTime()` for playhead.
- `components/recruiter/session-activity-liveline.tsx` — accepts `currentTimeSec`, playhead line.
- `components/recruiter/citation-list.tsx` — `onJumpToTime` prop; requires `ReviewProvider` wrapping chat.
- `components/recruiter/video-evidence-panel.tsx` — show empty state instead of `null`.
- Liveline is review-scoped only (not dashboard) per system.md.

## Commands you will need

| Purpose | Command                                                         | Expected on success |
| ------- | --------------------------------------------------------------- | ------------------- |
| Tests   | `bun run test -- lib/recruiter/session-activity-series.test.ts` | pass                |
| Build   | `bun run build`                                                 | exit 0              |

## Scope

**In scope**:

- Chart error boundary + wrappers on rubric charts
- Liveline playhead sync via `review-context`
- Citation jump wired through `CandidateReviewWorkspace` + `RecruiterChat`
- Video evidence empty state
- Craft pass: token shadows on batch detail, `tabular-nums` on metrics

**Out of scope**: Citation hover-card, dashboard Liveline.

## Steps

### Step 1: Chart error states

Add `ChartErrorState` and `ChartErrorBoundary`; wrap `RubricRadar` and `RubricScoreBars` lazy charts.

### Step 2: Liveline playhead

Pass `currentTimeSec` from playback into liveline; add `ReviewTimelinePanel` using `useReviewPlayback()`.

### Step 3: Evidence UX

Lift `ReviewProvider` to `candidate-review-workspace.tsx`; wire `CitationList` in chat; video panel empty state.

**Verify**: `bun run test && bun run build` → pass

## Done criteria

- [x] Charts show error panel on render failure
- [x] Liveline highlights playhead during playback
- [x] Copilot citations seek transcript
- [x] Video panel explains missing clips
- [x] `.plans/implementation-wave/README.md` row 002 = DONE

## STOP conditions

- `useReviewActions` throws outside provider after workspace refactor
- Liveline dynamic import fails at build time

## Maintenance notes

- Timeline tab must stay inside `ReviewProvider` for playhead sync.
