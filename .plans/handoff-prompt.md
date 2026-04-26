# Kyma Hardening & Polish — Agent Handoff Prompt

> Copy one batch at a time and paste it as the opening message to a fresh agent session.
> Each batch spans multiple sessions — commit after each numbered section (0.1, 0.2, 1.1, etc.).

---

## Batch 1: Security + Rate Limiter + Review Console + Admin Pages

```
You are executing Phases 0, 1 (including 1.6) of the Kyma hardening plan.

## Context

Working directory: /home/kitsunekode/Projects/assignments/kyma
This is a Next.js App Router + Convex + Clerk project. Read CLAUDE.md for full stack context.

Execution plan: .plans/hardening-and-polish-v1.md — read this entire file first. It contains the full spec including wireframes, file changes, color tokens, animation tables, and acceptance criteria.

## Manual setup required (ask the user to confirm before starting)

These cannot be done by the agent — they must be set up manually:
- KYMA_PROCESSING_WRITE_KEY must be set in .env.local for production mode enforcement
- KYMA_ADMIN_EMAILS must be set in .env.local (comma-separated list) for admin bootstrapping

## Conventions (non-negotiable)

- Package manager: `bun` (never npm/yarn)
- Format before any other check: `bun run fmt`
- Typecheck: `bun run typecheck`
- Lint: `bun run lint`
- Tests: `bun run test` (Vitest — never `bun test`)
- UI primitives: shadcn/ui — extend existing components, don't create bespoke primitives
- Motion library: `motion/react` (import { motion, AnimatePresence } from 'motion/react') — NOT framer-motion
- Convex guidelines: read convex/_generated/ai/guidelines.md before touching any Convex code
- The middleware file is `proxy.ts` at the project root — NOT middleware.ts
- Commit after each numbered section (0.1, 0.2, 0.3, 0.4, 1.1, 1.2, etc.) — these batches span multiple sessions
- Run `bun run fmt && bun run typecheck && bun run lint` after every logical chunk of work

## Design constraints (LOCKED — do not change)

- All rounded-* classes stay as-is (rounded-3xl cards, rounded-2xl/rounded-xl buttons, rounded-full chips)
- --radius: 0.625rem and derived values stay
- Shadow token structure stays (only adjust opacity if needed for darker bg)
- Letter-spacing / tracking values stay

## Phase 0: Security & Correctness

Execute sections 0.1 through 0.4 from the plan.

### 0.1 RBAC in Convex functions
- convex/helpers/auth.ts — add requireAdminIdentity, requireRole, isAdmin helpers that check role from users table (looked up via clerkId from JWT identity)
- convex/recruiter.ts — add requireAdminIdentity(ctx) guard to every query and mutation
- convex/admin.ts — same guards
- convex/users.ts — default role to 'candidate' on upsert, check KYMA_ADMIN_EMAILS for bootstrap admin only, add admin-only setUserRole mutation

### 0.2 LiveKit token endpoint auth
- app/api/livekit/token/route.ts — validate inviteToken against Convex, scope token grant to session room, return 403 on invalid

### 0.3 Processing key enforcement
- convex/recruiter.ts:saveAssessmentReport — enforce KYMA_PROCESSING_WRITE_KEY in production (NODE_ENV !== 'development')

### 0.4 Rate limiting migration to Convex
This is critical — the current lib/http/rate-limit.ts is a custom in-memory rate limiter that won't work across serverless instances.
- Install @convex-dev/rate-limiter: `bun add @convex-dev/rate-limiter`
- Register component in convex/convex.config.ts
- Create convex/rateLimiter.ts with limits for: livekitToken, publicSnapshot, recruiterChat, reportGeneration (see plan for exact config)
- Use `rateLimiter.limit(ctx, name, { key, throws: true })` in Convex functions
- For Next.js Route Handlers: create a Convex action wrapping the rate limit check, call via fetchAction() passing IP as key
- DELETE lib/http/rate-limit.ts entirely
- Remove all imports of the old rateLimitAllow function

Acceptance: all rate limiting uses Convex's @convex-dev/rate-limiter. Custom in-memory file deleted. An authenticated user without admin/recruiter role gets ConvexError on any recruiter/admin function. Invalid invite tokens get 403.

## Phase 1: Review Console Redesign (1.1–1.5)

This is the premium experience page. Invoke these skills before starting:
- frontend-design — for the aesthetic direction (refined minimal, Linear meets Bloomberg)
- emil-design-eng — for animation decisions, easing, spring config, button feedback
- make-interfaces-feel-better — for the surface/typography/hit-area checklist

Execute sections 1.1 through 1.5 from the plan.

Key design constraints (from the plan's design tokens):
- Easing: cubic-bezier(0.23, 1, 0.32, 1) for all UI transitions
- All pressable elements: active:scale-[0.96] with transition-transform
- Concentric border radii: outer = inner + padding
- Shadows over borders (layered transparent box-shadow, see plan for exact values)
- tabular-nums on all scores/metrics/timestamps
- text-wrap: balance on headings
- AnimatePresence initial={false} to prevent animation on page load
- Minimum 44×44px hit areas
- Score chip colors: ≤2.0 red, 2.1-3.0 amber, 3.1-4.0 emerald, 4.1-5.0 emerald bold (exact classes in plan — NOT lime)

### 1.1 Page layout restructure
File: app/(admin)/admin/candidates/[sessionId]/page.tsx
- Decision bar becomes primary header (absorb candidate name, inline metric pills)
- ReviewConsole is the FIRST section after the sticky bar — no metric cards or info cards above it
- Session summary, teaching simulation, assessment summary, recordings, events → collapsible sections BELOW the console (closed by default)
- Create: components/admin/collapsible-info-section.tsx

### 1.2 Rubric panel accordion redesign
Current file: components/recruiter/review-console.tsx (768 lines)
- Extract right panel into: rubric-verdict.tsx, rubric-dimension.tsx, evidence-card.tsx
- Two groups: Flagged (≤3.0, auto-expanded) and Passing (>3.0, collapsed)
- Evidence cards INLINE within each dimension accordion — remove the standalone Evidence Reel card entirely
- Widen right column to 440px (from 380px), stack vertically below 1280px
- Overall verdict chip always visible at top of rubric panel

### 1.3 Transcript panel polish
- Remove the three stat boxes at the top
- Active segment: subtle left border accent (border-l-2 border-primary), not heavy background
- Cited segments: amber left border + amber dot
- scrollIntoView({ behavior: 'smooth', block: 'nearest' })

### 1.4 Audio player polish
- Play/pause: active:scale-[0.96], transition 150ms with the custom easing
- Slider: gradient track (played vs remaining), larger thumb (20px)
- Playback rate: blur-crossfade on cycle
- Concentric radii on player wrapper vs inner controls

### 1.5 Motion & transitions
- Apply the full animation table from the plan (section 1.5)
- Reduced motion: @media (prefers-reduced-motion: reduce) — keep opacity, remove transforms
- Stagger evidence cards at 60ms intervals

## Phase 1.6: Admin List Pages & Dashboard Polish

The admin dashboard and list pages need to feel like a premium command center, not a data dump. See section 1.6 in the plan for full details.

### /admin (dashboard home)
- Add "Needs Attention" section: candidates with manual_review, expiring invites (24h), stale sessions
- Add recent activity feed (last 10 items, compact timeline)
- Add convex/admin.ts:getDashboardSummary() query
- Add 4th "Pending Reviews" metric card
- Reduce metric card value size from text-5xl to text-3xl
- Remove hover translate-y from nav cards (keep shadow change)

### /admin/candidates
- Sticky filter/sort bar: status, recommendation, date range
- Sortable columns in CandidatesTable
- Status pills with score-color coding
- Quick-action hover on rows
- Density toggle (compact/comfortable) in localStorage

### /admin/screenings
- Status pills per batch
- Batch detail page polish (progress bar, candidate list)
- Better empty states

## Verification gate

After completing all phases, run:
bun run fmt && bun run typecheck && bun run lint && bun run test

All must pass. Fix any issues before reporting completion.

Also verify manually:
- Start dev server: bun run dev
- Navigate to /admin/candidates/[any-session-id] and confirm the redesigned layout renders
- Check rubric accordion expands/collapses, evidence cards are inline, audio player works
- Check responsive behavior below 1280px (stacked layout)
- Check /admin dashboard shows needs-attention + activity sections
- Check /admin/candidates has filter bar and sortable columns
```

