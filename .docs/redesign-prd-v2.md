# Kyma Redesign PRD — v2 (Senior Design Pass)

## 1. Audit Findings (highest risk first)

### CRITICAL — ships to production today

| #   | Finding                                                                                                                                                                                                                                                                                                    | Location                                                                                                              | Risk                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| A1  | **Debug telemetry leaks to production.** `emitDebugLog` POSTs every final transcript segment to `http://127.0.0.1:7775` with hardcoded session ID `af8e6a`. The `.catch(() => {})` swallows errors silently, so it fails open — no crash, but every production interview fires a failed fetch per segment. | `components/interview/interview-workspace.tsx:118-142`, called at ~line 501. Also present in `agents/interviewer.ts`. | Data leak vector, unnecessary network traffic, silent performance drag. |
| A2  | **Landing page ships template placeholder copy.** Hero reads "Modern Solutions for Customer Engagement" and "Highly customizable components for building modern websites…" with `/mail2.png` stock imagery. This is the first thing any visitor sees.                                                      | `components/marketing/hero-section.tsx:39-48`                                                                         | Product credibility destroyed on first impression.                      |

### HIGH — structural debt blocking quality

| #   | Finding                                                                                                                                       | Location                                                                                                    | Risk                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| A3  | **`MetricCard` duplicated across 3 files.** Identical component defined locally in each admin page with no shared extraction.                 | `admin/candidates/page.tsx`, `admin/candidates/[sessionId]/page.tsx`, `admin/screenings/[batchId]/page.tsx` | Drift between copies, increased maintenance surface.        |
| A4  | **`InfoCard`, `InfoRow`, `SummaryList` duplicated.** Only used in `[sessionId]/page.tsx` but defined inline (~80 lines of layout primitives). | `admin/candidates/[sessionId]/page.tsx:530+`                                                                | Blocks reuse in screening detail and future report pages.   |
| A5  | **Raw HTML tables on all admin pages.** No sorting, filtering, search, or keyboard nav. The recruiter queue is the primary daily-use surface. | `admin/candidates/page.tsx`, `admin/screenings/page.tsx`, `admin/screenings/[batchId]/page.tsx`             | Unusable at >20 rows. Fails WCAG keyboard navigation.       |
| A6  | **Citations rendered as raw JSON string.** `message.citationsJson` dumped as-is into a `<p>`.                                                 | `components/recruiter/recruiter-chat.tsx:123-127`                                                           | Broken recruiter experience — evidence chain is unreadable. |
| A7  | **ReviewActions buried in aside.** The recruiter's primary action (accept/reject/flag) is below the fold in a 360px sidebar column.           | `admin/candidates/[sessionId]/page.tsx:309-318`                                                             | Violates decision-first layout principle from the plan.     |

### MEDIUM — design system gaps

| #   | Finding                                                                                                                                                                           | Location                                                                                    | Risk                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| A8  | **Hardcoded "Cuemath Tutor Screening" in lobby.** Product name baked into component copy.                                                                                         | `components/interview/invite-lobby.tsx:27`                                                  | Blocks white-label or rename without code change.                                       |
| A9  | **LiveKit button hiding via global CSS hack.** `.lk-disconnect-button` and `.lk-chat-toggle` hidden with `display: none` in globals.                                              | `app/globals.css:211-214`                                                                   | Fragile — breaks on any LiveKit class rename.                                           |
| A10 | **Dark mode half-shipped.** Full token set defined in CSS custom properties, `ThemeProvider` wired, but no user-facing toggle exposed.                                            | `app/globals.css` `:root`/`.dark`, `components/theme-provider.tsx`                          | Inconsistent experience if OS dark mode activates.                                      |
| A11 | **Admin hub is a static placeholder.** Hardcoded task lists, no live data.                                                                                                        | `app/(app)/admin/page.tsx:5-17`                                                             | Dead page in production nav.                                                            |
| A12 | **4 of 6 planned landing sections missing.** Only `hero-main` and `social-proof` are composed. "How it works", "Role pathways", "System credibility", and "Final CTA" are absent. | `components/marketing/hero-section.tsx:34-62` vs `.docs/core-flow-page-order-plan.md:21-34` | Landing page cannot convert — no explanation of product, no credibility, no second CTA. |
| A13 | **Fixed 720px height on LiveKit room.**                                                                                                                                           | `components/interview/meeting-shell.tsx` className on `<LiveKitRoom>`                       | Broken on short viewports, wasted space on tall ones.                                   |
| A14 | **`next.config.mjs` is empty.** No `cacheComponents`, no image optimization, no headers.                                                                                          | `next.config.mjs`                                                                           | No PPR, no performance baseline.                                                        |
| A15 | **Plan file referenced in prior sessions does not exist.** `.cursor/plans/core-flow-ui-prd_d39a467f.plan.md` returns 404.                                                         | —                                                                                           | Broken cross-reference. This document replaces it.                                      |

