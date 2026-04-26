# Agent B — UI, Design & Visual Polish

> Paste this as the opening message to a fresh agent session.
> This agent handles ALL visual/design work: review console redesign, admin page polish, Electric Zen theme, animations, typography.
> A separate code agent handles security, auth, BYOK, and data model.

````
You are executing the UI/design work from the Kyma hardening plan. A separate agent handles backend/security/auth — you focus on making every surface look and feel premium.

## Context

Working directory: /home/kitsunekode/Projects/assignments/kyma
This is a Next.js App Router + Convex + Clerk project. Read CLAUDE.md for full stack context.

Execution plan: .plans/hardening-and-polish-v1.md — read this file first for full specs, wireframes, design tokens, and animation tables.

## Skills to invoke BEFORE starting work

You MUST invoke these three skills before writing any code. They guide your aesthetic decisions:
- frontend-design — for aesthetic direction, font selection, bold design choices
- emil-design-eng — for animation decisions, easing curves, spring config, button feedback, performance
- make-interfaces-feel-better — for surface polish checklist (radii, shadows, hit areas, tabular nums)

## Conventions (non-negotiable)

- Package manager: `bun` (never npm/yarn)
- Format first: `bun run fmt`
- Typecheck: `bun run typecheck`
- Lint: `bun run lint`
- Tests: `bun run test` (Vitest — never `bun test`)
- UI primitives: shadcn/ui — extend existing, don't create bespoke primitives
- Motion library: `motion/react` (import { motion, AnimatePresence } from 'motion/react') — NOT framer-motion
- Commit after each numbered section
- Run `bun run fmt && bun run typecheck && bun run lint` after every commit

## Design constraints (LOCKED — do not change)

These are the user's explicit preferences — they like these exactly as they are:
- All rounded-* classes stay (rounded-3xl cards, rounded-2xl/rounded-xl buttons, rounded-full chips)
- --radius: 0.625rem and derived radius-sm, radius-md, radius-lg, radius-xl
- Shadow token STRUCTURE stays (--shadow-2xs through --shadow-2xl) — only adjust opacity values if needed for darker bg
- Letter-spacing / tracking values stay (--tracking-normal: -0.02em)
- Concentric border-radius pattern already in use

## Score colors (NOT lime — keep these)

These use red/amber/emerald, never the Electric Zen lime:
- ≤2.0: bg-red-500/15 text-red-300
- 2.1-3.0: bg-amber-500/15 text-amber-300
- 3.1-4.0: bg-emerald-500/10 text-emerald-300
- 4.1-5.0: bg-emerald-500/20 text-emerald-300 font-bold

---

## Phase 4.0: Electric Zen Color System (do first — everything else depends on this)

