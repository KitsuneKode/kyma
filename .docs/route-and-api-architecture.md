# Route and API architecture (ADR)

Canonical v1 map. Change this document only when intentionally changing boundaries.

## Route Groups

The App Router is split into layout shells:

- `(marketing)`: public product/landing experience
- `(auth)`: Clerk-hosted sign-in/sign-up pages
- `(app)`: authenticated candidate surfaces + recruiter org setup (no sidebar)
- `(admin)`: recruiter workspace shell (sidebar, org switcher, `requireRecruiterPageAccess`)

## App Router pages

| Path                                       | Audience                          | Purpose                                                                    |
| ------------------------------------------ | --------------------------------- | -------------------------------------------------------------------------- |
| `/`                                        | Public                            | Landing / entry (stays public when signed in)                              |
| `/for`                                     | Public                            | Solutions hub for persona SEO landing pages                                |
| `/for/[slug]`                              | Public                            | Audience-specific SEO landing pages (education teams, recruiters, etc.)    |
| `/sign-in`, `/sign-up`                     | Public unauthenticated            | Clerk auth (general)                                                       |
| `/sign-in/candidate`, `/sign-up/candidate` | Public unauthenticated            | Candidate-focused auth copy + redirect intent                              |
| `/sign-in/recruiter`, `/sign-up/recruiter` | Public unauthenticated            | Recruiter-focused auth copy + redirect intent                              |
| `/auth/continue`                           | Signed-in                         | Internal redirect resolver; persists `preferredWorkspace` then redirects   |
| `/onboarding`                              | Signed-in                         | Legacy — redirects to `/auth/continue`                                     |
| `/onboarding/recruiter`                    | Signed-in                         | Legacy — redirects to `/recruiter/setup`                                   |
| `/recruiter/setup`                         | Signed-in                         | Clerk org create/join wizard (no recruiter permission required yet)        |
| `/join/[orgId]`                            | Signed-in                         | Accept Clerk org invitation and activate org                               |
| `/i/[token]`                               | Candidate                         | Short invite alias → same renderer as `/interviews/[inviteId]`             |
| `/interviews`                              | Deprecated                        | Hard cut legacy surface, resolves to 404                                   |
| `/interviews/[inviteId]`                   | Candidate                         | Primary invite-first interview entry (auth required for screening invites) |
| `/candidate`                               | Candidate signed-in               | Portal overview; mock interview entry                                      |
| `/candidate/interviews`                    | Candidate signed-in               | Interview history/list                                                     |
| `/candidate/interviews/[id]`               | Candidate signed-in               | Interview detail (shows `weightedScore` when released)                     |
| `/candidate/readiness`                     | Candidate signed-in               | Device and readiness checks                                                |
| `/candidate/profile`                       | Candidate signed-in               | Identity and interview preferences                                         |
| `/recruiter`                               | Recruiter (org + permission)      | Primary recruiter hub (canonical)                                          |
| `/recruiter/candidates`                    | Recruiter                         | Review queue                                                               |
| `/recruiter/candidates/[sessionId]`        | Recruiter                         | Session detail, report, chat                                               |
| `/recruiter/screenings`                    | Recruiter                         | Batch list                                                                 |
| `/recruiter/screenings/new`                | Recruiter                         | Create batch + policy                                                      |
| `/recruiter/screenings/[batchId]`          | Recruiter                         | Batch + invites (share `/i/[token]` links)                                 |
| `/recruiter/templates`                     | Recruiter                         | Screening template library ("interview agents")                            |
| `/recruiter/templates/new`                 | Recruiter                         | Create template (default rubric seeded)                                    |
| `/recruiter/templates/[id]/edit`           | Recruiter                         | Edit template + rubric                                                     |
| `/recruiter/settings`                      | Recruiter admin                   | Workspace settings, BYOK, team invites                                     |
| `/admin/*` (legacy)                        | —                                 | Middleware redirects to `/recruiter/*`                                     |
| `/write-up`                                | Recruiter (Clerk when configured) | Repository write-up reader                                                 |

Recruiter workspace pages live under `app/(admin)/recruiter/*`. Org setup lives under `app/(app)/recruiter/setup` to avoid the recruiter sidebar guard.

## Next Route Handlers (vendor hosts only)

| Route          | Role                                                        |
| -------------- | ----------------------------------------------------------- |
| `/api/inngest` | Inngest serve (durable post-call assessment worker on Next) |

Interview bootstrap, report chat, LiveKit webhooks, and Clerk webhooks are **Convex-owned** (actions / `httpAction`). Do not reintroduce parallel Next `/api/*` product routes for those flows.

