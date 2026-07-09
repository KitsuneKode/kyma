/**
 * GDPR / data-subject request helpers (scaffold).
 *
 * Full automated export/delete is not implemented yet. Ops follow the runbook:
 * `.docs/data-subject-requests.md`
 *
 * Future work:
 * - Convex action/mutation to assemble a subject export package
 * - Soft-delete + retention purge jobs for interview artifacts
 * - Audit trail entries for each fulfilled request
 */

export type DataSubjectRequestKind = 'export' | 'delete' | 'rectify'

export type DataSubjectRequestStub = {
  kind: DataSubjectRequestKind
  /** Clerk user id or candidate email used to locate records */
  subjectKey: string
  requestedAt: string
  status: 'manual_ops_required'
  runbookPath: '.docs/data-subject-requests.md'
}

/**
 * Acknowledge a DSR without performing automated export/delete.
 * Use this as the integration point once a public/admin intake exists.
 */
export function acknowledgeDataSubjectRequest(input: {
  kind: DataSubjectRequestKind
  subjectKey: string
  requestedAt?: string
}): DataSubjectRequestStub {
  return {
    kind: input.kind,
    subjectKey: input.subjectKey.trim(),
    requestedAt: input.requestedAt ?? new Date().toISOString(),
    status: 'manual_ops_required',
    runbookPath: '.docs/data-subject-requests.md',
  }
}