The user chose "Electric Zen" — dark primary with electric lime (#e8ff47) accent.

### Color tokens
Update .dark {} in app/globals.css with these exact values:
```css
.dark {
  --background: #0a0a0a;
  --foreground: #e8e3da;
  --card: #141414;
  --card-foreground: #e8e3da;
  --popover: #141414;
  --popover-foreground: #e8e3da;
  --primary: #e8ff47;
  --primary-foreground: #0a0a0a;
  --secondary: #1c1c1c;
  --secondary-foreground: #e8e3da;
  --muted: #1e1e1e;
  --muted-foreground: #8e8a83;
  --accent: #252525;
  --accent-foreground: #e8e3da;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #2a2a2a;
  --input: #2a2a2a;
  --ring: #e8ff47;
  --sidebar: #0a0a0a;
  --sidebar-foreground: #e8e3da;
  --sidebar-primary: #e8ff47;
  --sidebar-primary-foreground: #0a0a0a;
  --sidebar-accent: #1c1c1c;
  --sidebar-accent-foreground: #e8e3da;
  --sidebar-border: #1e1e1e;
  --sidebar-ring: #e8ff47;
}
````

Keep the light mode (:root) as-is — it stays as a deprecated fallback.
Set theme provider to defaultTheme="dark" (check app/providers.tsx for the ThemeProvider).

### Lime usage rules

ALLOWED: CTA buttons (solid lime bg, dark text), focus rings (--ring), active nav indicator, audio play head/progress track, top-score rubric chips (>4.0 only)
NOT ALLOWED: body text links, score color scale (keep red/amber/emerald), large surface backgrounds, card borders, muted/secondary text, destructive actions

### Typography

Use the frontend-design skill to select fonts. Requirements:

- Banned: Inter, Roboto, Arial, Space Grotesk, Nunito, system fonts
- Must work at -0.02em tracking (current --tracking-normal)
- Available on Google Fonts (current loading via next/font/google in app/layout.tsx)
- Need: distinctive geometric sans for body + refined mono for labels/scores/timestamps
- Energy: sharp, minimal, precise — match the Electric Zen dark+lime feel
- Update app/layout.tsx font imports and --font-sans / --font-mono in both :root and .dark

### Shadow opacity

Verify dark-mode shadow tokens still look good against #0a0a0a (currently tuned for #141414). May need +10% opacity bump.

### Easing variables

Add to globals.css (in both :root and .dark):

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
```

Note: --ease-out-expo and --ease-in-out-expo already exist — keep them as aliases.

---

## Phase 1.1–1.5: Review Console Redesign

This is the "money page" — where recruiters spend most of their time. See the plan's wireframes in sections 1.1–1.5.

### 1.1 Page layout restructure

File: app/(admin)/admin/candidates/[sessionId]/page.tsx (currently 410 lines)

Current problems:

- 8+ sections stacked vertically BEFORE reaching ReviewConsole
- Recruiters scroll past metric cards, session summary, teaching simulation, assessment summary just to reach the review tool

New layout (decision-first):

- Decision bar becomes the primary header — absorb candidate name, inline metric pills, remove separate PageHeader
- ReviewConsole is the FIRST section after the sticky bar
- Session summary, teaching simulation, assessment summary, recordings, events → collapsible sections BELOW the console (closed by default)
- Create: components/admin/collapsible-info-section.tsx (shared wrapper)

### 1.2 Rubric panel accordion redesign

Current file: components/recruiter/review-console.tsx (768 lines)

Current problems:

- All 9 dimensions rendered flat with equal weight — no hierarchy
- Evidence lives in a separate "Evidence Reel" card below, disconnected from rubrics
- 380px right column is cramped

New design:

- Extract right panel into: components/recruiter/rubric-verdict.tsx, rubric-dimension.tsx, evidence-card.tsx
- Overall verdict chip at top (score bar, recommendation, confidence, hard gate status) — always visible
- Two groups: Flagged (score ≤3.0, auto-expanded) and Passing (>3.0, collapsed)
- Accordion per dimension: collapsed = name + score chip, expanded = rationale + evidence cards INLINE
- Evidence cards INSIDE each dimension — remove standalone Evidence Reel entirely
- Widen right column to 440px (from 380px), stack vertically below 1280px
- Score chip colors from the locked palette above (red/amber/emerald, NOT lime)

### 1.3 Transcript panel polish

- Remove the three stat boxes at the top (Transcript/Evidence/Focus) — info now in rubric panel
- Tighter spacing, speaker name as small pill, timestamp as monospace on right
- Active segment: border-l-2 border-primary (subtle left accent), NOT heavy background + shadow
- Cited segments: amber left border + amber dot indicator
- scrollIntoView({ behavior: 'smooth', block: 'nearest' }) — not 'center'
- Empty state: minimal centered text with icon

### 1.4 Audio player polish

- Play/pause: active:scale-[0.96] with transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]
- Slider thumb: larger (20px), subtle shadow. Track gradient: played portion vs remaining
- Playback rate button: blur-crossfade on cycle (per emil-design-eng blur technique)
- Volume slider: collapse on mobile, show on hover/focus on desktop
- Concentric radii: player wrapper rounded-[28px] p-4 → inner controls rounded-[20px]

### 1.5 Motion & transitions

Apply from the plan's animation table (section 1.5):

- Decision bar entry: translateY(-8px) → 0 + opacity, 200ms
- Rubric dimension expand: height auto + opacity, 250ms
- Evidence card entry: stagger 60ms, translateY(4px) → 0, 200ms
- Transcript citation highlight: border-color + background-color, 200ms ease
- Audio play/pause icon: opacity crossfade with blur(2px) bridge, 160ms

All using cubic-bezier(0.23, 1, 0.32, 1).

