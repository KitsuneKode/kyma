# Kyma Workspace Design System

## Domain

Screening batches, invite tokens, session lifecycle, evidence-backed rubrics, release gates, recruiter decisions.

## Palette

- Background: parchment `#e9e4d8` (light), charcoal `#0a0a0a` (dark interview shell)
- Ink: `#1e1e1e` / `#e8e3da`
- Attention: amber (pending, manual review)
- Released / success: emerald
- Primary CTA: charcoal (light) / electric lime `#e8ff47` (dark)

## Signature

- Recruiter: evidence-backed review console with sticky decision bar
- Candidate: vertical timeline rail (Active → Pending release → Released)

## Depth

ONE strategy, committed: `ring-1` border + token shadow. No `shadow-2xl`, no hardcoded rgba shadow strings, no decorative gradients on workspace surfaces.

### Elevation ladder (workspace, light + dark)

- **Level 0 — canvas**: `bg-muted/10`, no shadow (the `WorkspaceShell` background).
- **Level 1 — resting card**: `bg-card` + `ring-1 ring-border/60` + `shadow-[var(--shadow-sm)]`. Default for metrics, lists, tables, supporting panels. This is what `AdminSurface`/`WorkspaceSurface` and `Surface elevation="default"` render.
- **Level 2 — focal card**: `shadow-[var(--shadow-md)]`. Exactly ONE per view — the thing the user came to act on (recruiter: "Needs attention"; review: the sticky command header). `Surface elevation="raised"`.
- **Level 3 — overlays**: drawers, command palette, popovers may use `--shadow-lg`/`--shadow-xl` or `shadow-2xl` (off-canvas only).
- **Charcoal lobby exception**: interview lobby/meeting panels on near-black use `ring-1 ring-white/10` (+ optional `--shadow-lg`); token shadows are invisible on black.

Shadow color is charcoal (`#2e2e2e`/black via tokens), never slate (`rgba(15,23,42,…)` was wrong and is removed).

### Radius

One workspace-card radius: `rounded-3xl` (24px). Inner sub-cards inside a form may step down to `rounded-2xl` (16px); inputs/buttons/badges keep their smaller radii. Do not use `rounded-[2rem]`/`rounded-[28px]` ad hoc.

### Decoration rule

No unmotivated decoration. Removed: fake sparklines, off-palette accent colors (e.g. blue `#60a5fa`), always-on `IconTrendingUp` "trend" pulses, radial-gradient card backgrounds. A metric shows the number honestly; color (amber/emerald/red) only appears when it carries meaning (attention, score band, released). Zero-value metrics dim to `text-muted-foreground/45` instead of shouting.

### Status + score color (light-safe)

Status pills and score chips must read on parchment: use `text-{color}-700 dark:text-{color}-300`, never dark-only `text-{color}-300`. Always reuse `StatusBadge` and `lib/ui/score-format` helpers — do not re-derive local pill color maps.

## Typography

- Sans: Outfit (`--font-sans`)
- Metrics / timestamps: IBM Plex Mono (`--font-mono`), `tabular-nums`

## Spacing

- Base unit: 8px
- Section gaps: `gap-8` / `gap-12`
- Workspace canvas: `max-w-7xl p-8` on muted background

## Components

Use `components/workspace/` primitives:

- `WorkspacePageHeader` — eyebrow + title + description
- `WorkspaceSurface` — elevated cards
- `StatusBadge` — shared session/report states
- `WorkspaceEmptyState` — empty and error panels

## Shells

- Recruiter: sidebar + sticky org header (`app/(admin)/layout.tsx`)
- Candidate: sidebar + sticky portal header (`app/(app)/candidate/layout.tsx`)

## Flow foundation (2026-06)

### Recruiter intent

Calm triage console — dense when reviewing, spacious on dashboard. Primary actions: review pending candidates, share invites, configure agents.

### Candidate intent

Reassuring portal — timeline rail shows progress without jargon. Invite lobby is cinematic (charcoal shell) but instructions stay plain.

### Onboarding surfaces

- `/recruiter/setup` — single card, no sidebar, no JWT/debug cards
- `/auth/continue` — invisible redirect only

### Elevation tokens

Use `shadow-[var(--shadow-sm)]` / `shadow-[var(--shadow-md)]` on workspace cards. Interview lobby may use ring-1 `ring-white/10` on charcoal panels.

### Motion

Dashboard metrics: staggered fade-in (`delay` 0.1 steps). Avoid bounce on operational UI.

Route: `/recruiter/candidates/[sessionId]` via `CandidateReviewWorkspace`.

### Zone map

1. **Command header** (`ReviewCommandHeader`) — sticky; eyebrow (template · role), candidate name, session timing, `StatusBadge` row, turn metrics at `md+`, `ReviewActions`.
2. **Primary console** (`ReviewConsole`) — `xl` split: transcript + audio (left), sticky rubric panel (right). Transcript uses viewport-aware height (`min-h-[420px] max-h-[min(70dvh,720px)]`).
3. **Assessment bento** (`ReviewAssessmentBento`) — score profile, executive summary, strengths/concerns, teaching simulation chips.
4. **Detail tabs** (`ReviewDetailTabs`) — Notes (default) | Session | Timeline | Recordings | Decisions.

Floating `RecruiterChat` stays a sibling outside the workspace shell (`⌘K`).

### Chart rule

Rubric visualization: **radar + horizontal score bars + dimension list** only. Do not add a third ring/donut chart for the same `dimensionScores`.

**Chart stack split:**

- **Recharts + shadcn `ChartContainer`** — rubric radar and score bars (`components/recruiter/rubric-*-chart.tsx`)
- **Liveline** — session activity / engagement time series from `sessionEvents` (Timeline tab, playback scrub)
- **streamdown** — markdown in recruiter copilot (`MessageResponse`)

### Focal panel exception

Exactly **one Level-2 focal** per view. Default: `Surface elevation="raised"` or `shadow-[var(--shadow-md)]` on `WorkspaceSurface`.

The recruiter dashboard **Needs attention** panel may use an amber accent ring (`ring-amber-500/20`) as the approved focal exception — it signals triage urgency without breaking the elevation ladder.

### Tab contract

Metadata sections that were previously collapsible accordions belong in detail tabs. Notes is the default tab; session operational facts, events timeline, recordings, and recruiter decisions each get one tab panel inside `WorkspaceSurface`.