---

## 2. Improved Information Architecture (by page)

### 2a. Landing Page — `app/(marketing)/page.tsx`

**Flow narrative:** Understand → Believe → Try.

| Order | Section            | Component                            | Primary job               | CTA                                                                                     |
| ----- | ------------------ | ------------------------------------ | ------------------------- | --------------------------------------------------------------------------------------- |
| 1     | Hero (dual-track)  | `MarketingHeroMain`                  | Value proposition + proof | `Try Candidate Flow` → `/interviews/demo-invite`, `Open Recruiter Workspace` → `/admin` |
| 2     | Proof strip        | `MarketingSocialProof`               | Trust anchoring           | —                                                                                       |
| 3     | How it works       | **NEW** `MarketingHowItWorks`        | Mental model in 3 steps   | —                                                                                       |
| 4     | Role pathways      | **NEW** `MarketingRolePathways`      | Audience-specific value   | Inline pathway CTAs                                                                     |
| 5     | System credibility | **NEW** `MarketingSystemCredibility` | Technical trust           | —                                                                                       |
| 6     | Final CTA          | **NEW** `MarketingFinalCta`          | Conversion close          | Repeat dual-track                                                                       |

**Rewrite requirements for Hero:**

- Replace placeholder copy with product-specific messaging (AI tutor screening, evidence-backed assessment).
- Replace `/mail2.png` with product screenshot or abstract illustration.
- CTA labels: "Try a demo interview" and "Recruiter login" (clearer than "Start Building").

### 2b. Candidate Prejoin — `app/interviews/[inviteId]/page.tsx` → `InviteLobby`

| Zone              | Content                                                             | Notes                         |
| ----------------- | ------------------------------------------------------------------- | ----------------------------- |
| Header            | Session title (from template name, not hardcoded), duration policy  | Pull from `snapshot.policy`   |
| Readiness check   | Camera/mic/network status via `@livekit/components-react` `PreJoin` | Already functional            |
| Primary action    | `Join Interview`                                                    | Single prominent button       |
| Contextual detail | Collapsible: attempt count, expiry, resume policy                   | Reduce initial cognitive load |

**Change:** Replace hardcoded "Cuemath Tutor Screening" at `invite-lobby.tsx:27` with `snapshot.templateName ?? 'Interview Session'`.

### 2c. Live Interview — `MeetingShell` + `InterviewWorkspace`

| Zone           | Content                               | Notes                                                  |
| -------------- | ------------------------------------- | ------------------------------------------------------ |
| Stage          | LiveKit grid (camera tiles)           | Responsive height, not fixed 720px                     |
| Controls       | Mic, camera, screen share             | Keep leave hidden but via component prop, not CSS hack |
| Side rail (P1) | Live transcript preview, elapsed time | Not in P0 — adds complexity                            |
| Primary action | `Submit Interview`                    | Visible at all times during session                    |

**Changes:**

- Remove `emitDebugLog` entirely (A1).
- Replace fixed `h-[720px]` with `h-[min(720px,calc(100svh-200px))]` for viewport responsiveness (A13).
- Hide leave/chat via `ControlBar` `controls` prop: `{ leave: false, chat: false }` instead of CSS (A9).

