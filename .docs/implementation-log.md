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
