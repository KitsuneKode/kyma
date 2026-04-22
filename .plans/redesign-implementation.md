# Kyma UI Redesign — Implementation Plan

## Context

This plan implements the redesign PRD (`.docs/redesign-prd-v2.md`) with design engineering principles from three skills: frontend-design (premium editorial aesthetic), emil-design-eng (animation craft, easing, interaction feedback), and make-interfaces-feel-better (surfaces, typography, concentric radii, shadows). The goal is to take every existing surface from prototype quality to production-grade, applying taste as a differentiator.

## Resolved Design Decisions (Binding)

1. **Button easing**: `cubic-bezier(0.23, 1, 0.32, 1)` (Emil Kowalski standard), not the PRD's `[0.25, 0.1, 0.25, 1]`
2. **Button active state**: `active:scale-[0.96]` replaces `translate-y-px`
3. **Hero layout**: Two-column `lg:grid-cols-[1.1fr_0.9fr]` (content left, video right). Remove spring animations (1.5-2s violate 300ms budget)
4. **Theme**: Force `light` via `forcedTheme="light"`, remove hotkey toggle until P2
5. **LiveKit height**: `h-[min(720px,calc(100svh-200px))]` (responsive, not fixed)
6. **Admin hub data**: Derive from existing `listReviewCandidates` + `listScreeningBatches` queries — no new Convex query
7. **CitationList**: `citationsJson` is already `{ ref, label, kind }[]` JSON string — client-side `JSON.parse()`, no backend change
8. **Header nav**: Section anchors (`#how-it-works`, `#role-pathways`), login → `/admin`, remove Sign Up (recruiter-invite-only)
9. **antialiased**: Already on `<body>` at `layout.tsx:77` — no action needed

## Phase Dependency Graph

```
A (Foundation) ──┬──> B (Shared Components) ──┬──> E (Recruiter Flow)
                 ├──> C (Landing Page)         │
                 └──> D (Candidate Flow) ──────┘
```

---

## Phase A: Foundation (Design System + P0 Fixes)

### A1. Remove emitDebugLog (CRITICAL)

| File                                                   | Action                                    |
| ------------------------------------------------------ | ----------------------------------------- |
| `components/interview/interview-workspace.tsx:118-142` | Delete `emitDebugLog` function definition |
| `components/interview/interview-workspace.tsx:~501`    | Delete call site                          |
| `agents/interviewer.ts:84-108`                         | Delete `emitDebugLog` function definition |
| `agents/interviewer.ts:243,255,330,409`                | Delete all call sites                     |

Verify: `grep -rn "127.0.0.1\|emitDebugLog" . --include="*.ts" --include="*.tsx"` → 0 matches

### A2. Design tokens: custom easing CSS variable

| File                            | Action                                                 |
| ------------------------------- | ------------------------------------------------------ |
| `app/globals.css` `:root` block | Add `--ease-out-expo: cubic-bezier(0.23, 1, 0.32, 1);` |

### A3. Fix button base class

| File                                         | Action                                                                                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/ui/button.tsx` CVA base (line 7) | Replace `transition-all` → `transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]` |
| Same line                                    | Replace `active:not-aria-[haspopup]:translate-y-px` → `active:not-aria-[haspopup]:scale-[0.96]`                                                    |

### A4. Create motion presets module

Create `lib/motion/presets.ts`:

```ts
export const motionPresets = {
  enter: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.15 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.97 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] },
  },
} as const
```

Create `lib/motion/use-motion.ts`:

```ts
import { useReducedMotion } from 'motion/react'
import { motionPresets } from './presets'