### 2d. Post-call Processing — `InterviewWorkspace` processing view

| Zone             | Content                                        | Notes                                                      |
| ---------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| Confirmation     | "Interview submitted" with checkmark           | Immediate feedback                                         |
| Processing state | Skeleton cards with staged status indicators   | Show: transcript saved → assessment running → report ready |
| Next steps       | "You'll receive an email" or redirect guidance | Set expectations                                           |

### 2e. Recruiter Queue — `app/(app)/admin/candidates/page.tsx`

**Layout: decision-triage optimized.**

| Zone         | Content                                                                                                                      | Notes                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Page header  | "Candidate review queue" + summary metrics row                                                                               | Extract `MetricCard` to shared component       |
| Filters (P1) | Status, recommendation, date range                                                                                           | Not in P0 — raw table first, data-table second |
| Table        | shadcn `DataTable` with columns: Candidate, Session date, Recommendation (badge), Confidence, Signals, Review status, Action | Replace raw `<table>`                          |
| Row action   | Link to `[sessionId]` detail                                                                                                 | —                                              |

### 2f. Candidate Detail — `app/(app)/admin/candidates/[sessionId]/page.tsx`

**Layout: decision-first, evidence-second.**

Current layout buries `ReviewActions` in an aside at line 309. Reorganize:

| Zone             | Position                | Content                                                                         |
| ---------------- | ----------------------- | ------------------------------------------------------------------------------- |
| **Decision bar** | Top, full-width, sticky | Recommendation badge + confidence + `ReviewActions` inline. Always visible.     |
| Summary metrics  | Below decision bar      | 4× `MetricCard` (recommendation, report status, candidate turns, agent turns)   |
| Main column      | Left (flexible)         | Session summary → Teaching simulation → Evidence → Transcript → Recruiter notes |
| Side rail        | Right (360px)           | Copilot chat, review timeline, recordings, session events                       |

**Key change:** `ReviewActions` moves from `aside` (line 309) to the decision bar at the top of the page. The recruiter should never scroll to find the action.

### 2g. Screening Management — `admin/screenings/`

| Page             | Layout                                       | Notes                                                            |
| ---------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| List             | Page header + shadcn `DataTable`             | Same table migration as queue                                    |
| Batch detail     | Header card + metrics row + candidates table | Already decent structure; extract `MetricCard`                   |
| Create form (P1) | `ScreeningCreationForm` with grouped fields  | Already exists at `components/admin/screening-creation-form.tsx` |

### 2h. Admin Hub — `app/(app)/admin/page.tsx`

**Replace static placeholder with live summary.**

| Zone             | Content                                      | Data source                   |
| ---------------- | -------------------------------------------- | ----------------------------- |
| Welcome          | Recruiter name + last login                  | Clerk user                    |
| Quick stats      | Sessions today, reports pending, reviews due | Convex queries                |
| Navigation cards | Candidate queue, Screenings, (P2: Settings)  | Static links with live counts |

---

## 3. Component & Interaction System

### 3a. Shared component extractions

| Component      | Source (current duplication)            | Target path                              | API                                                                                      |
| -------------- | --------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| `MetricCard`   | 3 admin pages                           | `components/admin/metric-card.tsx`       | `{ label: string; value: string; detail?: string; trend?: 'up' \| 'down' \| 'neutral' }` |
| `InfoCard`     | `[sessionId]/page.tsx`                  | `components/admin/info-card.tsx`         | `{ title: string; description?: string; children: ReactNode }`                           |
| `InfoRow`      | `[sessionId]/page.tsx`                  | `components/admin/info-row.tsx`          | `{ label: string; value: ReactNode }`                                                    |
| `PageHeader`   | Repeated pattern across all admin pages | `components/admin/page-header.tsx`       | `{ eyebrow: string; title: string; description?: string; actions?: ReactNode }`          |
| `DataTable`    | New (replacing raw tables)              | `components/ui/data-table.tsx`           | shadcn data-table pattern with `@tanstack/react-table`                                   |
| `CitationList` | New (replacing raw JSON)                | `components/recruiter/citation-list.tsx` | `{ citations: Citation[] }` — renders as linked evidence cards                           |
| `DecisionBar`  | New                                     | `components/recruiter/decision-bar.tsx`  | `{ recommendation; confidence; reviewActions: ReactNode }` — sticky top bar              |

