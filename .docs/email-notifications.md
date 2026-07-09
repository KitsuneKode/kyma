# Email Notifications

Transactional product email for candidate invites (and future report-ready mail).

**Wired:** screening create + batch detail “Send / resend invite emails” call
`lib/recruiter/send-batch-invite-emails.ts` → `sendEmail`.

## Module layout

| Path                                        | Role                                               |
| ------------------------------------------- | -------------------------------------------------- |
| `lib/email/types.ts`                        | Payload types (`candidate_invite`, `report_ready`) |
| `lib/email/send.ts`                         | `sendEmail` entrypoint + provider selection        |
| `lib/email/resend.ts`                       | Fetch-based Resend adapter (no SDK dependency)     |
| `lib/email/index.ts`                        | Public re-exports                                  |
| `lib/recruiter/send-batch-invite-emails.ts` | Server action: send for a screening batch          |

## Provider behavior

| Condition                                         | Behavior                                                        |
| ------------------------------------------------- | --------------------------------------------------------------- |
| `RESEND_API_KEY` unset, `NODE_ENV !== production` | Logs payload via `console.info` (`provider: 'log'`)             |
| `RESEND_API_KEY` unset, production                | Soft no-op with `console.warn` (`provider: 'noop'`, `ok: true`) |
| `RESEND_API_KEY` set                              | POST `https://api.resend.com/emails` (`provider: 'resend'`)     |

Optional `EMAIL_FROM` overrides the From header. Default:

```text
Kyma <noreply@kyma.kitsunelabs.xyz>
```

Verify the domain in Resend before enabling production sends.

Delivery status is stored on `candidateInvites` (`emailDeliveryStatus`, `emailSentAt`, …) and summarized on `/recruiter/health`.

## Env keys

Add to Vercel / `.env.local` (also listed in `.env.example`):

- `RESEND_API_KEY` — optional until email is product-critical
- `EMAIL_FROM` — optional From override
- `NEXT_PUBLIC_APP_URL` — absolute invite link base

Schema: `lib/env/shared.ts` → `serverEnv`.

## Payload shapes

### Candidate invite

```ts
await sendEmail({
  kind: 'candidate_invite',
  to: 'candidate@example.com',
  inviteUrl: 'https://kyma.kitsunelabs.xyz/i/<token>',
  workspaceName: 'Acme Tutoring',
  candidateName: 'Alex',
  roleTitle: 'Math Tutor',
  expiresAt: '2026-07-15T00:00:00.000Z', // optional
})
```

### Report ready

```ts
await sendEmail({
  kind: 'report_ready',
  to: 'recruiter@example.com',
  reportUrl: 'https://kyma.kitsunelabs.xyz/recruiter/sessions/<id>',
  workspaceName: 'Acme Tutoring',
  candidateName: 'Alex',
  sessionId: '<convex session id>',
  recruiterName: 'Sam', // optional
})
```

## Planned call sites (not implemented here)

1. After recruiter creates / sends a screening invite → `candidate_invite`
2. After assessment report is ready for review → `report_ready`

Prefer enqueueing via Inngest for retries once delivery is product-critical.
Treat `ok: false` as soft failure unless the UX requires confirmed delivery.

## Security notes

- Never log full invite tokens in production email logs beyond what `sendEmail` already redacts by logging structured fields only in the no-key path.
- Keep `RESEND_API_KEY` server-only (never `NEXT_PUBLIC_*`).
- Prefer verified domains; do not send from personal addresses in production.
