# LiveKit + Convex Implementation Guide

Read this when working on LiveKit integration, Convex schema design, backend boundaries, or post-call processing architecture.

## Purpose

This document is the technical bridge between the product PRD and the actual implementation.

It answers:

- which official docs matter most
- how to split responsibility between Next.js, LiveKit, Convex, and Inngest
- how the schema should evolve
- how to keep the system maintainable under real load

## Official Guides We Should Follow

## LiveKit

### React Components And Room Lifecycle

- React components index: https://docs.livekit.io/reference/components/react/
- React components guide: https://docs.livekit.io/reference/components/react/guide/
- PreJoin: https://docs.livekit.io/reference/components/react/component/prejoin/
- LiveKitRoom: https://docs.livekit.io/reference/components/react/component/livekitroom/
- Room context setup: https://docs.livekit.io/reference/components/react/concepts/livekit-room-component/
- Contexts: https://docs.livekit.io/reference/components/react/concepts/contexts/

### Voice And Agent Features

- Agents overview: https://docs.livekit.io/agents/
- Text and transcriptions: https://docs.livekit.io/agents/voice-agent/transcriptions/
- Agents UI: https://docs.livekit.io/frontends/agents-ui/

### Recording

- Egress overview: https://docs.livekit.io/home/egress/overview
- Composite recording: https://docs.livekit.io/transport/media/ingress-egress/egress/composite-recording/
- Webhooks and events: https://docs.livekit.io/intro/basics/rooms-participants-tracks/webhooks-events/
- JS `WebhookReceiver`: https://docs.livekit.io/reference/server-sdk-js/classes/WebhookReceiver.html

## Convex

- Schemas: https://docs.convex.dev/database/schemas
- Indexes: https://docs.convex.dev/database/reading-data/indexes/
- Indexes and query performance: https://docs.convex.dev/database/reading-data/indexes/indexes-and-query-perf
- Full text search: https://docs.convex.dev/search/text-search
- Scheduled functions: https://docs.convex.dev/scheduling/scheduled-functions

## Implementation Boundary

The fastest way to create reliability is to keep each system responsible for one kind of truth.

## LiveKit Owns

- media transport
- room connection
- participant state
- agent room presence
- recording foundation
- realtime transcription streams from agents when available

## Convex Owns

- source-of-truth product data
- invite eligibility
- session records
- durable event logs
- transcript persistence
- report records
- recruiter notes and review state
- leaderboard inputs

## Next.js API Routes Own

- server-only provider boundaries
- bootstrap orchestration
- LiveKit token issuance
- inbound webhooks from third parties when needed

## Inngest Owns

- post-call pipelines
- evidence extraction
- report generation
- indexing transcript and report data for recruiter AI chat

## Inngest

- Serving functions in Next.js: https://www.inngest.com/docs/learn/serving-inngest-functions
- Next.js quickstart: https://www.inngest.com/docs/getting-started/nextjs-quick-start
- Sending events: https://www.inngest.com/docs/events
- `createFunction()` reference: https://www.inngest.com/docs/reference/typescript/functions/create
- `step.ai.wrap()` and AI orchestration: https://www.inngest.com/docs/features/inngest-functions/steps-workflows/step-ai-orchestration
- AgentKit overview: https://agentkit.inngest.com/
- AgentKit agents concepts: https://agentkit.inngest.com/concepts/agents

## Recommended Routing Pattern

## Use Next.js Routes For

- `/api/interviews/bootstrap`
- `/api/livekit/token`
- `/api/livekit/webhook`
- future `/api/recordings/callback`

These routes should be thin.

Their job is to:

- validate request
- call provider SDKs
- call Convex mutations or internal endpoints
- return normalized responses

They should not become the main business-logic layer.

## Use Convex Public Functions For

- candidate read access to invite/session snapshot
- recruiter table queries
- recruiter detail queries
- safe state transitions initiated by app users

## Use Convex Internal Functions For

- post-call artifact reconciliation
- report state changes
- denormalized leaderboard/stat updates
- evidence extraction helpers

## Schema Design Principles

## 1. Keep Stable And High-Churn Data Separate

This already started correctly with:

- `interviewSessions`
- `sessionEvents`
- `transcriptSegments`

Keep going with that pattern.

Do not move events or transcript chunks back onto the parent session doc.

## 2. Avoid Unbounded Arrays

Do not store:

- full transcript arrays
- evidence arrays
- chat histories
- reviewer audit trails

inside single parent documents.

Use child tables.

## 3. Prefer Durable IDs And Explicit Foreign Keys

Every child artifact should point to a parent record directly:

- `sessionId`
- `reportId`
- `inviteId`
- `candidateId`

Do not rely on room names or tokens as the only join key.

## 4. Standardize Time Fields

For operational data, prefer numeric timestamps in milliseconds:

- `createdAtMs`
- `startedAtMs`
- `endedAtMs`
- `openedAtMs`
- `submittedAtMs`

The current schema uses ISO strings in multiple places. That works, but numeric timestamps are better for:

- indexing
- comparisons
- ordering
- analytics