### 3b. Motion tokens (low-motion, high-precision budget)

Three presets using `motion` library (v12.38.0):

```ts
// lib/motion/presets.ts
export const motionPresets = {
  enter: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.15 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.97 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] },
  },
} as const
```

**Rules:**

- Maximum one animation per viewport per user action.
- No motion on data-fetching transitions (use skeleton instead).
- `prefers-reduced-motion: reduce` → disable all motion presets.
- No decorative animation (parallax, floating elements, gradient cycling).

### 3c. Premium editorial ops tone (locked constraint)

This is not a style suggestion — it's a pre-decided design direction. Apply everywhere:

- **Copy voice:** Calm, precise, high-trust. No exclamation marks, no superlatives ("best", "amazing"), no startup jargon ("disrupt", "leverage").
- **Visual restraint:** No gradient text, no glassmorphism, no emoji in UI, no decorative illustrations. Borders and shadows provide hierarchy.
- **Data presentation:** Numbers, badges, and structured evidence over prose. Let the data speak.
- **Negative space:** Generous padding, tight line lengths (`max-w-3xl` on description text). Density comes from content, not from packing.

### 3d. Typography and spacing

Already well-defined in `globals.css`. Enforce:

- `--tracking-normal: -0.02em` on body text. Do not add positive letter-spacing.
- Headings: `font-semibold tracking-tight` (already consistent).
- Eyebrows: `text-xs font-medium tracking-wide text-muted-foreground uppercase`.
- Page container: `mx-auto max-w-7xl px-6 py-10` for admin, `max-w-6xl` for candidate.

### 3e. Color and theming

- Light theme tokens are production-ready (warm cream palette).
- Dark theme tokens are defined but **no toggle should ship until P2**.
- Force `light` in `ThemeProvider` to prevent OS-triggered dark mode until the toggle ships. This resolves A10.

### 3f. shadcn-first component policy

- Use shadcn primitives for all new UI (buttons, badges, cards, tables, dialogs, dropdowns).
- `@base-ui/react` Button is already the base — this is fine, it's what shadcn v4 uses.
- `@tanstack/react-table` via shadcn data-table recipe for all tabular data.
- LiveKit components stay as-is (they own their domain) but style overrides go through `data-*` attribute selectors, not class-name hacks.

---

## 4. State Design Matrix

Every user-facing surface must handle four states. "Not designed" means the state ships as a blank screen or a crash.

| Surface              | Loading                                                                 | Empty                                                                                                  | Error                                                                     | Partial                                                                           |
| -------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Landing**          | N/A (static)                                                            | N/A                                                                                                    | N/A                                                                       | N/A                                                                               |
| **Prejoin lobby**    | `isBootstrapping` overlay (exists)                                      | N/A                                                                                                    | `InviteAccessScreen` for expired/consumed/unavailable (exists)            | Policy fields show "—" if template data missing                                   |
| **Live interview**   | `ConnectionStateToast` (exists)                                         | N/A                                                                                                    | `connectionError` state in workspace (exists, shows reconnecting UI)      | Transcript rail shows "listening…" when no segments yet (P1)                      |
| **Post-call**        | Skeleton cards with staged indicators: transcript → assessment → report | N/A                                                                                                    | "Processing is taking longer than expected. Your session is saved."       | Show completed stages, skeleton for pending                                       |
| **Recruiter queue**  | Full-page skeleton: 4 metric skeletons + 5 table row skeletons          | "No candidate sessions yet. Create a screening batch to get started." with link to `/admin/screenings` | "Unable to load candidates. Convex may be unavailable." with retry button | Metric cards show "—" for null values (already handled)                           |
| **Candidate detail** | Full-page skeleton matching 2-column layout                             | Handled by `!detail` null check → "Session not found" (exists at line 44)                              | Same as null check (Convex errors caught by `.catch(() => null)`)         | Missing report: show "Assessment pending" in MetricCards + hide evidence section  |
| **Screening list**   | Same pattern as queue                                                   | "No screening batches. Create your first batch."                                                       | Same Convex-unavailable pattern                                           | —                                                                                 |
| **Screening detail** | Same pattern as queue                                                   | Handled by `!detail` null check (exists)                                                               | Same                                                                      | Missing candidates: show empty table with "No candidates added yet"               |
| **Admin hub**        | Skeleton for stat cards                                                 | Show zero-state cards with action prompts                                                              | Convex-unavailable fallback                                               | —                                                                                 |
| **Recruiter chat**   | `useChat` loading state → typing indicator                              | "No recruiter chat yet…" (exists at line 132)                                                          | Network error → inline retry message                                      | Streaming: show partial response as it arrives (already handled by `ai-elements`) |

