# Data Subject Requests (GDPR / privacy ops)

Manual runbook for export and deletion requests until automated tooling ships.
Code scaffold: `lib/compliance/data-subject-requests.ts`.

## Intake

1. Verify the requester’s identity (email match to Clerk user, org admin attestation, or signed legal request).
2. Record the request type: **export**, **delete**, or **rectify**.
3. Note whether the subject is a **candidate** (interview participant) or **recruiter/admin** (workspace user).
4. Prefer written confirmation of scope (all orgs vs one employer workspace).

## Locate records (current Convex schema)

Use Clerk ids and emails as join keys. Primary tables:

| Area               | Tables / indexes                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Identity           | `users` (`by_clerk_id`, `by_email`)                                                                                            |
| Org membership     | `orgMemberships` (`by_clerk_user_id`, `by_clerk_org_id`)                                                                       |
| Invites            | `candidateInvites` (`by_candidate_email`, `by_user`)                                                                           |
| Sessions           | `interviewSessions` (`by_candidate_user`, `by_invite`, `by_org_id`)                                                            |
| Transcripts        | `transcriptSegments` (`by_session`)                                                                                            |
| Recordings         | `recordingArtifacts` (`by_session`, `by_org_id`) — also remove object storage objects referenced by `location` / `artifactKey` |
| Reports & evidence | `assessmentReports`, `dimensionEvidence`, `visualObservations` (`by_session`)                                                  |
| Recruiter review   | `reviewDecisions`, `recruiterNotes`, `reportChatMessages` (`by_session`)                                                       |
| Candidate portal   | `candidatePreferences`, `candidateReadinessRuns` (`by_candidate_user`)                                                         |
| Eligibility        | `candidateEligibility` (org-scoped candidate rows)                                                                             |
| Audit              | `auditEvents` (retain as needed for legal hold; redact PII where policy allows)                                                |

Also check **Clerk** (user profile) and any **LiveKit / S3** recording buckets outside Convex.

## Export (manual)

1. Collect user profile fields from `users` + Clerk.
2. For each related `interviewSessions` row, export:
   - session metadata
   - final transcript segments
   - assessment report summaries and dimension evidence
   - recording artifact metadata (and media files if retained)
3. Package as JSON (+ media zip if recordings exist). Do not include other candidates’ data from shared org views.
4. Deliver over a secure channel; log fulfillment date and operator.

## Delete (manual)

1. Confirm no legal hold / ongoing dispute for the org.
2. Delete or anonymize in dependency order where possible:
   - chat/notes/evidence/report rows for the subject’s sessions
   - transcript segments and recording artifacts (+ storage objects)
   - session events and session rows
   - invites and eligibility rows keyed by the subject email/user
   - candidate preferences / readiness runs
   - finally the `users` row if no remaining memberships require it
3. Remove or anonymize the Clerk user when appropriate.
4. Retain minimal audit proof that deletion occurred (request id, timestamp, operator) without keeping the deleted content.

## Rectify

Update incorrect profile fields in Clerk/`users` and any denormalized email fields on invites/eligibility. Do not silently rewrite assessment scores; note corrections in recruiter review notes if scores were based on wrong identity metadata.

## Future automation

- Server intake API + Convex export/delete jobs
- Per-org retention policies on `recordingArtifacts` and transcripts
- Entitlements/billing do not change DSR obligations; paid plans still require the same fulfillment path
