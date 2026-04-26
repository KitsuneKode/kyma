# Agent A — Code, Security & Infrastructure

> Paste this as the opening message to a fresh agent session.
> This agent handles ALL non-UI work: security, auth, routing, data model, BYOK, rate limiting, error boundaries.
> A separate UI agent will handle the visual redesign afterward.

````
You are executing the backend/infrastructure work from the Kyma hardening plan. A separate agent handles all UI/design work — you focus on security, auth, data model, routing, rate limiting, BYOK, and functional wiring only.

## Context

Working directory: /home/kitsunekode/Projects/assignments/kyma
This is a Next.js App Router + Convex + Clerk project. Read CLAUDE.md for full stack context.

Execution plan: .plans/hardening-and-polish-v1.md — read this file first for full specs and acceptance criteria.

## Manual setup required (ask the user to confirm before starting)

- KYMA_PROCESSING_WRITE_KEY in .env.local
- KYMA_ADMIN_EMAILS in .env.local (comma-separated)
- Clerk Dashboard: set publicMetadata.role for at least one test admin and one test candidate
- Clerk Dashboard: update JWT template to expose metadata.role in sessionClaims.metadata.role
- Generate KYMA_ENCRYPTION_KEY: `openssl rand -hex 32` → add to .env.local (needed for BYOK)

## Conventions (non-negotiable)

- Package manager: `bun` (never npm/yarn)
- Format first: `bun run fmt`
- Typecheck: `bun run typecheck`
- Lint: `bun run lint`
- Tests: `bun run test` (Vitest — never `bun test`)
- Convex guidelines: read convex/_generated/ai/guidelines.md before touching any Convex code
- The middleware file is `proxy.ts` at the project root — NOT middleware.ts
- Commit after each numbered section (0.1, 0.2, etc.)
- Run `bun run fmt && bun run typecheck && bun run lint` after every commit

## DO NOT touch UI/design concerns

You are NOT responsible for:
- Visual redesign of any component (colors, typography, animations, layout restructuring)
- CSS/globals.css theme changes
- Review console redesign (Phase 1.1–1.5)
- Admin page visual polish (Phase 1.6 visual parts)
- Electric Zen color system (Phase 4.0)
- Button press feedback, shadows, skeletons, command palette UI (Phase 4.x)

You ARE responsible for creating functional route files, Convex queries/mutations, and wiring — but leave the visual layer for the UI agent.

---

## Phase 0: Security & Correctness (do first)

