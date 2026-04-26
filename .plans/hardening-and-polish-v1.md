# Kyma Hardening & Polish Plan v1

> Priority-ordered execution plan covering security, UI redesign, configurability, and polish.
> Each phase is self-contained — complete one before starting the next.

---

## Phase 0: Security & Correctness (P0 — Do First)

These are exploitable today. No feature work until these are closed.

### 0.1 RBAC in Convex functions

**Problem:** `requireRecruiterIdentity()` in `convex/helpers/auth.ts` checks that a user is signed in but never checks their role. Any authenticated Clerk user can call every `recruiter.*` and `admin.*` function.

**Changes:**

- `convex/helpers/auth.ts`:
  - Add `requireAdminIdentity(ctx)` that verifies `role === 'admin' || role === 'recruiter'` from the `users` table (look up by `clerkId` from the JWT identity).
  - Add `isAdmin(ctx)` helper that returns boolean without throwing.
  - Keep `requireRecruiterIdentity` as the strict guard; update it to call `requireAdminIdentity` internally.

- `convex/recruiter.ts`: Every query and mutation opens with `await requireAdminIdentity(ctx)`.
- `convex/admin.ts`: Every query and mutation opens with `await requireAdminIdentity(ctx)`.
- `convex/users.ts`: The `upsert` mutation should default `role` to `'candidate'` when creating a new user. Only allow role elevation through a separate admin-only mutation.
- Add a `seedAdminUser` utility or env-var allowlist (`KYMA_ADMIN_EMAILS`) for bootstrapping the first admin.

**Acceptance:** An authenticated user without `role: 'admin' | 'recruiter'` gets a `ConvexError` when calling any recruiter/admin function.

### 0.2 LiveKit token endpoint auth

**Problem:** `/api/livekit/token/route.ts` accepts any POST. No invite validation, no identity check.

**Changes:**

- Validate `inviteToken` in the request body.
- Look up the invite in Convex — verify it exists, is active, and hasn't exceeded `maxUses`.
- Look up or create the session — verify the session state allows joining.
- Scope the LiveKit token grant to the specific room from the session.
- Return 403 for invalid/expired/consumed invites.

**Acceptance:** A POST without a valid invite token returns 403. Token grants are scoped to the session's room.

### 0.3 Processing key enforcement

**Problem:** `KYMA_PROCESSING_WRITE_KEY` is optional. When unset, `saveAssessmentReport` falls back to Clerk auth — which means any recruiter can write arbitrary assessment data.

**Changes:**

- In `convex/recruiter.ts:saveAssessmentReport`: when `KYMA_PROCESSING_WRITE_KEY` is set, require it. When unset AND `NODE_ENV !== 'development'`, throw an error rather than falling through.
- Document in `.env.example` that this key is **required** for production.

**Acceptance:** In production mode, report writes require the processing key.

### 0.4 Rate limiting migration to Convex

**Problem:** `lib/http/rate-limit.ts` is a custom in-memory fixed-window rate limiter. It won't work across multiple serverless instances and has no persistence. Convex provides `@convex-dev/rate-limiter` — a proper component with token bucket and fixed window strategies, backed by the database.

**Changes:**

1. Install the Convex rate limiter component:
   ```
   bun add @convex-dev/rate-limiter
   ```
2. Register the component in `convex/convex.config.ts`:
   ```typescript
   import rateLimiter from '@convex-dev/rate-limiter/convex.config'
   export default { ...app, use: [rateLimiter] }
   ```
3. Create `convex/rateLimiter.ts`:

   ```typescript
   import { MINUTE, SECOND, RateLimiter } from '@convex-dev/rate-limiter'
   import { components } from './_generated/api'

   export const rateLimiter = new RateLimiter(components.rateLimiter, {
     livekitToken: { kind: 'fixed window', period: MINUTE, rate: 5 },
     publicSnapshot: {
       kind: 'token bucket',
       period: MINUTE,
       rate: 30,
       capacity: 50,
     },
     recruiterChat: {
       kind: 'token bucket',
       period: MINUTE,
       rate: 10,
       capacity: 20,
     },
     reportGeneration: { kind: 'fixed window', period: MINUTE, rate: 3 },
   })
   ```

4. In Convex functions that need rate limiting, call:
   ```typescript
   await rateLimiter.limit(ctx, 'recruiterChat', { key: userId, throws: true })
   ```
5. For Next.js Route Handlers (e.g., `/api/livekit/token`): create a Convex action that wraps the rate limit check, call it via `fetchAction()` passing IP as key.
6. **Delete `lib/http/rate-limit.ts`** — it is fully replaced.
7. Remove any imports of the old `rateLimitAllow` function from Route Handlers.

**Acceptance:** All rate limiting uses Convex's `@convex-dev/rate-limiter`. The custom in-memory file is deleted. Rate limits persist across serverless invocations.