### Skeleton implementation pattern

```tsx
// components/ui/skeleton.tsx — already exists in shadcn
// Usage pattern for admin pages:
function QueueSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}
```

---

## 5. Implementation Plan

### P0 — Ship-blocking fixes (1-2 days)

These must land before any new feature work.

| #    | Task                                                                                                                                                                                                                                                                                                                                                                                                          | Files                                                                                                                  | Effort |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| P0-1 | **Remove `emitDebugLog` and all call sites.** Delete the function and every invocation. Grep for the localhost URL to catch agent-side too.                                                                                                                                                                                                                                                                   | `components/interview/interview-workspace.tsx:118-142`, `agents/interviewer.ts`                                        | 30 min |
| P0-2 | **Rewrite hero copy, add video slot.** Replace placeholder text with product-specific messaging. Extend `MarketingHeroMainProps` to accept `showcaseVideoSrc?: string` and render `<video autoPlay muted loop playsInline poster={...}>` when provided, falling back to `<Image>`. Replace `/mail2.png` with product video or styled mockup. Update CTA labels to "Try a demo interview" / "Recruiter login". | `components/marketing/hero-section.tsx:38-48`, `components/marketing/sections/hero-main.tsx:29-37`                     | 3-4 hr |
| P0-3 | **Extract `MetricCard` to shared component.** Create `components/admin/metric-card.tsx`, update imports in all 3 consuming pages.                                                                                                                                                                                                                                                                             | New file + `admin/candidates/page.tsx`, `admin/candidates/[sessionId]/page.tsx`, `admin/screenings/[batchId]/page.tsx` | 1 hr   |
| P0-4 | **Extract `InfoCard` / `InfoRow` to shared components.**                                                                                                                                                                                                                                                                                                                                                      | New files + `admin/candidates/[sessionId]/page.tsx`                                                                    | 45 min |
| P0-5 | **Replace hardcoded "Cuemath Tutor Screening".** Use template name from snapshot.                                                                                                                                                                                                                                                                                                                             | `components/interview/invite-lobby.tsx:27`                                                                             | 15 min |
| P0-6 | **Fix LiveKit button hiding.** Replace CSS hack with `ControlBar` `controls` prop. Remove lines 211-214 from `globals.css`.                                                                                                                                                                                                                                                                                   | `components/interview/meeting-shell.tsx`, `app/globals.css:211-214`                                                    | 30 min |
| P0-7 | **Force light theme.** Set `forcedTheme="light"` on `ThemeProvider` until toggle ships.                                                                                                                                                                                                                                                                                                                       | `components/theme-provider.tsx` or `app/providers.tsx`                                                                 | 15 min |
| P0-8 | **Fix LiveKit room height.** Replace `h-[720px]` with responsive value.                                                                                                                                                                                                                                                                                                                                       | `components/interview/meeting-shell.tsx`                                                                               | 15 min |

### P1 — Core UX improvements (1-2 weeks)