export function useMotionPreset(preset: keyof typeof motionPresets) {
  const reduced = useReducedMotion()
  return reduced ? {} : motionPresets[preset]
}
```

### A5. Fix animated-group zoom preset

| File                                  | Action                                                      |
| ------------------------------------- | ----------------------------------------------------------- |
| `components/ui/animated-group.tsx:62` | Change `hidden: { scale: 0.5 }` → `hidden: { scale: 0.95 }` |

Rationale: scale(0.5) violates "never animate from scale(0)" — 0.95 is subtle and premium.

### A6. Force light theme

| File                               | Action                                                           |
| ---------------------------------- | ---------------------------------------------------------------- |
| `app/providers.tsx:13`             | Change `<ThemeProvider>` → `<ThemeProvider forcedTheme="light">` |
| `components/theme-provider.tsx:18` | Remove `<ThemeHotkey />` JSX mount (keep function for P2)        |

---

## Phase B: Shared Component Extraction

**Prerequisite**: Phase A complete.

### B1. Install @tanstack/react-table

```bash
bun add @tanstack/react-table
```

### B2. Extract MetricCard → `components/admin/metric-card.tsx`

```ts
type MetricCardProps = {
  label: string
  value: string
  detail?: string
}
```

Styling: `rounded-xl shadow-sm bg-card p-5` (shadow over border). Value: `text-xl font-semibold tracking-tight tabular-nums`. Label: `text-xs font-medium tracking-wide text-muted-foreground uppercase`.

Delete local definitions from:

- `admin/candidates/page.tsx` (lines ~210-228)
- `admin/candidates/[sessionId]/page.tsx` (lines ~479-497)
- `admin/screenings/[batchId]/page.tsx` (lines ~168-188)

Verify: `grep -rn "function MetricCard" --include="*.tsx"` → exactly 1 match

### B3. Extract InfoCard / InfoRow → `components/admin/info-card.tsx`, `info-row.tsx`

InfoCard: `{ title: string; description?: string; children: ReactNode }` — `rounded-xl shadow-sm bg-card p-6`
InfoRow: `{ label: string; value: ReactNode }` — value as ReactNode for flexibility

Delete inline definitions from `admin/candidates/[sessionId]/page.tsx` (lines ~499-551)

### B4. Extract PageHeader → `components/admin/page-header.tsx`

```ts
type PageHeaderProps = {
  eyebrow: string
  title: string
  description?: string
  actions?: ReactNode
}
```

Standardizes: eyebrow `text-xs font-medium tracking-wide text-muted-foreground uppercase`, title `text-3xl font-semibold tracking-tight text-balance`, description `mt-2 max-w-3xl text-sm text-muted-foreground text-pretty`. Wrapper: `rounded-xl shadow-sm bg-card p-6`.

Replace inline headers in: `admin/page.tsx`, `admin/candidates/page.tsx`, `admin/screenings/page.tsx`, `admin/screenings/[batchId]/page.tsx`, `admin/candidates/[sessionId]/page.tsx`

### B5. Build DataTable → `components/ui/data-table.tsx`

shadcn data-table recipe with `@tanstack/react-table`. Generic `<DataTable<TData, TValue> columns={columns} data={data} />`. Client-side sorting, basic search input, row click handler. Styling: `rounded-xl shadow-sm overflow-hidden bg-card`, headers `bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase font-medium`.

### B6. Add Skeleton → `components/ui/skeleton.tsx`

Standard shadcn: `<div className="animate-pulse rounded-md bg-muted" />` with className passthrough.

---

## Phase C: Landing Page Redesign

**Prerequisite**: Phase A complete (motion presets).

### C1. Restructure hero-main.tsx

Full rewrite of `components/marketing/sections/hero-main.tsx`:

- **Delete**: `transitionVariants` (spring 1.5-2s), `AnimatedGroup` wrapping, `TextEffect` imports
- **Extend props**: add `showcaseVideoSrc?: string`, `showcasePosterSrc?: string`
- **Layout**: center-aligned stack → `grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]`
- **Left column**: eyebrow badge, `text-5xl md:text-6xl font-semibold tracking-tight text-balance` title, `text-lg text-muted-foreground text-pretty max-w-xl` subtitle, dual CTA
- **Right column**: `<video autoPlay muted loop playsInline>` when video provided, `<Image>` fallback
- **Motion**: `motion.div` with `motionPresets.enter`, 100ms stagger between columns
- **Remove**: radial gradient background decorations

### C2. Update hero copy in hero-section.tsx

| Prop                 | Before                                     | After                                                                                                                                             |
| -------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eyebrow`            | "Introducing Support for AI Models"        | "AI-Powered Tutor Screening"                                                                                                                      |
| `title`              | "Modern Solutions for Customer Engagement" | "Screen tutors with evidence, not guesswork"                                                                                                      |
| `subtitle`           | generic website builder copy               | "Kyma runs structured voice interviews with AI, then delivers rubric-scored reports so your team can make confident hiring decisions in minutes." |
| `primaryCta.label`   | "Start Building"                           | "Try a demo interview"                                                                                                                            |
| `secondaryCta.label` | "Request a demo"                           | "Recruiter login"                                                                                                                                 |
| `secondaryCta.href`  | "/video-demo"                              | "/admin"                                                                                                                                          |
| images               | `/mail2.png`                               | product screenshot or video                                                                                                                       |

Remove unused Tabler icon imports.

### C3. Fix social-proof transitions

`components/marketing/sections/social-proof.tsx:30`: Replace `transition-all duration-500` → `transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]`

### C4. Build 4 missing landing sections

All in `components/marketing/sections/`:

