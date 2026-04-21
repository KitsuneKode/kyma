# Kyma

Kyma is an AI tutor screener for voice-based candidate assessment.

The goal is to help a hiring or operations team send a candidate a link, run a short live voice screening, and later review a structured assessment. The product is being built for reliability first: durable session state, predictable reconnect behavior, and clean server-side room/token generation before heavy UI polish.

## What You Can Do Right Now

- open a minimal candidate flow at `/interviews/demo-invite`
- run preflight checks manually in the UI
- bootstrap a real interview session through the backend
- request a real LiveKit token from the server
- connect the browser client to a LiveKit room with microphone enabled
- dispatch a LiveKit interviewer agent into the room when the worker is running
- inspect the admin shell at `/admin`

## Current Stack

- Next.js App Router
- React 19
- Clerk for admin authentication
- Convex for app data and session persistence
- LiveKit for realtime transport
- Inngest for future background processing
- shadcn/ui primitives for fast, low-friction UI work

## Development Setup

1. Install dependencies:

```bash
bun install
```

2. Copy environment values into `.env.local`.

Required for the public interview flow:

- `NEXT_PUBLIC_CONVEX_URL` after Convex bootstrap
- `NEXT_PUBLIC_LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

Required for admin/auth-enabled local dev:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_FRONTEND_API_URL` or `CLERK_JWT_ISSUER_DOMAIN`

Optional right now:

- `LIVEKIT_AGENT_NAME`
- `LIVEKIT_AGENT_STT_MODEL`
- `LIVEKIT_AGENT_LLM_MODEL`
- `LIVEKIT_AGENT_TTS_MODEL`

3. Bootstrap Convex locally:

```bash
bun run convex:once
```

4. Start the local app stack:

```bash
bun run dev
```

This starts Next.js only.

5. Start Convex in a second terminal:

```bash
bun run convex:dev
```

6. Start the interviewer worker in a third terminal when you need realtime voice behavior:

```bash
bun run agent:dev
```

Or start web + Convex together:

```bash
bun run dev:stack
```

Or start everything together:

```bash
bun run dev:full
```

## How To Test The Current Flow

1. Visit `/interviews/demo-invite`
2. Enter a candidate name
3. Pass the preflight checks in the UI
4. Click `Join Interview`
5. Confirm the browser connects to the LiveKit room and enables the microphone
6. If the LiveKit worker is running and `LIVEKIT_AGENT_NAME` matches, confirm the interviewer agent joins the room

If `LIVEKIT_AGENT_NAME` is configured and an agent worker is running, the token path is already set up to dispatch that agent into the room.

## Local Setup Modes

### Public flow mode

Use this when you are building the candidate experience or Convex session model without admin auth work.

- Clerk env vars are optional
- Convex starts without configured auth providers
- `/admin` renders as an unprotected shell in local dev

### Full admin mode

Use this when you are working on authenticated admin features.

- set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- set `CLERK_SECRET_KEY`
- set `CLERK_FRONTEND_API_URL` or `CLERK_JWT_ISSUER_DOMAIN`
- keep `NEXT_PUBLIC_CONVEX_URL` from your Convex bootstrap
- rerun `bun run convex:once` after auth config changes

## What We Are Building Right Now

- invite and session persistence
- realtime room bootstrap
- candidate join flow
- transcript and session event persistence
- admin review basics

## Near-Term Roadmap

- post-call assessment generation
- weak-student teaching simulation
- richer recruiter review screens
- BYOK model/provider support so runtime cost can be shifted per workspace

## Current Agent Runtime

- `agents/interviewer.ts` contains the first LiveKit voice agent
- `agents/worker.ts` runs the LiveKit Node worker
- the worker currently uses LiveKit Agents model strings from environment variables
- BYOK is planned as a later extension so provider keys can be supplied per workspace

## Notes

- The README is intentionally product- and developer-facing.
- Deeper architecture and planning details live elsewhere in the repo.
