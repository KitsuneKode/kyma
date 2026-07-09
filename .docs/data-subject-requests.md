# Data Subject Requests (GDPR / privacy ops)

Manual intake + automated Convex fulfillment jobs.

Code:

- Scaffold: `lib/compliance/data-subject-requests.ts`
- Export: `internal.compliance.exportSubjectData`
- Delete/anonymize: `internal.compliance.deleteSubjectData`

## Intake

1. Verify the requester’s identity (email match to Clerk user, org admin attestation, or signed legal request).
2. Record the request type: **export**, **delete**, or **rectify**.
3. Note whether the subject is a **candidate** (interview participant) or **recruiter/admin** (workspace user).
4. Prefer written confirmation of scope (all orgs vs one employer workspace).
5. Assign a `requestId` (UUID) and keep it in the ops ticket.

## Automated export

```bash
npx convex run compliance:exportSubjectData \
  '{"orgId":"<clerk_org_id>","subjectEmail":"candidate@example.com","requestId":"<uuid>"}'
```

Optional: pass `subjectUserId` (Convex `users` id) instead of/in addition to email.

The package includes invite metadata (no invite tokens), session metadata, transcript text, and report summaries. Media files in object storage must still be collected separately when retained.

## Automated delete / anonymize

```bash
npx convex run compliance:deleteSubjectData \
  '{"orgId":"<clerk_org_id>","subjectEmail":"candidate@example.com","requestId":"<uuid>","actorId":"<ops_user>"}'
```

The job deletes session-scoped artifacts in batches and anonymizes invite/eligibility PII. It writes `data_subject.delete.completed` to `auditEvents` without storing the subject email.

Also remove or anonymize:

- Clerk user profile when appropriate
- LiveKit / S3 recording objects referenced by `recordingArtifacts`

## Locate records (current Convex schema)

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

## Rectify

Update incorrect profile fields in Clerk/`users` and any denormalized email fields on invites/eligibility. Do not silently rewrite assessment scores; note corrections in recruiter review notes if scores were based on wrong identity metadata.

## Future automation

- Public/admin intake API that creates a DSR ticket then schedules these jobs
- Per-org retention policies on `recordingArtifacts` and transcripts
- Entitlements/billing do not change DSR obligations; paid plans still require the same fulfillment path