If we migrate later, do it consistently across all operational tables.

## 5. Index For Real Screens, Not Hypothetical Queries

Every index should support an actual product screen or hot-path query.

Examples:

- sessions by invite
- sessions by status
- sessions by template and status
- reports by session
- invites by token
- invites by status
- eligibility by batch and candidate

## Recommended Table Shape

## Current Core Tables

- `assessmentTemplates`
- `candidateInvites`
- `interviewSessions`
- `sessionEvents`
- `transcriptSegments`
- `assessmentReports`

## Recommended Next Tables

### `screeningBatches`

Represents a recruiter-created intake batch.

Fields:

- `name`
- `templateId`
- `createdBy`
- `status`

### `candidateEligibility`

Represents who is allowed to use a screening.

Fields:

- `batchId`
- `candidateName`
- `candidateEmail`
- `inviteId`
- `allowedAttempts`
- `attemptCount`
- `status`
- `revokedAtMs`

### `dimensionEvidence`

One row per evidence item, not one giant report blob.

Fields:

- `reportId`
- `sessionId`
- `dimension`
- `kind` (`strength` or `concern`)
- `snippet`
- `speaker`
- `transcriptSegmentId`
- `timestampMs`
- `confidence`

### `recruiterNotes`

Fields:

- `sessionId`
- `reportId`
- `authorId`
- `body`
- `createdAtMs`

### `recordingArtifacts`

Fields:

- `sessionId`
- `provider`
- `kind`
- `status`
- `playbackUrl`
- `downloadUrl`
- `durationMs`

### `reviewDecisions`

Fields:

- `sessionId`
- `reportId`
- `reviewerId`
- `decision`
- `reason`
- `overrodeModel`
- `createdAtMs`

### `reportChatMessages`

If we persist recruiter AI chat history, do it here.

Fields:

- `sessionId`
- `reportId`
- `author`
- `message`
- `citations`
- `createdAtMs`

## Recommended Search Indexes

Use Convex search indexes for:

- transcript search by `text` with `sessionId` filter
- recruiter note search by `body` with `sessionId` or `reportId` filter

This is especially useful for:

- transcript search in recruiter detail
- grounded recruiter AI chat retrieval

## Recommended Denormalized Summary Fields

Not every list page should rebuild everything from raw evidence rows.

Keep lightweight summary fields on `assessmentReports` or a dedicated summary doc:

- `overallRecommendation`
- `confidence`
- `manualReviewRequired`
- `averageScore`
- `topStrengths`
- `topConcerns`
- `hardGateTriggered`

These power tables efficiently.

## Convex Module Split

The current `convex/interviews.ts` is doing too much.

Recommended split:

- `convex/templates.ts`
- `convex/invites.ts`
- `convex/sessions.ts`
- `convex/transcripts.ts`
- `convex/reports.ts`
- `convex/recruiter.ts`
- `convex/leaderboard.ts`

This reduces merge conflicts and keeps ownership clear.

## Query And Mutation Guidance

## Good Pattern

- queries for stable reads
- mutations for single, atomic state transitions
- internal mutations for pipeline-driven updates

## Bad Pattern

- one giant mutation doing bootstrap, provider calls, report generation, and side effects together
- `.collect()` everywhere on growing tables
- query-time filtering without indexes

## Realtime And Transcript Guidance

## V1

- persist session lifecycle events as they happen
- persist transcript segments as partial and final
- only use final transcript for authoritative scoring

## Better Pattern

- `transcriptSegments` for raw chronological units
- `dimensionEvidence` for extracted supporting evidence
- `assessmentReports` for synthesized judgment

Do not collapse all three into one table.

## Recording Guidance

Use LiveKit egress after the core room path is stable.

Recommended first:

- one participant-level or room-level recording artifact per session
- playback on recruiter detail page
- later: deep timestamp sync between transcript and replay

## Recruiter AI Chat Guidance

This feature should be grounded, not generative-first.

Recommended retrieval scope:

- transcript segments
- evidence rows
- report summary
- recruiter notes

### Answer Rules

- cite evidence
- admit uncertainty
- never invent candidate behavior
- distinguish direct quote vs summary

## Better LiveKit Frontend Pattern

For advanced control, move toward `RoomContext.Provider`.

Why:

- explicit room lifecycle
- better reconnect handling
- easier publish timing control
- cleaner control over when audio and video are enabled

Short version:

- `PreJoin` is still good
- prefabs and hooks are still good
- but we should keep room lifecycle product-owned where reliability matters

## Best Near-Term Technical Moves

1. split Convex modules by domain
2. add candidate eligibility and evidence tables
3. define search indexes for transcript and notes
4. wire recording artifact records
5. implement recruiter detail query as a single normalized read model
6. keep AI chat grounded on persisted artifacts only

## Rules Of Thumb

- LiveKit for realtime media and recording
- Convex for product truth and reactive reads
- Inngest for post-call pipelines
- Next.js routes as thin provider boundaries
- child tables for high-churn or unbounded data
- indexes only for real screens and hot paths
- recruiter trust over AI theatrics