---

## Batch 2: Auth/Dashboards + BYOK + Electric Zen Polish + Candidate Flow

```
You are executing Phases 2, 3, 4, and 5.2 of the Kyma hardening plan. Phase 0 and 1 are already complete — RBAC guards, Convex rate limiter, review console redesign, and admin list pages are done.

## Context

Working directory: /home/kitsunekode/Projects/assignments/kyma
This is a Next.js App Router + Convex + Clerk project. Read CLAUDE.md for full stack context.

Execution plan: .plans/hardening-and-polish-v1.md — read this entire file first. It contains the full spec for all phases.

## Manual setup required (ask the user to confirm before starting)

These cannot be done by the agent — they must be set up manually:
- Clerk Dashboard: set publicMetadata.role for at least one test admin and one test candidate user
- Clerk Dashboard: update the JWT template to expose metadata.role in session claims (sessionClaims.metadata.role)
- Generate KYMA_ENCRYPTION_KEY: `openssl rand -hex 32` and add to .env.local (needed for Phase 3 BYOK)
- KYMA_ADMIN_EMAILS must be set in .env.local (if not already from Batch 1)
- KYMA_PROCESSING_WRITE_KEY must be set in .env.local (if not already from Batch 1)

## Conventions (non-negotiable)

- Package manager: `bun` (never npm/yarn)
- Format before any other check: `bun run fmt`
- Typecheck: `bun run typecheck`
- Lint: `bun run lint`
- Tests: `bun run test` (Vitest — never `bun test`)
- UI primitives: shadcn/ui — extend existing components, don't create bespoke primitives
- Motion library: `motion/react` (import { motion, AnimatePresence } from 'motion/react') — NOT framer-motion
- Convex guidelines: read convex/_generated/ai/guidelines.md before touching any Convex code
- The middleware file is `proxy.ts` at the project root — NOT middleware.ts
- Commit after each numbered section (2.1, 2.2, 2.3, etc.) — these batches span multiple sessions
- Run `bun run fmt && bun run typecheck && bun run lint` after every logical chunk of work

## Design constraints (LOCKED — do not change)

- All rounded-* classes stay as-is (rounded-3xl cards, rounded-2xl/rounded-xl buttons, rounded-full chips)
- --radius: 0.625rem and derived values stay
- Shadow token structure stays (only adjust opacity for darker bg)
- Letter-spacing / tracking values stay

## IMPORTANT CORRECTIONS (override the plan where they conflict)

1. **Candidate dashboard route**: The plan mentions `app/(candidate)/dashboard/` in some places but the project already has `app/(app)/` as the authenticated app shell with a header layout. Put the candidate dashboard under `app/(app)/dashboard/` instead — reuse the existing layout.

2. **app/(app)/layout.tsx nav gating**: The existing layout shows an "Admin" link to ALL signed-in users. When adding the candidate dashboard, you MUST either gate that link by role (only show for admin/recruiter) or create a `dashboard/layout.tsx` sub-layout that overrides the nav for candidates. Candidates must not see the admin link.

3. **Middleware is proxy.ts**: All middleware changes go to `proxy.ts` at the project root.

4. **KYMA_ADMIN_EMAILS is bootstrap only**: Use this env var ONLY in `convex/users.ts:upsert` for creating the initial admin user. The runtime source of truth for roles is Clerk publicMetadata.role.

5. **Role resolution priority**: JWT custom claims (from Clerk publicMetadata) → Convex users table → default 'candidate'.

6. **Rate limiting already migrated**: Phase 0.4 replaced the custom rate limiter with @convex-dev/rate-limiter. Use the existing convex/rateLimiter.ts for any new rate-limited functions. Do NOT use lib/http/rate-limit.ts (deleted).

## Phase 2: Auth Architecture, Role-Based Routing & Dashboards

Execute sections 2.1, 2.2, 2.3, 2.5, 2.7 from the plan (2.4 moved to Phase 1.6, 2.6 moved to Phase 0.4 — both already done).

### 2.1 Role model & Clerk sync
- convex/helpers/auth.ts: add getRole(ctx) with resolution priority above, requireRole(ctx, role), requireAdmin(ctx)
- convex/users.ts: upsert defaults to 'candidate', checks KYMA_ADMIN_EMAILS for bootstrap admin
- Add admin mutation setUserRole(userId, role) — admin-only

### 2.2 Middleware role-based routing
- proxy.ts: after auth.protect(), read sessionClaims.metadata.role
- Route by role after sign-in: admin/recruiter → /admin, candidate → /dashboard, no role → /onboarding
- /admin/* requires admin|recruiter role, /dashboard/* requires candidate|admin

### 2.3 Candidate dashboard
- Routes under app/(app)/dashboard/ (NOT app/(candidate)/ — see corrections above)
- /dashboard — upcoming + past interviews
- /dashboard/interviews — all interviews list
- /dashboard/interviews/[id] — released results
- /dashboard/profile — profile settings
- Add Convex queries: interviews.listCandidateInterviews, interviews.getCandidateInterviewResult
- Add `released` boolean to assessmentReports in convex/schema.ts
- Gate the "Admin" link in app/(app)/layout.tsx by role — candidates must not see it

### 2.5 Sign-in/sign-up polish
- app/(auth)/layout.tsx: split-screen layout (branding left, Clerk form right)
- Post-sign-in redirect by role

### 2.7 Error boundaries
- app/(admin)/admin/error.tsx
- app/interviews/[inviteId]/error.tsx
- React error boundaries around ReviewConsole, RecruiterChat, interview workspace

## Phase 3: BYOK + Configurability

Execute sections 3.1 through 3.3 from the plan.

### 3.1 workspaceSettings table
- Add to convex/schema.ts (see plan for exact schema with providerKeys using AES-256-GCM)
- Encryption: AES-256-GCM with KYMA_ENCRYPTION_KEY env var
- Resolution: workspaceSettings → env vars → hardcoded defaults
- Create lib/providers/resolve-model.ts
- Never return raw keys to client

### 3.2 Admin settings UI
- /admin/settings: provider key management (add/remove/masked display), model selection dropdowns, test connection button
- Admin-only access (requireAdmin guard)
- The current settings page at app/(admin)/admin/settings/page.tsx is a static placeholder — replace it with the real working version

### 3.3 Prompt/rubric template system
- Extend assessmentTemplates schema (see plan for fields)
- /admin/templates/[id]/edit: prompt editing, dimension config, model overrides
- Resolution order: template → workspace → env → defaults

## Phase 4: Global Polish + Electric Zen Color System

This is where the entire app gets the premium feel. Invoke these skills before starting:
- frontend-design — for font selection and aesthetic execution
- emil-design-eng — for animation polish and interaction quality
- make-interfaces-feel-better — for the surface/typography/hit-area audit

### IMPORTANT: Read the "CONSTRAINT: Do Not Touch" section at the top of Phase 4 in the plan. Rounded corners, radius, shadows, and tracking are LOCKED.

### 4.0 Electric Zen color system
The user chose the "Electric Zen" theme — dark primary with electric lime (#e8ff47) accent. This is the highest-priority item in Phase 4.

- Update .dark {} in globals.css with the exact token values from the plan (section 4.0)
- Set theme provider to defaultTheme="dark"
- Light mode (:root) stays as deprecated fallback — don't delete it, just deprioritize

Lime (#e8ff47) usage rules — READ CAREFULLY:
  ALLOWED: CTA buttons (solid lime bg, dark text), focus rings, active nav indicator, audio play head, top-score (>4.0) rubric chips
  NOT ALLOWED: body links, score color scale (keep red/amber/emerald), large surface backgrounds, card borders, muted text

Typography: invoke the frontend-design skill to select fonts. Requirements:
- Banned: Inter, Roboto, Arial, Space Grotesk, system fonts (per skill rules)
- Must work at -0.02em tracking
- Available on Google Fonts (current loading via next/font/google)
- Geometric sans for body, refined mono for labels/scores/timestamps
- Must match "sharp minimal" energy of Electric Zen, not the warm editorial feel of current Nunito
- Update app/layout.tsx font imports and --font-sans / --font-mono in globals.css

Shadow opacity: verify dark-mode shadows still work against #0a0a0a bg (may need +10% opacity)

### 4.1 Global CSS variables
- Add easing/duration custom properties to globals.css
- Current --ease-out-expo and --ease-in-out-expo already exist — alias to shorter names

### 4.2 Button press feedback
- components/ui/button.tsx: add active:scale-[0.96], transition exact properties with custom easing

### 4.3 Shadows over borders
- Where cards currently use ring-1 ring-border/50, evaluate whether layered box-shadow looks better with Electric Zen palette
- Don't force shadow everywhere — some ring-1 usage may still be appropriate for subtle containers

### 4.4 Skeleton loading states
- components/admin/skeleton-review.tsx
- components/admin/skeleton-candidates.tsx
- Cross-fade dissolve into real content

### 4.5 Sonner toast integration
- bun add sonner
- Add <Toaster /> to root layout
- Replace existing toast patterns
- Use for: decision saved, note added, key saved, batch created, errors

### 4.6 Command palette (CMD+K)
- shadcn Command component
- Actions: jump to candidate, create screening, open settings, toggle theme
- Wire to Convex queries for candidate search

## Phase 5.2: Candidate Flow Polish

Execute section 5.2 from the plan:
- Pre-join lobby: apply Electric Zen theme, use redesign direction from .plans/redesign-v3-ui-ux.md
- Live meeting: fullscreen layout, audio-reactive visualizer
- Post-meeting: success screen with stagger animation

Phase 5.1 (end-to-end LiveKit test) and 5.3 (screening batch flow) are intentionally OUT OF SCOPE — they require real LiveKit/Deepgram/Cartesia credentials and manual QA.

## Verification gate

After completing all phases, run:
bun run fmt && bun run typecheck && bun run lint && bun run test

All must pass.

Manual verification:
- bun run dev
- Confirm Electric Zen theme is active (dark bg, lime accents, new fonts)
- Sign in as admin → verify /admin dashboard
- Sign in as candidate → verify /dashboard with interviews (no admin link visible)
- Try accessing /admin as candidate → verify redirect/403
- Navigate to /admin/settings → verify BYOK key management UI
- CMD+K → verify command palette opens
- Check buttons have press feedback everywhere
- Check score chips use red/amber/emerald (NOT lime)
- Check pre-join lobby renders with Electric Zen theme
```
