# Agent C — Premium UI Polish Pass

> Paste this as the opening message to a fresh agent session.
> Agent B completed the Electric Zen theme, review console redesign, and admin dashboard polish.
> This agent finishes every remaining surface to premium quality.

````
You are executing the second UI/design polish pass for Kyma. Agent B already completed:
- Electric Zen color system (#0a0a0a bg, #e8ff47 lime, Outfit + IBM Plex Mono fonts, easing tokens)
- Review console redesign (decision-first layout, rubric accordion, inline evidence, transcript polish, audio player)
- Admin dashboard polish (4 metric cards text-3xl, needs-attention, activity feed, no hover bounce)
- Candidates table (filter bar, score-colored pills)
- Command palette (CMD+K)
- Skeleton loading states (review + candidates)
- Button active:scale consolidated in base component
- prefers-reduced-motion support

## Context

Working directory: /home/kitsunekode/Projects/assignments/kyma
Read CLAUDE.md for full stack context (Next.js App Router + Convex + Clerk).

Commit to start from: `85eb9f1 feat(ui): electric zen theme and review console redesign`
Design plan: .plans/redesign-v3-ui-ux.md — reference for layout wireframes.

## Skills to invoke BEFORE starting work

- frontend-design — aesthetic direction, font selection
- emil-design-eng — animation decisions, easing, spring config, blur technique
- make-interfaces-feel-better — surface polish checklist

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

## Design constraints (LOCKED)

- All rounded-* classes stay (rounded-3xl cards, rounded-2xl/rounded-xl buttons, rounded-full chips)
- --radius: 0.625rem
- Shadow token STRUCTURE stays — only adjust opacity
- Letter-spacing / tracking values stay (--tracking-normal: -0.02em)
- Concentric border-radius pattern already in use
- Score colors (NOT lime): ≤2.0 red, 2.1-3.0 amber, 3.1-5.0 emerald
- Lime usage: CTA buttons, focus rings, active nav, audio playhead, top-score chips (>4.0 only)
- Lime NOT on: body links, score scale, large surfaces, card borders, muted text, destructive actions

---

## Phase 1: Candidate Interview Flow (priority — user-facing)

### 1.1 Pre-join lobby redesign
File: app/interviews/[inviteId]/page.tsx + components it renders (check imports)

Current: basic card layout. Target: Refined Split Layout per .plans/redesign-v3-ui-ux.md section 1.

- Left: video preview area with device controls (Mic/Cam/Settings)
- Right: company logo, role title, duration estimate, prominent JOIN CALL button (lime CTA)
- Background: pure #0a0a0a with very subtle radial gradient behind video element
- Remove timeline and transcript from this view
- Responsive: stack vertically below lg breakpoint
- Apply Electric Zen: lime JOIN button, new fonts, dark surfaces

### 1.2 Live meeting shell
File: components/interview/meeting-shell.tsx (213 lines)

Current: confined card layout with explanatory text above. Target: true 100dvh fullscreen per .plans/redesign-v3-ui-ux.md section 2.

- Full 100dvh edge-to-edge layout
- Company name top-left, timer top-right
- Centered interviewer video/avatar area
- Bottom floating control bar: Mic, Cam, Share, Submit & Leave (prominent, no explanatory text)
- The "Submit & Leave" button should be a lime destructive-style CTA
- Controls: concentric radii, rounded-full buttons with icon-only on mobile

### 1.3 Interview workspace polish
File: components/interview/interview-workspace.tsx (912 lines — big file)

- Apply Electric Zen theme throughout
- Audit all cards/surfaces for shadows-over-borders upgrade
- Remove any remaining inline active:scale (should already be gone)
- Check progress indicators use lime for played/completed portions
- Ensure any status pills use the locked score color palette
- Check loading/transition states between interview phases

### 1.4 Post-meeting success screen
Location: check where the "interview submitted" state renders (likely inside interview-workspace.tsx or a sibling)

Target: celebratory polished transition per .plans/redesign-v3-ui-ux.md section 4.

- Stagger enter animation: icon (50ms) → title (100ms) → paragraph (150ms) → button (200ms)
- scale(0.95)→1 + opacity fade-in on the success container
- Use check icon, success text, "you can close this window" message
- Optional: subtle clip-path reveal

---

## Phase 2: Marketing Pages

### 2.1 Hero section
File: components/marketing/hero-premium.tsx (194 lines)

- Audit against Electric Zen: lime CTAs, dark surfaces, new Outfit font rendering
- Check all button styles use base button (no inline overrides needed)
- Verify animations use custom easing (cubic-bezier(0.23, 1, 0.32, 1))
- Heading: text-balance, antialiased
- Add subtle gradient mesh or radial glow behind hero content

### 2.2 Header/Navigation
File: components/marketing/header.tsx (111 lines)

- Ensure navigation links don't use lime (body text links = foreground, not primary)
- Active nav indicator: lime underline or dot
- Mobile menu: smooth height animation if applicable
- CMD+K hint in nav bar for logged-in users (optional)

### 2.3 Marketing sections
Files: components/marketing/sections/*.tsx

- Audit all sections for Electric Zen consistency
- role-pathways.tsx: check card styles, CTA colors
- final-cta.tsx: lime primary CTA, outline secondary
- Ensure stagger animations on section entry (IntersectionObserver or motion whileInView)

---

## Phase 3: Admin Remaining Pages

### 3.1 Screening batch detail
File: app/(admin)/admin/screenings/[batchId]/page.tsx (109 lines)

- Add progress bar showing completion (candidates done / total)
- Status pills per batch (active = emerald, paused = amber, completed = muted)
- Candidate list with score-colored status pills (match candidates table pattern)
- Better empty state with clear CTA

### 3.2 Screening creation form
File: components/admin/screening-creation-form.tsx (358 lines)

- Apply Electric Zen styling to form inputs
- Step indicator if multi-step
- Lime submit button, concentric radii on form card
- Validation states: destructive for errors, lime ring for focused valid

### 3.3 Templates pages
Files: app/(admin)/admin/templates/page.tsx (35 lines), [id]/edit/page.tsx (43 lines)

- Apply consistent card styling
- Template cards: clean grid layout matching metric card style
- Edit form: same polish as screening creation

### 3.4 Settings page
File: app/(admin)/admin/settings/page.tsx (154 lines)

- Apply Electric Zen to all form controls
- Section grouping with subtle dividers
- Toggle/switch components should use lime for active state
- BYOK API key input: monospace font, masked display

### 3.5 Sidebar polish
File: components/admin/app-sidebar.tsx (135 lines)

- Active nav item: lime left border or lime background pill
- Sidebar background: #0a0a0a (already in tokens as --sidebar)
- User avatar section at bottom: clean, minimal
- Hover states: bg-muted/20 transition
- CMD+K shortcut hint in sidebar footer

---

## Phase 4: Auth & Candidate App Pages

### 4.1 Auth pages
File: app/(auth)/sign-in/[[...sign-in]]/page.tsx (18 lines)

- Ensure Clerk components are wrapped in Electric Zen themed container
- Dark background, centered card
- Lime accent on primary actions if Clerk allows theming

### 4.2 Candidate dashboard
File: app/(app)/dashboard/page.tsx (46 lines)

- Apply Electric Zen theme
- Interview cards with status pills (score colors)
- Clean typography hierarchy

### 4.3 Onboarding
File: app/(app)/onboarding/page.tsx (10 lines)

- Apply theme
- Stagger animation on form entry

### 4.4 Not Found page
File: app/not-found.tsx (51 lines)

- Electric Zen dark bg
- Centered content with stagger animation
- Lime primary CTA button for "Return home"
- Subtle background effect (radial gradient or grain)

---

## Phase 5: Shared Component Audit

### 5.1 Shadows-over-borders audit
Scan all components for `ring-1 ring-border/50` patterns. Where appropriate on #0a0a0a background, replace with:
```
box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.2)
```
Don't force everywhere — ring-1 is still valid for subtle inline containers.

### 5.2 Hit area audit
Check all icon-only buttons and small interactive elements for minimum 40×40px hit area.
Use pseudo-element extension if visible element is smaller.

### 5.3 Image outlines
Any images displayed: add subtle 1px outline with `rgba(255,255,255,0.1)` in dark mode.

### 5.4 Loading states audit
Pages missing loading.tsx that do async data fetching:
- app/(admin)/admin/screenings/page.tsx
- app/(admin)/admin/screenings/[batchId]/page.tsx
- app/(admin)/admin/settings/page.tsx
- app/(admin)/admin/templates/page.tsx
- app/(app)/dashboard/page.tsx

Create matching skeleton components for each.

### 5.5 Responsive audit
Test all modified pages at these breakpoints:
- 1280px: review console stacks vertically (already done)
- 1024px: admin grid shifts to 2-col or single
- 768px: mobile nav, stacked cards
- 375px: minimum mobile width

### 5.6 Focus visible audit
Ensure all interactive elements show lime focus ring (--ring: #e8ff47) on keyboard navigation.
Test tab order makes sense on each page.

---

## Phase 6: Performance & Polish

### 6.1 Bundle check
- Ensure motion/react is tree-shaken (only importing what's used)
- No barrel imports from @tabler/icons-react if they pull the full set — check import style
- Check if any new components can be lazy-loaded (command palette → next/dynamic)

### 6.2 Font loading verification
- Confirm Outfit and IBM Plex Mono load correctly via next/font/google
- Check FOUT/FOIT behavior — display: 'swap' is set
- Verify the font renders correctly at -0.02em tracking

### 6.3 Toaster theming
File: app/layout.tsx — Sonner `<Toaster>` component
- Verify toast styling matches Electric Zen (dark surface, lime accents for success)
- Check toast position and animation

---

## Verification gate

After completing all phases:
```
bun run fmt && bun run typecheck && bun run lint && bun run test
```
All must pass.

Manual verification (bun run dev:web):
- All pages render with Electric Zen theme
- Lime appears ONLY where allowed (CTAs, rings, active nav, audio, top-score)
- Score chips always use red/amber/emerald, never lime
- Fonts: Outfit (body), IBM Plex Mono (timestamps, scores, code)
- All buttons respond to press with scale(0.96)
- CMD+K palette works from any admin page
- Responsive: all pages usable at 375px
- prefers-reduced-motion: transforms removed, opacity kept
- Tab navigation: lime focus rings visible on all interactive elements
- No console errors or hydration mismatches

```
````
