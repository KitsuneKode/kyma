# Stack Research

## Decision Summary

- realtime interview transport: `LiveKit`
- app backend and dashboards: `Convex`
- auth: `Clerk`
- structured generation: `AI SDK`
- background orchestration: `Inngest`
- UI system: `shadcn/ui`

This is now the default decision unless implementation evidence forces a change.

## LiveKit vs Stream

## Recommendation

Choose `LiveKit` for the screener MVP.

## Why LiveKit Wins Here

- It is purpose-built for realtime agents, not just calls with AI added on later.
- The docs explicitly support Python and Node agent programs joining rooms as realtime participants.
- It includes agent lifecycle concepts like sessions, tasks, workflows, handoffs, testing, and observability.
- It supports realtime model plugins including OpenAI Realtime, Gemini Live, and xAI Grok Voice Agent API.
- It offers a free start tier with no credit card and `1,000 free agent session minutes monthly`, which matters for cost-sensitive prototyping.

## Where Stream Still Makes Sense

- If we decide the product needs a very polished traditional call UX first and the AI is a secondary add-on.
- If we want to lean hard into Stream's existing call UI stack and OpenAI Realtime examples.

## Why Stream Is Not My First Choice

- Stream's AI path looks compelling, but the documentation is more positioned as an AI layer on top of Stream Video.
- The strongest AI docs surfaced are Python-centric.
- For this specific product, the agent orchestration depth matters more than generic video-call polish.

## Browser Web Speech API

## Recommendation

Do not make browser Web Speech the main production STT path.

## Reason

- browser support and quality are inconsistent
- transcription behavior can differ by browser and environment
- it is weaker for auditability and evidence-backed scoring
- it makes fairness and reproducibility harder

## Better Use

- local prototype fallback
- debugging mode
- offline-ish demo backup

## AI SDK

## Recommendation

Use AI SDK for structured intelligence, not raw media transport.

## Good Uses

- generate interview plans
- generate follow-up prompts
- produce rubric JSON
- extract evidence and summaries
- support tool-calling and agent orchestration in app logic

## Convex

## Recommendation

Use Convex as the source of truth for the app.

## Best Uses

- live admin dashboard
- transcript and report persistence
- candidate link records
- reactive review UI

Convex scheduled functions are enough for simple durable flows, but Inngest remains valuable when we want stronger observability, replay, and multi-step job control.

## Inngest

## Recommendation

Use Inngest for asynchronous evaluation and report pipelines.

## Best Uses

- post-call scoring
- retryable transcript cleanup
- rubric regeneration
- notifications
- audit-friendly traces of background logic

## Architecture Choice

Use `LiveKit` for the live interview session and `Convex + AI SDK + Inngest` for everything around it.

This gives us the best balance of:

- speed to MVP
- low custom infra
- polish
- reliability
- future room for telephony, richer agents, and evaluation pipelines

## Implementation Bias

For the first working build:

- prioritize working session creation over dashboard breadth
- keep UI minimal and functional
- avoid custom design work until the call loop is stable
- treat recruiter live presence as optional and secondary

## Current Source Notes

- LiveKit Agents docs: https://docs.livekit.io/agents/
- LiveKit realtime models: https://docs.livekit.io/agents/models/realtime/
- LiveKit pricing: https://livekit.com/pricing
- Stream voice agents: https://getstream.io/video/voice-agents/
- Stream Python AI SDK: https://getstream.io/video/docs/python-ai/
- Convex realtime: https://docs.convex.dev/realtime
- Convex scheduled functions: https://docs.convex.dev/scheduling/scheduled-functions
- Convex agents: https://docs.convex.dev/agents
- AI SDK docs: https://vercel.com/docs/ai-sdk
- Inngest docs: https://www.inngest.com/docs