---

## Phase 1: Review Console Redesign (P1 — The Money Page)

This is the page recruiters live in. It must feel like a $100k tool.

### Design Direction

**Aesthetic:** Refined minimal — Linear meets Bloomberg Terminal. Dark-first with warm neutrals. Information-dense but never cluttered. Every pixel earns its place.

**Key Principles (from design skills):**

- Concentric border radii: outer = inner + padding
- Shadows over borders (layered transparent `box-shadow`)
- Custom easing: `cubic-bezier(0.23, 1, 0.32, 1)` for all UI transitions
- `scale(0.96)` on `:active` for all pressable elements
- Stagger enter animations (50-80ms between items)
- `tabular-nums` on all scores/metrics/timestamps
- `text-wrap: balance` on headings, `pretty` on body text
- `-webkit-font-smoothing: antialiased` on root
- Never `transition: all` — specify exact properties
- `AnimatePresence initial={false}` to prevent entry animation on page load
- Popovers scale from trigger origin, not center
- Minimum 44×44px hit areas on all interactive elements

### 1.1 Page layout restructure

**Current problem:** The page stacks 8+ sections vertically before reaching the review console. Recruiters scroll past operational metadata to reach the actual decision tool.

**New layout — decision-first:**

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to queue          [Candidate Name]          [Save Decision] │
│                    Strong Yes · High Confidence                     │
│            ┌─────────┬────────┬────────────┬─────────┐              │
│            │ Advance │  Hold  │ Manual Rev │ Reject  │              │
│            └─────────┴────────┴────────────┴─────────┘              │
└─────────────────────────────────────────────────────────────────────┘
  (sticky — always visible)

┌─────────────────────────────────────────┬───────────────────────────┐
│                                         │                           │
│  TRANSCRIPT PANEL                       │  RUBRIC PANEL             │
│  ┌─────────────────────────────────┐    │  ┌───────────────────┐    │
│  │ [Full] [Cited only]             │    │  │ Overall: 3.8/5    │    │
│  │                                 │    │  │ Strong Yes · High │    │
│  │  Agent: "Welcome to the..."     │    │  └───────────────────┘    │
│  │  ● Candidate: "Thank you..."    │    │                           │
│  │  Agent: "Can you explain..."    │    │  ▸ Clarity        4.2/5   │
│  │  ○ Candidate: "So first..."     │    │  ▾ Simplification 3.8/5   │
│  │                                 │    │  │ "The candidate used     │
│  │                                 │    │  │  step-by-step..."       │
│  │                                 │    │  │ ┌──────────────────┐   │
│  │                                 │    │  │ │ ▶ 04:32 Evidence │   │
│  │                                 │    │  │ │ "Think of it as..."│  │
│  │                                 │    │  │ └──────────────────┘   │
│  │                                 │    │  ▸ Patience        3.5/5   │
│  │                                 │    │  ▸ Warmth          4.0/5   │
│  │                                 │    │  ...                       │
│  └─────────────────────────────────┘    │                           │
│  ┌─────────────────────────────────┐    │  ┌───────────────────────┐│
│  │ ◁10  ▶  1.5x    ━━━●━━━  🔊   │    │  │ 💬 Recruiter Copilot  ││
│  └─────────────────────────────────┘    │  └───────────────────────┘│
│                                         │                           │
└─────────────────────────────────────────┴───────────────────────────┘

┌─ Collapsible sections (closed by default) ──────────────────────────┐
│ ▸ Session Details    ▸ Teaching Simulation    ▸ Assessment Summary   │
│ ▸ Recruiter Notes    ▸ Recordings            ▸ Session Events       │
└─────────────────────────────────────────────────────────────────────┘
```

**Key changes:**

1. **Decision bar stays sticky** but gains the candidate name and becomes the primary header (remove separate `PageHeader`).
2. **ReviewConsole is the first section** after the sticky bar — no metric cards or info cards above it.
3. **Metric cards move into the decision bar** as inline stats or are removed entirely (the rubric panel already shows scores).
4. **Session summary, teaching simulation, assessment summary, recordings, events** become collapsible `<details>` sections or an accordion BELOW the review console. Closed by default.
5. **Recruiter notes** move into the right panel below the rubric section or into a collapsible section.
6. **Recruiter copilot** stays in the right panel as a slide-up drawer or collapsible at the bottom.

**File changes:**

- `app/(admin)/admin/candidates/[sessionId]/page.tsx` — restructure section order, wrap supporting sections in collapsible containers.
- `components/recruiter/decision-bar.tsx` — absorb candidate name, inline metric pills, compact layout.
- New: `components/admin/collapsible-info-section.tsx` — shared collapsible wrapper for supporting info cards.

### 1.2 Rubric panel accordion redesign

**Current problem:** All 9 dimensions rendered flat with equal visual weight. Evidence lives in a separate "Evidence reel" card below, disconnected from the rubric it supports. 380px column is cramped.

**New design — accordion with inline evidence:**

```
┌─────────────────────────────────────┐
│  Overall Verdict                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━ 3.8/5    │
│  Strong Yes · High Confidence       │
│  Hard gates: ✓ All passed           │
└─────────────────────────────────────┘