| #     | Task                                                                                                                                                                                                                                                                              | Files                                                                                           | Effort   |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------- |
| P1-1  | **Build 4 missing landing sections.** `MarketingHowItWorks`, `MarketingRolePathways`, `MarketingSystemCredibility`, `MarketingFinalCta`. Follow `MarketingPageComposer` pattern.                                                                                                  | New files in `components/marketing/sections/`, update `hero-section.tsx` sections array         | 2-3 days |
| P1-2  | **Implement shadcn `DataTable`.** Install `@tanstack/react-table`. Build `components/ui/data-table.tsx`.                                                                                                                                                                          | New component                                                                                   | 1 day    |
| P1-3  | **Migrate recruiter queue to `DataTable`.** Add sortable columns, basic search.                                                                                                                                                                                                   | `admin/candidates/page.tsx`                                                                     | 1 day    |
| P1-4  | **Migrate screening tables to `DataTable`.** Both list and batch detail.                                                                                                                                                                                                          | `admin/screenings/page.tsx`, `admin/screenings/[batchId]/page.tsx`                              | 1 day    |
| P1-5  | **Reorganize candidate detail page.** Move `ReviewActions` to sticky decision bar at top. Restructure to decision-first layout per §2f.                                                                                                                                           | `admin/candidates/[sessionId]/page.tsx`, new `components/recruiter/decision-bar.tsx`            | 1 day    |
| P1-6  | **Fix citation rendering.** Parse `citationsJson`, render as linked evidence cards with transcript references.                                                                                                                                                                    | `components/recruiter/recruiter-chat.tsx:123-127`, new `components/recruiter/citation-list.tsx` | 0.5 day  |
| P1-7  | **Add loading skeletons to all admin pages.** Use Suspense boundaries with skeleton fallbacks per §4 matrix.                                                                                                                                                                      | All admin page files                                                                            | 1 day    |
| P1-8  | **Add empty states to all admin pages.** Actionable empty states per §4 matrix.                                                                                                                                                                                                   | All admin page files                                                                            | 0.5 day  |
| P1-9  | **Extract `PageHeader` component.** Standardize eyebrow + title + description + actions pattern.                                                                                                                                                                                  | New `components/admin/page-header.tsx`, all admin pages                                         | 0.5 day  |
| P1-10 | **Build admin hub with live data.** Replace static placeholder with Convex-powered summary cards.                                                                                                                                                                                 | `app/(app)/admin/page.tsx`                                                                      | 1 day    |
| P1-11 | **Create motion preset module.** `lib/motion/presets.ts` with three tokens per §3b.                                                                                                                                                                                               | New file                                                                                        | 1 hr     |
| P1-12 | **Add post-call processing UI.** Staged skeleton indicators in InterviewWorkspace processing view.                                                                                                                                                                                | `components/interview/interview-workspace.tsx`                                                  | 0.5 day  |
| P1-13 | **Update companion docs.** P1-5 (candidate detail reorg) and P1-10 (admin hub) change auth/access surfaces — update `.docs/auth-and-access-boundaries.md`, `.docs/route-and-api-architecture.md`, and `.docs/redesign-risk-register.md` per the "docs touched in same PR" policy. | `.docs/` files                                                                                  | 1 hr     |

### P2 — Polish and advanced features (2-4 weeks)

| #    | Task                                                                                                                                               | Files                                                               | Effort  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------- |
| P2-1 | **Dark mode toggle.** Ship user-facing theme switcher in header. Remove `forcedTheme`.                                                             | `components/theme-provider.tsx`, header component                   | 0.5 day |
| P2-2 | **DataTable advanced features.** Column visibility, pagination, bulk actions.                                                                      | `components/ui/data-table.tsx`, admin pages                         | 2 days  |
| P2-3 | **Candidate detail charts.** Dimension bar chart (rubric scores), session funnel visualization per recruiter PRD.                                  | `admin/candidates/[sessionId]/page.tsx`, new chart components       | 2 days  |
| P2-4 | **Live transcript side rail.** Real-time transcript preview during interview.                                                                      | `components/interview/meeting-shell.tsx` or new side-rail component | 2 days  |
| P2-5 | **BYOK settings UI.** "Coming soon" settings page at `/admin/settings`. No functional KMS — display-only with explanation of planned architecture. | New `app/(app)/admin/settings/page.tsx`                             | 0.5 day |
| P2-6 | **`next.config.mjs` hardening.** Image optimization domains, security headers, `cacheComponents` evaluation.                                       | `next.config.mjs`                                                   | 0.5 day |
| P2-7 | **Playwright smoke tests.** Cover: landing renders, demo-invite flow, admin auth redirect, queue loads.                                            | New `e2e/` test files                                               | 2 days  |
| P2-8 | **Marketing page motion.** Apply `enter` preset to section composer for staggered section reveals.                                                 | `components/marketing/page-composer.tsx`                            | 0.5 day |

