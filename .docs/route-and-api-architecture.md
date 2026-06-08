# Route and API architecture (ADR)

Canonical v1 map. Change this document only when intentionally changing boundaries.

## Route Groups

The App Router is split into three layout shells:

- `(marketing)`: public product/landing experience
- `(auth)`: Clerk-hosted sign-in/sign-up pages
- `(app)`: authenticated operator surfaces

## App Router pages

| Path                                       | Audience                          | Purpose                                                                       |
| ------------------------------------------ | --------------------------------- | ----------------------------------------------------------------------------- |
| `/`                                        | Public                            | Landing / entry                                                               |
| `/sign-in`, `/sign-up`                     | Public unauthenticated            | Clerk auth (general)                                                          |
| `/sign-in/candidate`, `/sign-up/candidate` | Public unauthenticated            | Candidate-focused auth copy + redirect intent                                 |
| `/sign-in/recruiter`, `/sign-up/recruiter` | Public unauthenticated            | Recruiter-focused auth copy + redirect intent                                 |
| `/auth/continue`                           | Signed-in                         | Persist workspace preference after Clerk redirect                             |
| `/onboarding`                              | Signed-in                         | Optional workspace picker (not a hard gate)                                   |
| `/onboarding/recruiter`                    | Signed-in                         | Clerk org create/join for recruiter workspace                                 |
| `/interviews`                              | Deprecated                        | Hard cut legacy surface, resolves to 404                                      |
| `/interviews/[inviteId]`                   | Candidate                         | Primary invite-first interview entry (`demo-invite` is dev token in dev mode) |
| `/candidate`                               | Candidate signed-in               | Secondary portal overview                                                     |
| `/candidate/interviews`                    | Candidate signed-in               | Interview history/list                                                        |
| `/candidate/interviews/[id]`               | Candidate signed-in               | Interview detail                                                              |
| `/candidate/readiness`                     | Candidate signed-in               | Device and readiness checks                                                   |
| `/candidate/profile`                       | Candidate signed-in               | Identity and interview preferences                                            |
| `/recruiter`                               | Recruiter (org + permission)      | Primary recruiter hub (canonical)                                             |
| `/recruiter/candidates`                    | Recruiter                         | Review queue                                                                  |
| `/recruiter/candidates/[sessionId]`        | Recruiter                         | Session detail, report, chat                                                  |
| `/recruiter/screenings`                    | Recruiter                         | Batch list                                                                    |
| `/recruiter/screenings/new`                | Recruiter                         | Create batch + policy                                                         |
| `/recruiter/screenings/[batchId]`          | Recruiter                         | Batch + invites                                                               |
| `/recruiter/templates`                     | Recruiter                         | Screening template library                                                    |
| `/recruiter/templates/new`                 | Recruiter                         | Create template                                                               |
| `/recruiter/templates/[id]/edit`           | Recruiter                         | Edit template                                                                 |
| `/admin/*` (legacy)                        | —                                 | Resolves to 404; use `/recruiter/*`                                           |
| `/video-demo`                              | Recruiter (Clerk when configured) | Product demo helper page                                                      |
| `/write-up`                                | Recruiter (Clerk when configured) | Repository write-up reader                                                    |

`/recruiter/*` re-exports live under `app/(admin)/admin/*` implementations. Update this ADR when adding new recruiter routes.

## Next Route Handlers (secrets, vendors)

| Route                        | Role                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `/api/interviews/bootstrap`  | Convex bootstrap + LiveKit token path                                          |
| `/api/interviews/process`    | Post-call processing (Inngest or inline); optional `KYMA_PROCESSING_WRITE_KEY` |
| `/api/livekit/token`         | LiveKit participant token                                                      |
| `/api/livekit/webhook`       | Signature-validated LiveKit webhooks → Convex                                  |
| `/api/inngest`               | Inngest serve                                                                  |
| `/api/recruiter/report-chat` | Clerk-authenticated copilot                                                    |

## Convex vs client

- **Product state** lives in Convex (sessions, invites, transcript, reports).
- **Convex bundling:** do not import shared TS via the Next.js `@/` alias from `convex/*`. Use relative imports such as `../lib/...` for pure shared modules.
- **Candidate browser writes** (`appendSessionEvent`, `upsertTranscriptSegment`) require both `sessionId` and `inviteToken` capability checks. Throttles still apply per session in Convex.
- **Server-origin writes** use internal mutations (`appendSessionEventInternal`, `ingestWebhookEvent`) for webhook/agent/processing paths to avoid permissive public write surfaces.

## Access policy

- Protected shell routes (`/admin*`, `/video-demo`, `/write-up`) require Clerk auth when Clerk credentials are configured.
- Auth routes (`/sign-in*`, `/sign-up*`) redirect signed-in users via workspace routing (`/auth/continue` when preference unset).
- Candidate invite route (`/interviews/[inviteId]`) stays public by design and enforces invite token rules at the data layer.
- Candidate portal routes (`/candidate/*`) require sign-in only; recruiter authorization is org-scoped on `/admin*` routes.

## Post-login routing

Signed-in users should never remain stuck on the marketing homepage (`/`). Middleware delegates to `resolveAppRoute` in [`lib/auth/routing.ts`](../lib/auth/routing.ts), which sends `/` to the workspace home based on `preferredWorkspace` in Clerk session metadata.

| Entry                  | URL                  | After auth                                                                     |
| ---------------------- | -------------------- | ------------------------------------------------------------------------------ |
| Candidate sign-in      | `/sign-in/candidate` | `/auth/continue?workspace=candidate` → `/candidate`                            |
| Candidate sign-up      | `/sign-up/candidate` | `/auth/continue?workspace=candidate` → `/candidate`                            |
| Recruiter sign-in      | `/sign-in/recruiter` | `/auth/continue?workspace=recruiter` → `/recruiter` or `/onboarding/recruiter` |
| Recruiter sign-up      | `/sign-up/recruiter` | same as recruiter sign-in                                                      |
| General sign-in        | `/sign-in`           | `/auth/continue` (defaults to candidate) when preference unset                 |
| Signed-in visit to `/` | `/`                  | `/candidate`, `/recruiter`, `/onboarding/recruiter`, or `/auth/continue`       |

Explicit workspace intent in `/auth/continue?workspace=` overrides a stale stored preference for that sign-in flow. `preferredWorkspace` is routing-only; recruiter authorization still requires org context.

Marketing CTAs use path-based auth URLs via [`lib/auth/workspace-intent.ts`](../lib/auth/workspace-intent.ts) (`signInPath`, `signUpPath`).

## Rate limits (HTTP)

Shared helper: `lib/http/rate-limit.ts` — used by bootstrap and report-chat routes (in-memory buckets; replace with Redis/Upstash in production if needed).