┌─ ⚠ Flagged ─────────────────────────┐
│                                      │
│  ▾ Listening          2.8/5  ⚠      │
│  │ "Limited evidence of active       │
│  │  listening behaviors..."          │
│  │                                   │
│  │  ┌ Evidence (2 clips) ─────────┐ │
│  │  │ ▶ 08:14  "you mentioned..." │ │
│  │  │ ▶ 12:41  "as you said..."   │ │
│  │  └─────────────────────────────┘ │
│                                      │
│  ▾ Accuracy           2.5/5  ⚠      │
│  │ ...                               │
└──────────────────────────────────────┘

┌─ Passing ────────────────────────────┐
│  ▸ Clarity            4.2/5         │
│  ▸ Simplification     3.8/5         │
│  ▸ Patience           3.5/5         │
│  ▸ Warmth             4.0/5         │
│  ▸ Fluency            3.9/5         │
│  ▸ Adaptability       3.7/5         │
│  ▸ Engagement         3.6/5         │
└──────────────────────────────────────┘
```

**Key changes:**

1. **Overall verdict chip** at the top — score bar, recommendation, confidence, hard gate status. Always visible, never scrolls away.
2. **Two groups: Flagged (≤3.0) and Passing (>3.0).** Flagged dimensions auto-expand. Passing dimensions start collapsed.
3. **Accordion per dimension:** collapsed shows `name + score chip`. Expanded shows `rationale + evidence cards inline`.
4. **Evidence cards inside each dimension**, not in a separate section. Each card has a play button that jumps audio to that timestamp.
5. **Remove the standalone "Evidence reel" card entirely.** Its content is now distributed into each dimension's accordion.
6. **Widen right column to 440px** (from 380px). On screens < 1280px, stack vertically.

**Score chip color coding:**

- ≤ 2.0: `bg-red-500/15 text-red-700` (hard gate territory)
- 2.1–3.0: `bg-amber-500/15 text-amber-700` (flagged)
- 3.1–4.0: `bg-emerald-500/10 text-emerald-700` (passing)
- 4.1–5.0: `bg-emerald-500/20 text-emerald-700 font-bold` (strong)

**File changes:**

- `components/recruiter/review-console.tsx` — full rewrite of right panel. Extract into:
  - `components/recruiter/rubric-verdict.tsx` — overall verdict chip
  - `components/recruiter/rubric-dimension.tsx` — single accordion item
  - `components/recruiter/evidence-card.tsx` — clickable evidence snippet
- Keep the transcript panel and audio player in `review-console.tsx` as the main layout shell.

### 1.3 Transcript panel polish

**Current state:** Functional but can be elevated.

**Changes:**

- Remove the three stat boxes at top (Transcript/Evidence/Focus) — this info is now in the rubric panel and verdict.
- Transcript segments: tighter spacing, speaker name as a small pill, timestamp as monospace on the right.
- Active segment: subtle left border accent (`border-l-2 border-primary`) instead of heavy background + shadow.
- Cited segments: amber left border + amber dot indicator, not full background change.
- Smooth scroll-into-view when audio plays — use `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` (not `center` — center is disorienting).
- Empty state: minimal, centered text with icon.

**File changes:**

- `components/recruiter/review-console.tsx` — transcript section cleanup.

### 1.4 Audio player polish

**Current state:** Good foundation. Needs micro-interaction polish.

**Changes:**

- Play/pause button: `active:scale-[0.96]` with `transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]`.
- Slider thumb: slightly larger (20px), with subtle shadow. Track uses gradient to show played vs remaining.
- Playback rate button: cycle through with a quick blur-crossfade (per emil-design-eng blur technique).
- Volume slider: collapse on mobile, show on hover/focus on desktop.
- Concentric radii: if audio player wrapper is `rounded-[28px]` with `p-4`, inner controls use `rounded-[20px]`.

**File changes:**

- `components/recruiter/review-console.tsx` — audio section.
- May need `components/ui/slider.tsx` updates for track gradient.

### 1.5 Motion & transitions

Apply across the entire review page:

| Element                       | Animation                                       | Duration | Easing                           |
| ----------------------------- | ----------------------------------------------- | -------- | -------------------------------- |
| Decision bar entry            | `translateY(-8px)` → `0` + opacity              | 200ms    | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Rubric dimension expand       | height auto + opacity                           | 250ms    | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Evidence card entry           | stagger 60ms, `translateY(4px)` → `0` + opacity | 200ms    | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Transcript citation highlight | `border-color` + `background-color`             | 200ms    | `ease`                           |
| Collapsible section toggle    | height + opacity                                | 250ms    | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Score chip color              | `background-color`                              | 150ms    | `ease`                           |
| Audio play/pause icon         | opacity crossfade with `blur(2px)` bridge       | 160ms    | `cubic-bezier(0.23, 1, 0.32, 1)` |

- Use `AnimatePresence initial={false}` on the rubric accordion to prevent animation on page load.
- All buttons: `active:scale-[0.96]` with `transition-transform`.
- Reduced motion: `@media (prefers-reduced-motion: reduce)` — keep opacity transitions, remove transforms.

### 1.6 Admin list pages & dashboard polish

**Current state:** The admin dashboard (`/admin`) is a hub with 3 metric cards and 2 nav cards. The candidates page (`/admin/candidates`) is functional but feels like a data dump. Screenings page (`/admin/screenings`) is similarly plain. None of these pages feel like a premium command center.

**Changes to `/admin` (dashboard home):**

- Add "Needs Attention" section below metrics: candidates with `manual_review` status, expiring invites (within 24h), stale sessions (started but no report after 1h).
- Add recent activity feed from session events (last 10 items, compact timeline style).
- Add `convex/admin.ts:getDashboardSummary()` query — returns counts for pending, reviewed, active, plus needs-attention items and recent activity.
- Metric cards: add a 4th "Pending Reviews" card. Reduce text-5xl values to text-3xl — the current 5xl is oversized for a dense dashboard.
- Nav cards: tighten padding, remove hover translate-y (feels gimmicky on a workspace tool). Keep hover shadow change.

**Changes to `/admin/candidates`:**

- Add sticky filter/sort bar: filter by status (all/pending/completed/manual_review), recommendation (strong_yes/yes/mixed/no), date range.
- Sortable columns in `CandidatesTable`: name, recommendation, confidence, status, date.
- Status pills with score-color coding (same palette as rubric chips).
- Quick-action hover: eye icon to open review, decision badge inline.
- Add density toggle (compact/comfortable) stored in localStorage.

**Changes to `/admin/screenings`:**

- Status pills per batch (active/paused/completed).
- Batch detail page (`/admin/screenings/[batchId]`): show invite links, completion progress bar, candidate list with statuses.
- Empty state: clear CTA, not just text.

**File changes:**

- `app/(admin)/admin/page.tsx` — add needs-attention + activity feed sections
- `app/(admin)/admin/candidates/page.tsx` — add filter bar, update table layout
- `app/(admin)/admin/screenings/page.tsx` — status pills, empty state
- `app/(admin)/admin/screenings/[batchId]/page.tsx` — batch detail polish
- `components/admin/metric-card.tsx` — reduce oversized text, tighten spacing
- `components/recruiter/candidates-table.tsx` — sortable columns, hover actions, density toggle
- `components/recruiter/screening-batches-table.tsx` — status pills
- `convex/admin.ts` — add `getDashboardSummary` query

---

## Phase 2: Auth Architecture, Role-Based Routing & Dashboards

This phase builds the complete auth story: who can sign in, where they land, what they see, and how roles flow through the system.

### 2.1 Role model & Clerk sync

**Current state:**

- `proxy.ts` middleware protects `/admin/*` and `/video-demo/*`, `/write-up/*` — but only checks "signed in", not role.
- `convex/users` has `role: v.optional(v.string())` — never enforced.
- No candidate dashboard exists — candidates only see the invite-gated interview page.
- Any signed-in user can access admin.

**Target role model:**

| Role        | How assigned                                                                 | What they access                                                                             |
| ----------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `admin`     | Clerk `publicMetadata.role = 'admin'` or env allowlist `KYMA_ADMIN_EMAILS`   | Everything — settings, templates, BYOK, screening batches, candidate review, user management |
| `recruiter` | Clerk `publicMetadata.role = 'recruiter'` or invited by admin                | Candidate review, screening batches, notes, decisions. No settings/BYOK/template editing     |
| `candidate` | Default for any new sign-up. Also has invite-token access without signing in | Their own interviews, results (when released), profile                                       |

**Changes:**

- **Clerk JWT custom claims:** Set `publicMetadata.role` in Clerk dashboard or via Clerk Backend API. Include it in the JWT template so Convex can read it from `ctx.auth.getUserIdentity()`.
- **`convex/helpers/auth.ts`:** Add role resolution:
  ```
  getRole(ctx) → reads from JWT custom claims first, falls back to users table
  requireRole(ctx, 'admin' | 'recruiter') → throws ConvexError if role doesn't match
  requireAdmin(ctx) → shorthand for requireRole(ctx, 'admin')
  ```
- **`convex/users.ts:upsert`:** When creating a new user, check `KYMA_ADMIN_EMAILS` env var. If the user's email matches, set `role: 'admin'`. Otherwise default to `'candidate'`.
- **Add admin mutation `setUserRole(userId, role)`** — admin-only, for promoting users.

### 2.2 Middleware role-based routing

**Current state:** `proxy.ts` only distinguishes "signed in" vs "not signed in". After sign-in, always redirects to `/admin`.

**New routing logic in `proxy.ts`:**

```
Public (no auth):
  /                    → marketing landing
  /sign-in, /sign-up   → Clerk auth pages
  /interviews/[invite]  → candidate interview (token-gated, no sign-in required)
  /api/*               → API routes (own auth)

After sign-in, route by role:
  admin/recruiter → redirect to /admin
  candidate       → redirect to /dashboard (candidate dashboard)
  no role yet     → redirect to /onboarding (role selection or waiting)

Protected routes:
  /admin/*         → requires role: admin | recruiter
  /dashboard/*     → requires role: candidate (or admin for impersonation)
  /settings/*      → requires role: admin
```

**Changes to `proxy.ts`:**

- After `auth.protect()`, read `sessionClaims.metadata.role` from Clerk.
- If user hits `/admin/*` without admin/recruiter role → redirect to `/dashboard` or show 403.
- If user hits `/dashboard/*` without candidate role and not admin → redirect to `/admin`.
- After sign-in redirect: route based on role, not hardcoded `/admin`.

### 2.3 Candidate dashboard

**New route group: `app/(candidate)/dashboard/`**

Candidates who sign in (optional — interviews work without sign-in via invite tokens) get a dashboard showing their interview history and status.

**Routes:**

```
/dashboard                    → candidate home (upcoming + past interviews)
/dashboard/interviews         → all interviews list
/dashboard/interviews/[id]    → interview result (when released by recruiter)
/dashboard/profile            → profile and settings
```

**Dashboard home layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Kyma                                    [Profile] [▼]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Welcome back, [Name]                                   │
│                                                         │
│  ┌─ Upcoming Interviews ──────────────────────────────┐ │
│  │                                                     │ │
│  │  Frontend Tutor Screen · Acme Corp                  │ │
│  │  Scheduled: Apr 28, 2026 · Duration: ~18 min        │ │
│  │  [ Join Interview → ]                               │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ Past Interviews ──────────────────────────────────┐ │
│  │                                                     │ │
│  │  Math Tutor Screen · Acme Corp                      │ │
│  │  Completed: Apr 20, 2026 · Status: Under Review     │ │
│  │                                                     │ │
│  │  English Tutor Screen · Beta Inc                    │ │
│  │  Completed: Apr 15, 2026 · Status: Advanced ✓       │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Data model changes:**

- Link `candidateInvites` to `users` table when candidate signs in (match by email).
- Add query: `interviews.listCandidateInterviews(clerkId)` — returns all sessions for the candidate, with status and invite metadata.
- Add query: `interviews.getCandidateInterviewResult(sessionId)` — returns transcript + released assessment (if recruiter has released it).
- Add `released` boolean on `assessmentReports` — recruiters must explicitly release results to candidates.

**Layout:**

- Simple top nav (no sidebar — candidates don't need workspace navigation).
- Clean card-based layout for interview list.
- Status badges: Upcoming, In Progress, Under Review, Advanced, Not Advanced.

### 2.4 _(Moved to Phase 1.6 — Admin list pages & dashboard polish)_

### 2.5 Sign-in/sign-up flow polish

**Current state:** Uses Clerk's default `[[...sign-in]]` catch-all pages. Functional but generic.

**Changes:**

- `app/(auth)/layout.tsx`: Split-screen layout — branding/value prop on left, Clerk form on right.
- After sign-in redirect logic based on role (from 2.2).
- Sign-up: default to candidate role. Include a "I'm a recruiter" link that explains they need an admin invite.
- Password-less option: magic link for candidates (lower friction).

### 2.6 _(Moved to Phase 0.4 — Convex rate limiter migration)_

### 2.7 Error boundaries

**Changes:**

- Add React error boundaries around:
  - `ReviewConsole` (audio failure shouldn't crash the page)
  - `RecruiterChat` (model errors shouldn't crash review)
  - Interview workspace (LiveKit errors shouldn't white-screen)
- Use `app/(admin)/admin/error.tsx` and `app/interviews/[inviteId]/error.tsx` Next.js error boundaries.

**File changes for Phase 2:**

| Created                                              | Modified                                       |
| ---------------------------------------------------- | ---------------------------------------------- |
| `app/(candidate)/dashboard/page.tsx`                 | `proxy.ts` (middleware)                        |
| `app/(candidate)/dashboard/layout.tsx`               | `convex/helpers/auth.ts`                       |
| `app/(candidate)/dashboard/interviews/page.tsx`      | `convex/users.ts`                              |
| `app/(candidate)/dashboard/interviews/[id]/page.tsx` | `convex/admin.ts`                              |
| `app/(candidate)/dashboard/profile/page.tsx`         | `convex/interviews.ts`                         |
| `components/candidate/interview-card.tsx`            | `convex/schema.ts` (add `released` to reports) |
| `components/candidate/candidate-nav.tsx`             | `app/(auth)/layout.tsx`                        |
| `app/(admin)/admin/error.tsx`                        | `app/(admin)/admin/page.tsx`                   |
| `app/interviews/[inviteId]/error.tsx`                | —                                              |

---

## Phase 3: Configurability — BYOK + Prompts

### 3.1 `workspaceSettings` table + server resolution

**Schema addition:**

```typescript
workspaceSettings: defineTable({
  // Provider keys (AES-256-GCM encrypted, base64 encoded)
  providerKeys: v.optional(
    v.array(
      v.object({
        provider: v.string(), // 'openai' | 'anthropic' | 'google' | 'deepgram' | 'cartesia'
        encryptedKey: v.string(), // AES-256-GCM ciphertext, base64
        iv: v.string(), // initialization vector, base64
        label: v.optional(v.string()),
        addedAt: v.number(),
        addedBy: v.string(),
      })
    )
  ),
  // Default model selections
  defaultModels: v.optional(
    v.object({
      stt: v.optional(v.string()),
      llm: v.optional(v.string()),
      tts: v.optional(v.string()),
      reviewChat: v.optional(v.string()),
    })
  ),
  updatedAt: v.number(),
  updatedBy: v.string(),
})
```

**Server resolution (`lib/providers/resolve-model.ts`):**

1. Try `workspaceSettings` from Convex (if populated).
2. Fall back to env vars (`LIVEKIT_AGENT_LLM_MODEL`, etc.).
3. Fall back to hardcoded defaults (`openai/gpt-4.1-mini`, etc.).
4. Decrypt provider keys at runtime using `KYMA_ENCRYPTION_KEY` env var.
5. Never return raw keys to client — only pass to server-side AI SDK calls.

### 3.2 Admin settings UI

**Wire `/admin/settings` page:**

- Provider key management: add/remove keys per provider. Show masked key (last 4 chars). Delete with confirmation.
- Model selection dropdowns: STT, LLM, TTS, Review Chat. Populate from known provider catalogs.
- Save to `workspaceSettings` via Convex mutation (admin-only).
- Test connection button: verifies key works with a minimal API call.

### 3.3 Prompt/rubric template system

**Extend `assessmentTemplates`:**

```typescript
assessmentTemplates: defineTable({
  // ... existing fields
  // Add:
  systemPrompt: v.optional(v.string()),
  childPersonaPrompt: v.optional(v.string()),
  wrapUpPrompt: v.optional(v.string()),
  rubricConfig: v.optional(
    v.object({
      dimensions: v.array(
        v.object({
          name: v.string(),
          weight: v.number(),
          isHardGate: v.boolean(),
          keywords: v.optional(v.array(v.string())),
        })
      ),
    })
  ),
  modelOverrides: v.optional(
    v.object({
      stt: v.optional(v.string()),
      llm: v.optional(v.string()),
      tts: v.optional(v.string()),
    })
  ),
})
```

**Resolution order (for any interview):**

1. Template-level overrides (if set)
2. Workspace defaults (from `workspaceSettings`)
3. Env var defaults
4. Hardcoded defaults

**Admin template editor:**

- New page: `/admin/templates/[id]/edit` with form for prompt editing, dimension config, model overrides.
- Version history: keep `rubricVersion` incremented on save.

---

## Phase 4: Global Polish (Premium Feel)

### CONSTRAINT: Do Not Touch

The following design properties are locked — do NOT change them:

- All `rounded-*` classes (`rounded-3xl` cards, `rounded-2xl`/`rounded-xl` buttons, `rounded-full` chips)
- `--radius: 0.625rem` (and derived `radius-sm`, `radius-md`, `radius-lg`, `radius-xl`)
- Shadow token structure (`--shadow-2xs` through `--shadow-2xl`) — only adjust opacity values if needed for darker backgrounds
- Letter-spacing / tracking values (`--tracking-normal: -0.02em` and derived)
- The concentric border-radius pattern already in use

### 4.0 Color system: Electric Zen

**Direction:** Dark-primary theme with electric lime (`#e8ff47`) accent. The current warm-neutral light mode (`:root`) stays as a deprecated fallback. The `.dark` theme becomes "Electric Zen" — the default.

**Theme provider:** Set `defaultTheme="dark"` in the theme provider. For candidate interview flow, force dark.

**New `.dark` token values in `globals.css`:**

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
```

**Where lime (`#e8ff47`) is used — and where it is NOT:**

| Allowed                                        | Not allowed                                |
| ---------------------------------------------- | ------------------------------------------ |
| Primary CTA buttons (solid lime bg, dark text) | Body text links (use foreground color)     |
| Focus rings (`--ring`)                         | Score color scale (keep red/amber/emerald) |
| Active nav item indicator                      | Backgrounds of large surfaces              |
| Audio play head / progress track               | Muted text or secondary labels             |
| Active rubric chip when score > 4.0            | Borders on cards                           |
| Logo accent                                    | Destructive actions                        |

**Typography update:**

The current fonts (Nunito, Lora, JetBrains Mono) feel soft and editorial. For the Electric Zen direction, invoke the `frontend-design` skill to select a distinctive geometric sans for body text and a refined mono for labels/scores/timestamps. Constraints:

- Banned: Inter, Roboto, Arial, Space Grotesk, system fonts (per `frontend-design` skill rules)
- Must work well at -0.02em tracking (current `--tracking-normal`)
- Must be available on Google Fonts (current loading strategy is `next/font/google`)
- The font pairing should match the "sharp minimal" energy of Electric Zen — not the current warm-editorial feel of Nunito

Update `app/layout.tsx` to load the new fonts, and update `--font-sans` / `--font-mono` in both `:root` and `.dark` in `globals.css`.

**Shadow opacity adjustment for darker bg:**

The existing shadow tokens use `rgb(10 10 10 / ...)` in dark mode which is correct for `#141414` card bg. Verify that the shadow values still look good against `#0a0a0a` background — may need to bump opacity values up ~10% for visibility.

### 4.1 Global CSS variables and easing

Add to `globals.css` (in both `:root` and `.dark`):

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
```

Note: `--ease-out-expo` and `--ease-in-out-expo` already exist in the current CSS — rename/alias to keep backward compatibility, then use the shorter names going forward.

Ensure root has: `-webkit-font-smoothing: antialiased;` (already present as `antialiased` class on `<body>`).

### 4.2 Button press feedback globally

Every `Button` in `components/ui/button.tsx` gets:

```css
transition-property:
  transform, background-color, color, border-color, box-shadow;
transition-duration: 150ms;
transition-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
```

And `:active` pseudo: `transform: scale(0.96);`

### 4.3 Consistent shadows over borders

Replace `border` with layered `box-shadow` on cards:

```css
box-shadow:
  0 0 0 1px rgba(0, 0, 0, 0.04),
  0 1px 2px rgba(0, 0, 0, 0.04),
  0 4px 12px rgba(0, 0, 0, 0.04);
```

Dark mode:

```css
box-shadow:
  0 0 0 1px rgba(255, 255, 255, 0.06),
  0 1px 2px rgba(0, 0, 0, 0.2),
  0 4px 12px rgba(0, 0, 0, 0.2);
```

### 4.4 Skeleton dissolve loading states

For server-fetched pages, add skeleton states that cross-fade into real content:

- `components/admin/skeleton-review.tsx` — skeleton for review console.
- `components/admin/skeleton-candidates.tsx` — skeleton for candidate table.
- Use `@starting-style` or `AnimatePresence` for the dissolve.

### 4.5 Sonner integration

- Add `sonner` package.
- Add `<Toaster />` to root layout.
- Replace any existing toast/notification patterns.
- Use for: decision saved, note added, key saved, batch created, errors.

### 4.6 Command palette (CMD+K)

- Use shadcn `Command` component.
- Actions: jump to candidate, create screening, open settings, toggle theme.
- Wire to Convex queries for candidate search.

---

## Phase 5: Live Validation & Remaining Flows

### 5.1 End-to-end LiveKit test

- Configure real credentials (LiveKit, Deepgram, OpenAI, Cartesia).
- Run a full interview: invite → prejoin → room → agent → transcript → processing → report → review.
- Verify: transcript quality, recording artifacts, assessment report generation, webhook delivery.

### 5.2 Candidate flow polish

- Pre-join lobby: apply redesign from `.plans/redesign-v3-ui-ux.md`.
- Live meeting: fullscreen layout, audio-reactive visualizer.
- Post-meeting: success screen with stagger animation.

### 5.3 Screening batch flow

- Verify batch creation → candidate eligibility → invite generation → attempt tracking works end-to-end.
- Polish the batch creation form and batch detail page.

---

## File Change Summary

| Phase       | Files Created                                                                                                                                                                                                                                                                                                        | Files Modified                                                                                                                                                                                                                                                                                                            | Files Deleted            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 0           | `convex/rateLimiter.ts`, `convex/convex.config.ts` (or modify)                                                                                                                                                                                                                                                       | `convex/helpers/auth.ts`, `convex/recruiter.ts`, `convex/admin.ts`, `convex/users.ts`, `app/api/livekit/token/route.ts`                                                                                                                                                                                                   | `lib/http/rate-limit.ts` |
| 1 (1.1–1.5) | `components/recruiter/rubric-verdict.tsx`, `components/recruiter/rubric-dimension.tsx`, `components/recruiter/evidence-card.tsx`, `components/admin/collapsible-info-section.tsx`                                                                                                                                    | `app/(admin)/admin/candidates/[sessionId]/page.tsx`, `components/recruiter/review-console.tsx`, `components/recruiter/decision-bar.tsx`                                                                                                                                                                                   | —                        |
| 1.6         | —                                                                                                                                                                                                                                                                                                                    | `app/(admin)/admin/page.tsx`, `app/(admin)/admin/candidates/page.tsx`, `app/(admin)/admin/screenings/page.tsx`, `app/(admin)/admin/screenings/[batchId]/page.tsx`, `components/admin/metric-card.tsx`, `components/recruiter/candidates-table.tsx`, `components/recruiter/screening-batches-table.tsx`, `convex/admin.ts` | —                        |
| 2           | `app/(app)/dashboard/page.tsx`, `app/(app)/dashboard/layout.tsx`, `app/(app)/dashboard/interviews/page.tsx`, `app/(app)/dashboard/interviews/[id]/page.tsx`, `app/(app)/dashboard/profile/page.tsx`, `components/candidate/interview-card.tsx`, `app/(admin)/admin/error.tsx`, `app/interviews/[inviteId]/error.tsx` | `proxy.ts`, `convex/helpers/auth.ts`, `convex/users.ts`, `convex/interviews.ts`, `convex/schema.ts`, `app/(auth)/layout.tsx`, `app/(app)/layout.tsx`                                                                                                                                                                      | —                        |
| 3           | `lib/providers/resolve-model.ts`                                                                                                                                                                                                                                                                                     | `convex/schema.ts`, `app/(admin)/admin/settings/page.tsx`, `agents/interviewer.ts`                                                                                                                                                                                                                                        | —                        |
| 4           | `components/admin/skeleton-review.tsx`, `components/admin/skeleton-candidates.tsx`                                                                                                                                                                                                                                   | `app/globals.css`, `app/layout.tsx`, `app/providers.tsx`, `components/ui/button.tsx`, all card components                                                                                                                                                                                                                 | —                        |
| 5.2         | —                                                                                                                                                                                                                                                                                                                    | Candidate flow components (prejoin lobby, post-meeting)                                                                                                                                                                                                                                                                   | —                        |

**Note:** Phase 5.1 (end-to-end LiveKit test) and 5.3 (screening batch flow) are out of scope for agent execution — they require real credentials and manual QA.

---

## Execution Order & Estimated Effort

| Phase                                 | Est. Time | Dependency                                |
| ------------------------------------- | --------- | ----------------------------------------- |
| Phase 0: Security + Rate Limiter      | 2–3 days  | None — do first                           |
| Phase 1 (1.1–1.5): Review Console     | 3–4 days  | None (can parallel with Phase 0)          |
| Phase 1.6: Admin List Pages           | 2–3 days  | Phase 0 (needs getDashboardSummary query) |
| Phase 2: Auth, Routing & Dashboards   | 3–4 days  | Phase 0                                   |
| Phase 3: BYOK + Config                | 3–4 days  | Phase 0, Phase 2                          |
| Phase 4: Global Polish + Electric Zen | 3–4 days  | Phase 1 (design tokens established)       |
| Phase 5.2: Candidate Flow Polish      | 1–2 days  | Phase 4                                   |

**Total: ~17–24 days of focused work.**

---

## Design Tokens Reference

```
Electric Zen (dark — primary theme):
  --background:         #0a0a0a
  --foreground:         #e8e3da
  --card:               #141414
  --primary:            #e8ff47  (electric lime)
  --primary-foreground: #0a0a0a
  --muted:              #1e1e1e
  --muted-foreground:   #8e8a83
  --accent:             #252525
  --border:             #2a2a2a
  --ring:               #e8ff47

Lime usage boundaries:
  YES: CTA buttons, focus rings, active nav, audio play head, top-score chips
  NO:  body links, score color scale (red/amber/emerald stays), large surfaces, borders

Easing:
  --ease-out:    cubic-bezier(0.23, 1, 0.32, 1)
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)

Durations:
  Fast:   150ms (button press, tooltip, color change)
  Normal: 200ms (dropdown, accordion, slide)
  Slow:   300ms (modal, drawer, page transition)

Border Radii (LOCKED — do not change):
  Card outer:    rounded-3xl / rounded-[32px]
  Card inner:    rounded-[24px]  (32 - 8px padding)
  Button:        rounded-2xl / rounded-xl
  Chip/badge:    rounded-full
  --radius:      0.625rem

Score colors (keep — NOT lime):
  ≤2.0:  bg-red-500/15 text-red-300
  2.1-3: bg-amber-500/15 text-amber-300
  3.1-4: bg-emerald-500/10 text-emerald-300
  4.1-5: bg-emerald-500/20 text-emerald-300 font-bold
```