## Convex HTTP + actions

| Surface                                                  | Role                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| `interviews.bootstrapActions.bootstrapInterviewSession`  | Public bootstrap + LiveKit token (`useAction`)                      |
| `interviews.bootstrapActions.requeueInterviewProcessing` | Ops recovery for sessions already in `processing`                   |
| `recruiter.reportChat.askReportChat`                     | Clerk-authenticated grounded recruiter copilot (`useAction`)        |
| `POST {CONVEX_SITE_URL}/livekit/webhook`                 | Signature-validated LiveKit webhooks → `livekit.ingestWebhookEvent` |
| `POST {CONVEX_SITE_URL}/webhooks/clerk`                  | Signature-validated Clerk webhooks → user/org sync mutations        |

`CONVEX_SITE_URL` is the Convex HTTP actions host (Dashboard → Settings → URL, or `NEXT_PUBLIC_CONVEX_SITE_URL`).

## Convex vs client

- **Product state** lives in Convex (sessions, invites, transcript, reports).
- **Client I/O** prefers `useQuery` / `useMutation` / `useAction`. Avoid `fetch('/api/...')` for product flows.
- **Convex bundling:** do not import shared TS via the Next.js `@/` alias from `convex/*`. Use relative imports such as `../lib/...` for pure shared modules.
- **Candidate browser writes** for session state (`live`, `interrupted`, `processing`) are owned by webhooks/agent — not the browser.
- **Transcript writes** are agent-authoritative; browser `TranscriptionReceived` is UI-only.
- **Server-origin writes** use internal mutations (`appendSessionEventInternal`, `ingestWebhookEvent`, `processingPipeline`) for webhook/agent/processing paths.

## Access policy

- Recruiter shell routes (`/recruiter/*` except `/recruiter/setup`) require Clerk auth + active org + `org:recruiter:access` or `org:admin` when Clerk is configured.
- `/recruiter/setup` and `/join/*` require sign-in only.
- Auth routes (`/sign-in*`, `/sign-up*`) redirect signed-in users via `resolveAppRoute`.
- Invite routes (`/i/*`, `/interviews/[inviteId]`) are public at the middleware layer; screening invites require auth + auto-claim at the page layer. Mock interviews are auth-gated from `/candidate`.
- Candidate portal routes (`/candidate/*`) require sign-in only.

Access resolution: `resolveRecruiterAccess({ orgId, has })` in [`lib/auth/clerk-role.ts`](../lib/auth/clerk-role.ts).

## Post-login routing

Signed-in users are not auto-redirected away from `/` (marketing stays reachable). Middleware delegates to `resolveAppRoute` in [`lib/auth/routing.ts`](../lib/auth/routing.ts).

| Entry                  | URL                  | After auth                                                                |
| ---------------------- | -------------------- | ------------------------------------------------------------------------- |
| Candidate sign-in      | `/sign-in/candidate` | `/auth/continue?workspace=candidate` → `/candidate`                       |
| Candidate sign-up      | `/sign-up/candidate` | `/auth/continue?workspace=candidate` → `/candidate`                       |
| Recruiter sign-in      | `/sign-in/recruiter` | `/auth/continue?workspace=recruiter` → `/recruiter` or `/recruiter/setup` |
| Recruiter sign-up      | `/sign-up/recruiter` | same as recruiter sign-in                                                 |
| General sign-in        | `/sign-in`           | `/auth/continue` when preference unset                                    |
| Signed-in visit to `/` | `/`                  | No redirect (marketing homepage)                                          |

`preferredWorkspace` is routing-only; recruiter authorization still requires org context via Clerk JWT.

Marketing CTAs use path-based auth URLs via [`lib/auth/workspace-intent.ts`](../lib/auth/workspace-intent.ts) (`signInPath`, `signUpPath`).

## Rate limits

Bootstrap, processing recovery, and report-chat rate limits run inside Convex actions via `@convex-dev/rate-limiter` (`convex/rateLimiter.ts`). The Next helper `lib/http/server-rate-limit.ts` remains for any residual Next-hosted surfaces that need a trusted-server check.

## Local integration verification (non-mock)

Against a live local Convex deployment + Inngest event sink:

```bash
bun run test:convex-integration
```

This seeds real invite/session rows, calls `bootstrapInterviewSession` (LiveKit JWT mint), POSTs cryptographically signed LiveKit + Clerk webhooks to `{CONVEX_SITE_URL}`, and exercises `requeueInterviewProcessing` enqueue against a local Inngest sink on `:8799`.