| File                     | Component                    | Content                                                       | Layout                                                                |
| ------------------------ | ---------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| `how-it-works.tsx`       | `MarketingHowItWorks`        | 3-step flow: invite → AI interview → evidence report          | `grid md:grid-cols-3 gap-8`, stagger 100ms                            |
| `role-pathways.tsx`      | `MarketingRolePathways`      | "For Candidates" + "For Recruiters" cards                     | `grid md:grid-cols-2 gap-6`, cards `rounded-xl shadow-sm bg-card p-8` |
| `system-credibility.tsx` | `MarketingSystemCredibility` | 4 trust cards (encryption, rubric, durability, human-in-loop) | `grid sm:grid-cols-2 lg:grid-cols-4 gap-6`                            |
| `final-cta.tsx`          | `MarketingFinalCta`          | Repeat dual-track CTA, centered, `py-24`                      | Centered text block                                                   |

Add `id` attributes for header anchor links. Compose all into `hero-section.tsx` sections array.

### C5. Update header navigation

`components/marketing/header.tsx`:

- `menuItems` → `[{ name: 'How it works', href: '#how-it-works' }, { name: 'For recruiters', href: '#role-pathways' }]`
- Replace `transition-all duration-300` → specific properties
- Login → `/admin`, remove Sign Up button, "Get Started" → `/admin`

Verify: `grep -n "Modern Solutions\|mail2.png\|Start Building" components/marketing/` → 0 matches

---

## Phase D: Candidate Flow Polish

**Prerequisite**: Phase A complete.

### D1. Replace hardcoded brand

`components/interview/invite-lobby.tsx:27`: `"Cuemath Tutor Screening"` → template name from snapshot prop or `'Interview Session'` fallback.

**Copy tightening requirements (binding):**

- Brand identity must consistently use **Kyma** in product-owned surfaces.
- Prejoin header pattern:
  - Default: `Kyma Interview`
  - If tenant/company name exists in session context: `<CompanyName> interview on Kyma`
  - Never hardcode another company name in source.
- Replace implementation-centric copy with candidate-centric clarity:
  - Avoid mentioning internal stack names or "first version" language in candidate-facing UI.
  - Keep tone calm and precise; no hype, no exclamation marks.
- Prejoin copy must answer three questions in under one viewport:
  1. What this session is.
  2. How long it may take.
  3. What to do next.
- Primary CTA labels:
  - Use sentence case and explicit intent (`Join interview`, `Submit interview`).
  - Pending labels must use ellipsis character (`Preparing interview…`, `Submitting…`), not `...`.

### D2. Remove CSS hack

| File                                        | Action                                                       |
| ------------------------------------------- | ------------------------------------------------------------ |
| `app/globals.css:210-215`                   | Delete `@layer components { .kyma-meeting-shell ... }` block |
| `components/interview/meeting-shell.tsx:88` | Remove `kyma-meeting-shell` class                            |

Already redundant — `ControlBar controls={{ chat: false, leave: false }}` handles this.

### D3. Fix LiveKit room height

`components/interview/meeting-shell.tsx`: Replace `h-[720px]` → `h-[min(720px,calc(100svh-200px))]`

### D4. Post-call processing skeleton

`components/interview/interview-workspace.tsx` processing view (~lines 793-806):

- Add staged status indicators using `Skeleton` component (B6)
- 3 rows: "Transcript saved" ✓, "Assessment running" (pulse), "Report ready" (pending)
- "The team will review the conversation and follow up with you."
- `motionPresets.enter` on mount

**Loading-state tightening requirements (binding):**

- Processing state must be staged and deterministic:
  - Stage 1: `Transcript saved`
  - Stage 2: `Assessment running`
  - Stage 3: `Report ready`
- Each stage must have a visual state token:
  - complete = check icon + full opacity
  - active = skeleton/pulse + emphasized label
  - pending = muted label + no pulse
- Avoid ambiguous wording like "next" or "soon"; provide explicit expectation:
  - `You can close this page safely. The recruiter review is prepared from your saved transcript and session evidence.`
- If processing API fails, show a dedicated recovery block:
  - clear error title
  - one-line explanation
  - one explicit next action (`Retry submission` or `Contact recruiter`)

---

## Phase E: Recruiter Flow Redesign

**Prerequisite**: Phase A + Phase B complete.

### E1. Decision-first candidate detail layout

Create `components/recruiter/decision-bar.tsx`:

- Sticky bar: `sticky top-0 z-10 rounded-xl shadow-sm bg-card`
- Layout: recommendation badge (left) + confidence (center) + ReviewActions inline (right)

Modify `admin/candidates/[sessionId]/page.tsx`:

- Move ReviewActions from aside (line 309) into DecisionBar at page top
- Page order: PageHeader → DecisionBar → MetricCards → two-column (main + side rail)