---

## 6. Validation Plan

### UX checks (manual, per milestone)

| Check                     | Surface                    | Pass criteria                                                                                                          |
| ------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| First-impression test     | Landing                    | A new visitor can explain what Kyma does within 10 seconds of page load. No template/placeholder copy visible.         |
| Decision-speed test       | Candidate detail           | A recruiter can find the recommendation + take action (accept/reject/flag) without scrolling below the first viewport. |
| Triage-speed test         | Recruiter queue            | A recruiter can sort by recommendation and identify the top candidate in <5 seconds with 20+ rows.                     |
| Candidate confidence test | Prejoin                    | A candidate sees session title, duration, and device readiness without any hardcoded brand names or dev-mode labels.   |
| Empty-state test          | All admin pages            | Every page shows an actionable message (with navigation) when Convex returns no data. No blank screens.                |
| Error-state test          | All Convex-dependent pages | Disconnect Convex URL → every page shows a graceful fallback. No unhandled exceptions.                                 |
| Viewport test             | Interview room, all admin  | Functional at 360px wide (mobile) and 2560px wide (ultrawide). No fixed heights causing overflow or empty space.       |
| Motion-budget test        | All pages                  | `prefers-reduced-motion: reduce` → zero animation anywhere. Normal mode → max one animation per user action.           |

### Technical checks (automated, CI)

| Check                                        | Tool                                             | Pass criteria                             |
| -------------------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| No `emitDebugLog` / localhost URLs           | `grep -r "127.0.0.1\|emitDebugLog"` in CI        | Zero matches                              |
| No duplicate `MetricCard` definitions        | `grep -rn "function MetricCard"`                 | Exactly 1 match (the shared component)    |
| No raw `<table>` in admin pages              | `grep -rn "<table" app/\(app\)/admin/`           | Zero matches after DataTable migration    |
| No `display: none` on LiveKit classes in CSS | `grep -n "lk-.*display.*none" app/globals.css`   | Zero matches                              |
| TypeCheck passes                             | `bun run typecheck`                              | Exit 0                                    |
| Lint passes                                  | `bun run lint`                                   | Exit 0                                    |
| Format clean                                 | `bun run fmt`                                    | No diff                                   |
| Vitest passes                                | `bun run test`                                   | Exit 0                                    |
| No hardcoded brand in lobby                  | `grep -n "Cuemath" components/interview/`        | Zero matches                              |
| No raw citationsJson render                  | `grep -n "citationsJson}" components/recruiter/` | Zero matches (replaced with CitationList) |

---

## 7. Open Decisions (with recommended defaults)

### Q1: What content goes in the hero video panel?

**Context:** Video placement in the hero right column is a pre-decided design constraint — not up for debate. The current `MarketingHeroMain` component only accepts `showcaseDarkSrc`/`showcaseLightSrc` image props and needs a video slot added.

**Recommendation: Looping product walkthrough (30-40 seconds).** Show the candidate flow — prejoin device check → live interview with AI → recruiter seeing the report. No audio, autoplay muted, with subtle captions. This demonstrates the full product loop without requiring the visitor to click play. Use `<video>` with `poster` frame as the static fallback. The `MarketingHeroMainProps` type must be extended to accept `showcaseVideoSrc?: string` alongside the existing image props, falling back to static image when video is not provided.

