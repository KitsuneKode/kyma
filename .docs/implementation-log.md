# Implementation Log

## 2026-04-21

### Completed

- chose `LiveKit` as the default realtime provider path
- added shared interview domain modules for:
  - session lifecycle
  - preflight steps
  - transcript normalization
  - realtime provider contracts
- added initial `Convex` schema scaffold for templates, invites, sessions, events, transcripts, and reports
- added minimal route shells:
  - `/`
  - `/admin`
  - `/interviews/[inviteId]`
- added `TODO.md` to separate current work from future scope
- added `ConvexProviderWithClerk` wiring and moved `ClerkProvider` to the root layout
- added `convex/auth.config.ts` and a server-side `LiveKit` token route
- bootstrapped a local Convex deployment, which wrote `NEXT_PUBLIC_CONVEX_URL` and deployment info to `.env.local`
- added a first `LiveKit Agents` Node worker scaffold under `agents/`

### Current State

- UI is intentionally minimal
- realtime room token creation route exists at `app/api/livekit/token/route.ts`
- Convex schema exists, but backend generation is blocked until `CLERK_FRONTEND_API_URL` is set
- candidate flow is a functional shell for session-state-first development
- LiveKit agent dispatch is wired through token room config when `LIVEKIT_AGENT_NAME` is set

### Next Recommended Step

- set `CLERK_FRONTEND_API_URL` and rerun `npx convex dev --once`
- add Convex queries and mutations for invites and sessions
- validate the first LiveKit interviewer worker in a live room

## 2026-04-26

### Completed

- hard-cut legacy `/interviews` candidate dashboard surface to 404
- kept `/interviews/[inviteId]` as canonical invite-first entry
- rewired candidate sidebar/navigation to canonical `/candidate/*` routes
- hardened candidate write paths:
  - invite+session capability checks for browser writes
  - processing-key gate for server-origin write paths
  - idempotent/deduped session timeline writes
- removed time-dependent state math from Convex query path for session detail
- functionalized candidate portal routes:
  - `/candidate`
  - `/candidate/interviews`
  - `/candidate/interviews/[id]`
- added explicit candidate result-state contract:
  - `processing`
  - `under_review`
  - `released`
  - `unavailable`
- shipped readiness MVP:
  - real browser/device/network checks
  - persisted readiness runs + basic recent history
- shipped profile MVP (scope-locked):
  - auth-backed identity display
  - persisted interview preferences (language, duration, timezone, accessibility notes)
- applied restrained premium polish pass on candidate interview cards without style drift

### Verification

For each capability commit, ran and passed:

- `bun run fmt`
- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run build`

### Commit Sequence

- `c585329` — `feat(routes): hard-cut legacy /interviews dashboard`
- `e070fbb` — `fix(security): harden candidate/session write paths and webhook idempotency`
- `e9ceaf9` — `feat(candidate): functionalize candidate overview, list, and detail routes`
- `1eaa972` — `feat(readiness): ship candidate readiness checks with persisted run history`
- `db8f4e7` — `feat(profile): add candidate identity and interview preference management`
- `9c0f564` — `style(candidate): polish interview cards without changing portal behavior`
