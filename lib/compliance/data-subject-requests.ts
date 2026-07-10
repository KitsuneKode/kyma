/**
 * GDPR / data-subject request helpers.
 *
 * Automated Convex jobs:
 * - `internal.compliance.exportSubjectData`
 * - `internal.compliance.deleteSubjectData`
 *
 * Ops still follow `.docs/data-subject-requests.md` for intake and identity verification.
 */

export type DataSubjectRequestKind = 'export' | 'delete' | 'rectify'

export type DataSubjectRequestStub = {
  kind: DataSubjectRequestKind
  /** Clerk user id or candidate email used to locate records */
  subjectKey: string
  requestedAt: string
  status: 'manual_ops_required' | 'automation_available'
  runbookPath: '.docs/data-subject-requests.md'
  exportFn?: 'internal.compliance.exportSubjectData'
  deleteFn?: 'internal.compliance.deleteSubjectData'
}

/**
 * Acknowledge a DSR and point operators at the automated Convex jobs when ready.
 */
export function acknowledgeDataSubjectRequest(input: {
  kind: DataSubjectRequestKind
  subjectKey: string
  requestedAt?: string
}): DataSubjectRequestStub {
  const base = {
    kind: input.kind,
    subjectKey: input.subjectKey.trim(),
    requestedAt: input.requestedAt ?? new Date().toISOString(),
    runbookPath: '.docs/data-subject-requests.md' as const,
  }

  if (input.kind === 'export') {
    return {
      ...base,
      status: 'automation_available' as const,
      exportFn: 'internal.compliance.exportSubjectData' as const,
    }
  }

  if (input.kind === 'delete') {
    return {
      ...base,
      status: 'automation_available' as const,
      deleteFn: 'internal.compliance.deleteSubjectData' as const,
    }
  }

  return {
    ...base,
    status: 'manual_ops_required' as const,
  }
}
