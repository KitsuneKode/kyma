# Current Findings

This file is the fast restart point for future agents. Read this before re-researching providers or rediscovering current blockers.

## Locked Decisions

- Realtime transport: `LiveKit`
- App/backend source of truth: `Convex`
- Admin auth: `Clerk`
- Background jobs: `Inngest`
- UI approach for now: minimal `shadcn/ui` style primitives, no polish detours
- Candidate access: public invite links, not full auth

## Why LiveKit Won

- better fit for agent-native realtime systems than a generic call SDK
- supports explicit agent dispatch and token-driven room agent assignment
- cleaner path to future weak-student and multi-agent scenarios
- strong official path for Node agent workers

## What Is Already Working

- `bun run typecheck` passes
- `bun run lint` passes
- `bun run build` passes
- `/interviews/demo-invite` renders a candidate flow
- candidate join triggers a real backend bootstrap route
- bootstrap route creates or reuses an interview session in Convex
- bootstrap route returns a real LiveKit token
- candidate page connects to a LiveKit room and enables microphone
- `/admin` is Clerk-protected when Clerk env is configured

## Important Routes

- `/`
- `/admin`
- `/interviews/[inviteId]`
- `/api/interviews/bootstrap`
- `/api/livekit/token`

## Important Files

- `convex/schema.ts`: current schema
- `convex/interviews.ts`: public snapshot, bootstrap, event persistence, transcript persistence
- `app/api/interviews/bootstrap/route.ts`: server bootstrap path
- `app/api/livekit/token/route.ts`: generic token path
- `components/interview/interview-workspace.tsx`: candidate-side join flow
- `lib/livekit/token.ts`: shared LiveKit token creation with optional agent dispatch
- `agents/interviewer.ts`: first LiveKit interviewer agent
- `agents/worker.ts`: LiveKit Node worker entrypoint
- `components/convex-client-provider.tsx`: Clerk + Convex client provider bridge
- `proxy.ts`: admin protection

## Current Blockers

- Clerk env is still required for full admin/auth testing
- LiveKit room connection works only when `NEXT_PUBLIC_LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` are set
- actual conversational agent behavior still needs a running LiveKit agent worker and model/provider keys

## Environment Variables That Matter Right Now

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` for admin auth
- `CLERK_SECRET_KEY` for admin auth
- `CLERK_FRONTEND_API_URL` or `CLERK_JWT_ISSUER_DOMAIN` for Clerk-backed Convex auth
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `LIVEKIT_AGENT_NAME` optional, enables token-side agent dispatch
- `LIVEKIT_AGENT_STT_MODEL`
- `LIVEKIT_AGENT_LLM_MODEL`
- `LIVEKIT_AGENT_TTS_MODEL`

## Testing Path Right Now

1. ensure `.env.local` contains LiveKit credentials, plus Clerk credentials when testing admin/auth paths
2. ensure `NEXT_PUBLIC_CONVEX_URL` exists from `bun run convex:once`
3. visit `/interviews/demo-invite`
4. enter candidate name
5. pass preflight steps
6. click `Join Interview`
7. confirm room connection and mic enablement
8. if running `bun run agent:dev`, confirm the interviewer agent joins the same room

## Research Findings Worth Not Repeating

- `AI SDK` is useful here for structured generation and orchestration, but it is not the media transport layer
- browser Web Speech should not be the primary production STT path
- LiveKit tokens can include room config with agent dispatch, so the frontend can stay stable while the agent worker arrives later
- LiveKit Node agents are an official supported path and should be the agent-kit direction for this repo

## Next Best Work

- add Convex queries/mutations for admin invite creation
- persist more session lifecycle transitions from the client
- add transcript rendering from persisted Convex data rather than local placeholder state
- validate the LiveKit Node agent against the chosen STT/LLM/TTS model strings in a live room
- add BYOK planning and env boundaries without coupling them into the first working path

## Local Developer Experience

- `bun run convex:once` bootstraps Convex and writes `NEXT_PUBLIC_CONVEX_URL`
- `bun run dev` starts Next.js only
- `bun run convex:dev` starts Convex watch mode
- `bun run dev:stack` starts Next.js plus Convex together
- `bun run dev:full` also starts the LiveKit worker
- public candidate-flow work can proceed without Clerk configured