### E2. Migrate candidate queue to DataTable

`admin/candidates/page.tsx`: Replace raw `<table>` (lines ~110-203) with `<DataTable>`. Sortable columns: Recommendation, Session date. Row click → detail page.

**Queue scanability and copy tightening (binding):**

- Table cell copy must be scan-first:
  - first line = primary fact
  - second line = muted supporting context
  - avoid multi-clause sentences inside cells
- Normalize status vocabulary across queue and detail:
  - use one canonical label set for session/report/review states
  - do not mix synonyms (e.g., "Not reviewed" vs "Pending review") in different places
- Numeric fields in queue must use `tabular-nums`.
- Empty queue state must include one operational next step CTA (`Run demo interview` or `Create screening batch`).

### E3. Migrate screening tables to DataTable

- `admin/screenings/page.tsx`: Replace raw `<table>` (lines ~74-119)
- `admin/screenings/[batchId]/page.tsx`: Replace candidates `<table>` (lines ~120-161)

Verify: `grep -rn "<table" "app/(app)/admin/" --include="*.tsx"` → 0 matches

### E4. Fix citation rendering

Create `components/recruiter/citation-list.tsx`:

- Parse `citationsJson` via `JSON.parse()`
- Render each as compact card: `rounded-lg bg-muted/30 px-3 py-2`
- Show `kind` badge, `label` text, `ref` identifier

Modify `components/recruiter/recruiter-chat.tsx:123-127`: Replace raw JSON dump with `<CitationList>`.

**Recruiter copilot response-state tightening (binding):**

- During submit:
  - disable submit action
  - keep input editable only if no conflicting request is active
  - show `Thinking…` consistently
- On error:
  - show actionable message with next step (retry/rephrase)
  - keep user question intact in input for quick retry
- Citation rendering rules:
  - each citation row: `[kind badge] [label] [ref]`
  - truncate long labels safely with tooltip or wrap strategy
  - never display raw JSON text

### E5. Admin hub with live data

Full rewrite of `admin/page.tsx`:

- Delete hardcoded `nowTasks`/`futureTasks` arrays
- Convert to async server component with Convex queries
- 3 MetricCards (sessions today, reports pending, active batches) + 2 navigation cards
- Derive stats from existing query results client-side

### E6. Loading skeletons + empty states

All admin pages: add `PageSkeleton` component (4 metric card skeletons + table skeleton). Consistent pattern using `Skeleton` from B6.

**Global loading/empty/error contract for admin pages (binding):**

- Loading:
  - always render page shell first (header + frame), then skeleton content
  - avoid layout shift by matching skeleton geometry to final cards/table rows
- Empty:
  - include context sentence + one primary action
  - never show empty table chrome without guidance text
- Error:
  - include: what failed, what remains usable, and what user can do now
  - include retry affordance when operation is repeatable
- Perceived performance:
  - if data resolves quickly, keep minimum skeleton visibility (~300ms) to avoid flash/flicker
  - do not animate skeleton opacity with long durations

---

## Global Design Engineering Rules (Apply to Every File Touched)

1. **Never `transition: all`** — enumerate properties explicitly
2. **Active state**: `active:scale-[0.96]` on pressable elements, 150ms ease-out
3. **Shadows over borders** for card elevation; borders only for structural dividers
4. **Concentric radius**: outer = inner + padding
5. **Typography**: `text-balance` on headings, `text-pretty` on body, `tabular-nums` on numbers
6. **Motion budget**: max 300ms, enter 200ms, exit 150ms, no decorative animation
7. **Reduced motion**: gate through `useMotionPreset`, zero animation when `prefers-reduced-motion: reduce`
8. **Hit areas**: min 40×40px on interactive elements
9. **Copy voice**: calm, precise, no emoji, no superlatives, no exclamation marks
10. **Copy clarity**: action labels must be explicit and consistent across pages
11. **State language**: loading/empty/error text must always include a concrete next step

## Verification (after all phases)

```bash
# P0 safety
grep -rn "127.0.0.1\|emitDebugLog" . --include="*.ts" --include="*.tsx"        # → 0
grep -rn "function MetricCard" . --include="*.tsx" | wc -l                       # → 1
grep -rn "<table" "app/(app)/admin/" --include="*.tsx"                           # → 0
grep -n "lk-disconnect\|kyma-meeting-shell" app/globals.css                      # → 0
grep -n "Cuemath" components/interview/                                          # → 0
grep -n "transition-all" components/ui/button.tsx                                # → 0
grep -n "Modern Solutions\|mail2.png\|Start Building" components/marketing/      # → 0

# Build
bun run fmt && bun run lint && bun run typecheck && bun run test
```