- AnimatePresence initial={false} on rubric accordion
- All buttons: active:scale-[0.96]
- Reduced motion: @media (prefers-reduced-motion: reduce) — keep opacity, remove transforms

---

## Phase 1.6: Admin List Pages & Dashboard Polish

### /admin (dashboard home)

File: app/(admin)/admin/page.tsx

Current state: 3 metric cards + 2 large nav cards. Feels like a landing page, not a command center.

Changes:

- Add "Needs Attention" section: candidates with manual_review, expiring invites (24h), stale sessions (a getDashboardSummary Convex query should exist or will be added by the code agent — if it doesn't exist yet, create a mock data version and note the dependency)
- Add recent activity feed (last 10 items, compact timeline style)
- Add 4th metric card: "Pending Reviews"
- Reduce metric card value size: text-5xl → text-3xl (currently oversized for a workspace tool)
- Nav cards: tighten padding, remove hover translate-y animation (feels gimmicky on a workspace tool — keep hover shadow change)
- File: components/admin/metric-card.tsx — reduce oversized text, tighten spacing

### /admin/candidates

File: app/(admin)/admin/candidates/page.tsx

Changes:

- Add sticky filter/sort bar above the table: filter by status (all/pending/completed/manual_review), recommendation, date range
- Sortable columns in CandidatesTable (components/recruiter/candidates-table.tsx)
- Status pills with score-color coding (red/amber/emerald palette)
- Quick-action hover: eye icon to open review, decision badge inline
- Density toggle (compact/comfortable) stored in localStorage

### /admin/screenings

File: app/(admin)/admin/screenings/page.tsx

Changes:

- Status pills per batch (active/paused/completed)
- Batch detail page polish: app/(admin)/admin/screenings/[batchId]/page.tsx — progress bar, candidate list with statuses
- Better empty states with clear CTA

---

## Phase 4.2–4.6: Global Polish

### 4.2 Button press feedback

- components/ui/button.tsx: add to base button styles:
  - transition-property: transform, background-color, color, border-color, box-shadow
  - transition-duration: 150ms
  - transition-timing-function: cubic-bezier(0.23, 1, 0.32, 1)
  - :active pseudo: transform: scale(0.96)
- Many buttons in the codebase already have inline active:scale-[0.96] — consolidate into the base component and remove the inline duplicates

### 4.3 Shadows over borders

- Evaluate cards that currently use ring-1 ring-border/50 — where appropriate, switch to layered box-shadow
- Don't force shadow everywhere — some ring-1 usage is still valid for subtle containers
- For cards on the #0a0a0a background, use:
  box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.2);

### 4.4 Skeleton loading states

- Create components/admin/skeleton-review.tsx — skeleton matching the review console layout
- Create components/admin/skeleton-candidates.tsx — skeleton matching the candidate table
- Use @starting-style or AnimatePresence for dissolve transition from skeleton to real content

### 4.5 Command palette (visual)

- Use shadcn Command component for the CMD+K palette
- Actions: jump to candidate, create screening, open settings, toggle theme
- The code agent should have wired the Convex search queries — if not, wire them yourself
- Style to match Electric Zen (dark surface, lime accent on selected item)

### Phase 5.2: Candidate flow polish

- Pre-join lobby: apply Electric Zen theme, consult .plans/redesign-v3-ui-ux.md for design direction
- Live meeting: fullscreen layout, audio-reactive visualizer with lime accent
- Post-meeting: success screen with stagger animation (50-80ms between items)

---

## Verification gate

After completing all phases:
bun run fmt && bun run typecheck && bun run lint && bun run test

All must pass.

Manual verification (bun run dev):

- Confirm Electric Zen theme: #0a0a0a bg, #e8ff47 lime on CTAs/rings/active states, new fonts loaded
- /admin/candidates/[sessionId]: review console has decision-first layout, rubric accordion with inline evidence
- Rubric score chips use red/amber/emerald (NOT lime)
- Audio player has gradient track, blur-crossfade on rate change
- /admin: dashboard has needs-attention section, text-3xl metrics, no hover bounce on cards
- /admin/candidates: filter bar works, columns sortable
- CMD+K opens command palette
- All buttons have scale(0.96) on press
- Check responsive: below 1280px review console stacks vertically
- prefers-reduced-motion: transforms removed, opacity kept

```

```