### 0.1 RBAC in Convex functions
- convex/helpers/auth.ts:
  - Add `requireAdminIdentity(ctx)` that checks `role === 'admin' || role === 'recruiter'` from users table (lookup by clerkId from JWT identity)
  - Add `isAdmin(ctx)` helper (returns boolean, doesn't throw)
  - Add `getRole(ctx)` with resolution priority: JWT custom claims (Clerk publicMetadata) → users table → default 'candidate'
  - Add `requireRole(ctx, role)` and `requireAdmin(ctx)` shorthand
  - Update `requireRecruiterIdentity` to call `requireAdminIdentity` internally
- convex/recruiter.ts: every query and mutation opens with `await requireAdminIdentity(ctx)`
- convex/admin.ts: same guards on all queries and mutations
- convex/users.ts:
  - Upsert defaults role to 'candidate' for new users
  - Check KYMA_ADMIN_EMAILS env var — if user email matches, set role to 'admin' (BOOTSTRAP ONLY — not checked on every auth call)
  - Add admin-only mutation `setUserRole(userId, role)`

Acceptance: authenticated user without admin/recruiter role gets ConvexError on any recruiter/admin function.

### 0.2 LiveKit token endpoint auth
- app/api/livekit/token/route.ts:
  - Validate inviteToken in request body
  - Look up invite in Convex — verify exists, active, hasn't exceeded maxUses
  - Verify session state allows joining
  - Scope LiveKit token grant to session's room
  - Return 403 for invalid/expired/consumed invites

Acceptance: POST without valid invite token returns 403. Token grants scoped to session room.

### 0.3 Processing key enforcement
- convex/recruiter.ts:saveAssessmentReport: when KYMA_PROCESSING_WRITE_KEY is set, require it. When unset AND NODE_ENV !== 'development', throw error.
- Document in .env.example that this key is required for production.

### 0.4 Rate limiting migration to Convex
The current lib/http/rate-limit.ts is a custom in-memory rate limiter — won't work across serverless instances.

- Install: `bun add @convex-dev/rate-limiter`
- Register component in convex/convex.config.ts (read convex docs for exact registration pattern)
- Create convex/rateLimiter.ts:
  ```typescript
  import { MINUTE, SECOND, RateLimiter } from "@convex-dev/rate-limiter";
  import { components } from "./_generated/api";

  export const rateLimiter = new RateLimiter(components.rateLimiter, {
    livekitToken: { kind: "fixed window", period: MINUTE, rate: 5 },
    publicSnapshot: { kind: "token bucket", period: MINUTE, rate: 30, capacity: 50 },
    recruiterChat: { kind: "token bucket", period: MINUTE, rate: 10, capacity: 20 },
    reportGeneration: { kind: "fixed window", period: MINUTE, rate: 3 },
  });
````

- Wire into Convex functions: `await rateLimiter.limit(ctx, "recruiterChat", { key: userId, throws: true })`
- For Next.js Route Handlers: create a Convex action wrapping the rate limit check, call via fetchAction() with IP as key
- DELETE lib/http/rate-limit.ts entirely
- Remove all imports of old rateLimitAllow function from Route Handlers

Acceptance: all rate limiting uses @convex-dev/rate-limiter. Custom file deleted.

---

## Phase 2: Auth, Routing & Dashboards (functional skeleton only)

### 2.1 Role model & Clerk sync

Already partly done in 0.1. Verify:

- getRole(ctx) resolves: JWT claims → users table → 'candidate'
- requireRole, requireAdmin work correctly
- setUserRole mutation is admin-only

### 2.2 Middleware role-based routing

- proxy.ts: after auth.protect(), read sessionClaims.metadata.role
- Routing logic:
  - After sign-in: admin/recruiter → /admin, candidate → /dashboard, no role → /onboarding
  - /admin/\* requires role admin|recruiter — redirect to /dashboard or show 403 if wrong role
  - /dashboard/\* requires role candidate|admin
- Public routes (no auth): /, /sign-in, /sign-up, /interviews/[invite], /api/\*

### 2.3 Candidate dashboard (routes + data only)

Create functional route files under app/(app)/dashboard/ (NOT app/(candidate)/ — reuse existing (app) layout):

- app/(app)/dashboard/page.tsx — server component, fetches candidate's interviews
- app/(app)/dashboard/layout.tsx — simple sub-layout if needed for nav gating
- app/(app)/dashboard/interviews/page.tsx — all interviews list
- app/(app)/dashboard/interviews/[id]/page.tsx — single interview result (when released)
- app/(app)/dashboard/profile/page.tsx — profile settings stub

IMPORTANT: app/(app)/layout.tsx currently shows an "Admin" link to ALL signed-in users. You MUST gate this by role — candidates must not see the admin link. Either:

- Check role in the layout and conditionally render the link, OR
- Create dashboard/layout.tsx that overrides the nav for candidates

Convex changes:

- convex/interviews.ts: add `listCandidateInterviews(clerkId)` query — returns sessions for the candidate with status + invite metadata
- convex/interviews.ts: add `getCandidateInterviewResult(sessionId)` query — returns transcript + released assessment
- convex/schema.ts: add `released: v.optional(v.boolean())` to assessmentReports table
- Link candidateInvites to users table when candidate signs in (match by email)

For the UI: use basic functional components (plain cards, text, status badges). The UI agent will polish these later. Just make sure the data flows correctly.

### 2.5 Sign-in/sign-up flow (routing only)

- Post-sign-in redirect logic based on role (wired in proxy.ts from 2.2)
- app/(auth)/layout.tsx: create the route file with basic structure. The UI agent will add split-screen design.

### 2.7 Error boundaries

- app/(admin)/admin/error.tsx — Next.js error boundary for admin routes
- app/interviews/[inviteId]/error.tsx — error boundary for interview routes
- Wrap ReviewConsole, RecruiterChat, and interview workspace in React error boundaries (try/catch rendering with fallback UI)

---

## Phase 3: BYOK + Configurability

### 3.1 workspaceSettings table + server resolution

- convex/schema.ts: add workspaceSettings table (see plan section 3.1 for exact schema with providerKeys using AES-256-GCM encrypted fields)
- Create lib/providers/resolve-model.ts:
  1. Try workspaceSettings from Convex (if populated)
  2. Fall back to env vars (LIVEKIT_AGENT_LLM_MODEL, etc.)
  3. Fall back to hardcoded defaults
  4. Decrypt provider keys at runtime using KYMA_ENCRYPTION_KEY
  5. Never return raw keys to client

### 3.2 Admin settings (functional wiring)

- app/(admin)/admin/settings/page.tsx: replace the current static placeholder with working form
- Convex mutations (admin-only):
  - addProviderKey(provider, key, label) — encrypts and stores
  - removeProviderKey(provider, keyId) — deletes
  - updateDefaultModels(models) — saves model selections
  - testProviderConnection(provider) — action that makes minimal API call to verify key
- Convex queries:
  - getWorkspaceSettings() — returns settings with masked keys (last 4 chars only)
- Wire the form to these mutations. Use basic UI layout — the UI agent will polish.

### 3.3 Prompt/rubric template system

- convex/schema.ts: extend assessmentTemplates with systemPrompt, childPersonaPrompt, wrapUpPrompt, rubricConfig, modelOverrides (see plan for exact fields)
- Create /admin/templates route (if doesn't exist) with /admin/templates/[id]/edit page
- Wire form to Convex mutations for saving template edits
- Implement resolution order: template → workspace → env → defaults
- Version history: increment rubricVersion on save

### 3.4 Sonner toast integration (infra)

- bun add sonner
- Add <Toaster /> to root layout (app/layout.tsx)
- This is infrastructure — the UI agent will use it for specific toast patterns

### 3.5 Command palette wiring (functional)

- Wire Convex queries for candidate search to power CMD+K results
- Create the action registry (jump to candidate, create screening, open settings, toggle theme)
- The UI agent will handle the visual implementation with shadcn Command component

---

## Admin dashboard data layer (supports Phase 1.6 UI work)

The UI agent will redesign the admin pages, but they need these queries:

- convex/admin.ts: add getDashboardSummary() query returning:
  - Counts: pending reviews, active sessions, expiring invites, sessions today
  - Needs attention: candidates with manual_review, invites expiring in 24h, stale sessions
  - Recent activity: last 10 session events

This is data plumbing — the UI agent will consume it.

---

## Verification gate

After completing all phases:
bun run fmt && bun run typecheck && bun run lint && bun run test

All must pass.

Manual verification:

- bun run dev
- Verify RBAC: create a test user without admin role, confirm they get errors calling recruiter/admin functions
- Verify rate limiting: confirm @convex-dev/rate-limiter is installed and lib/http/rate-limit.ts is deleted
- Verify routing: admin → /admin, candidate → /dashboard, wrong role → redirect
- Verify candidate dashboard routes exist and fetch data
- Verify /admin/settings has working BYOK form (add/remove/mask keys)
- Verify error boundaries catch errors without white-screening

```

```