### Q2: Should DataTable use client-side or server-side pagination?

**Recommendation: Client-side for P1.** Current Convex queries return full result sets. Server-side pagination requires Convex cursor-based queries, which is a backend change. Ship client-side first (`@tanstack/react-table` handles this natively), migrate to server-side when any table exceeds ~500 rows.

### Q3: Should `cacheComponents` / PPR be enabled?

**Recommendation: Defer to P2.** The `next.config.mjs` is empty today. Every admin page makes authenticated Convex queries — there is no static shell to cache. Candidate pages have a public fetch but then render reactive state. PPR would require careful boundary design (static shell + dynamic slots), and the current page structures don't naturally split. Evaluate after DataTable migration when page structure is more stable. The interview workspace is reactive (LiveKit + Convex subscriptions) and gains nothing from PPR.

### Q4: Should the candidate flow support resume/reconnect UI?

**Recommendation: Yes, in P1.** The plan mentions resume policy and `InterviewWorkspace` already handles `Room` reconnection events. The missing piece is a user-facing "Reconnecting…" overlay that preserves session context. This is critical for a voice interview product — a dropped connection that looks like a crash destroys candidate confidence. Wire the existing `RoomEvent.Reconnecting` / `RoomEvent.Reconnected` events to a visible UI state.

### Q5: Should ReviewActions be a sticky bar or inline in the header section?

**Recommendation: Sticky bar.** The recruiter scrolls through transcript + evidence (potentially long) and should always have the action visible. Implement as a `sticky top-0 z-10` bar below the page header, containing: recommendation badge, confidence indicator, and the accept/reject/flag action buttons. This is the single most important layout change for the recruiter experience.

### Q6: How should component motion be gated for `prefers-reduced-motion`?

**Recommendation: Wrap motion presets in a hook.**

```ts
// lib/motion/use-motion.ts
import { useReducedMotion } from 'motion/react'
import { motionPresets } from './presets'

export function useMotionPreset(preset: keyof typeof motionPresets) {
  const reduced = useReducedMotion()
  return reduced ? {} : motionPresets[preset]
}
```

This keeps the decision at the call site with zero boilerplate.

### Q7: Should BYOK ship any UI in the MVP?

**Recommendation: Display-only settings page at P2.** Per `.docs/security-and-maintainability.md`, BYOK is explicitly kept out of critical path until KMS exists. `lib/providers/resolve-model.ts` is a stub. Ship a `/admin/settings` page that explains the planned BYOK architecture and shows "Coming soon" for key management. This signals the capability without shipping incomplete security infrastructure.

### Q8: Should the admin hub show live data or remain a navigation page?

**Recommendation: Live summary at P1, but keep it simple.** Three Convex queries (total sessions today, reports pending review, batches active) displayed in `MetricCard` components plus two navigation cards (Queue, Screenings). This replaces the static task list with real operational value and gives recruiters a reason to start from `/admin` instead of bookmarking `/admin/candidates` directly.

---

## Key Questions Resolution Index

The 8 key questions from the original brief are resolved in these locations:

1. **What is the correct landing page section order?** → §2a table (6 sections, Hero through Final CTA)
2. **Should motion be used, and where?** → §3b (three presets, max one per action, reduced-motion gated)
3. **How should admin tables be implemented?** → §5 P1-2 through P1-4 (shadcn DataTable with @tanstack/react-table)
4. **Where should ReviewActions live?** → §2f, §7 Q5 (sticky decision bar, top of page)
5. **How should component duplication be resolved?** → §3a (extraction table with target paths and APIs)
6. **Should cacheComponents/PPR be used?** → §7 Q3 (defer to P2, no natural static shells)
7. **What is the candidate flow IA principle?** → §2b-2d (single-focus stepwise: prejoin → live → post-call, one primary action per screen)
8. **What ships for BYOK?** → §7 Q7 (display-only settings page at P2, no functional KMS)

> **Note:** These 8 questions were reconstructed from the plan docs and prior conversation context. If your original list included questions not covered above, flag them and I'll resolve them in an addendum.
