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
- `/admin` is Clerk-protected through middleware

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

- `CLERK_FRONTEND_API_URL` must be set for full Convex auth sync
- LiveKit room connection works only when `NEXT_PUBLIC_LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` are set
- actual conversational agent behavior still needs a running LiveKit agent worker and model/provider keys

## Environment Variables That Matter Right Now

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_FRONTEND_API_URL`
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `LIVEKIT_AGENT_NAME` optional, enables token-side agent dispatch
- `LIVEKIT_AGENT_STT_MODEL`
- `LIVEKIT_AGENT_LLM_MODEL`
- `LIVEKIT_AGENT_TTS_MODEL`

## Testing Path Right Now

1. ensure `.env.local` contains Clerk and LiveKit credentials
2. ensure `NEXT_PUBLIC_CONVEX_URL` exists from `npx convex dev --once`
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
