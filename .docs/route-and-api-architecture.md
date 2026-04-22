# Route and API architecture (ADR)

Canonical v1 map. Change this document only when intentionally changing boundaries.

## Route Groups

The App Router is split into three layout shells:

- `(marketing)`: public product/landing experience
- `(auth)`: Clerk-hosted sign-in/sign-up pages
- `(app)`: authenticated operator surfaces

## App Router pages

| Path                            | Audience                          | Purpose                                          |
| ------------------------------- | --------------------------------- | ------------------------------------------------ |
| `/`                             | Public                            | Landing / entry                                  |
| `/sign-in`                      | Public unauthenticated            | Clerk sign in surface                            |
| `/sign-up`                      | Public unauthenticated            | Clerk sign up surface                            |
| `/interviews/[inviteId]`        | Candidate                         | Only interview entry; `demo-invite` is dev token |
| `/admin`                        | Recruiter (Clerk when configured) | Hub                                              |
| `/admin/candidates`             | Recruiter                         | Review queue                                     |
| `/admin/candidates/[sessionId]` | Recruiter                         | Session detail, report, chat                     |
| `/admin/screenings`             | Recruiter                         | Batch list                                       |
| `/admin/screenings/new`         | Recruiter                         | Create batch + policy                            |
| `/admin/screenings/[batchId]`   | Recruiter                         | Batch + invites                                  |
| `/video-demo`                   | Recruiter (Clerk when configured) | Product demo helper page                         |
| `/write-up`                     | Recruiter (Clerk when configured) | Repository write-up reader                       |

Do not add `/recruiter/*` aliases in v1 without updating this ADR.

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
- **Public candidate mutations** (`appendSessionEvent`, `upsertTranscriptSegment`) are callable from the browser; HTTP rate limits alone are insufficient. **Convex-side throttles** apply per session (see `convex/interviews.ts`).

## Access policy

- Protected shell routes (`/admin*`, `/video-demo`, `/write-up`) require Clerk auth when Clerk credentials are configured.
- Auth routes (`/sign-in*`, `/sign-up*`) redirect signed-in users to `/admin`.
- Candidate invite route (`/interviews/[inviteId]`) stays public by design and enforces invite token rules at the data layer.

## Rate limits (HTTP)

Shared helper: `lib/http/rate-limit.ts` — used by bootstrap and report-chat routes (in-memory buckets; replace with Redis/Upstash in production if needed).
