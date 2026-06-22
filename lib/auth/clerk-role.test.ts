import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  preferredWorkspaceFromSessionClaims,
  resolveRecruiterAccess,
} from '@/lib/auth/clerk-role'

const fixtures = JSON.parse(
  readFileSync(
    join(process.cwd(), '.docs/fixtures/auth-org-rbac-fixtures.json'),
    'utf8'
  )
) as {
  preferredWorkspaceMetadata: Record<string, { preferredWorkspace: string }>
  jwtClaimFixtures: Record<string, Record<string, unknown>>
}

describe('preferredWorkspaceFromSessionClaims', () => {
  it('reads candidate from preferredWorkspace metadata', () => {
    expect(
      preferredWorkspaceFromSessionClaims({
        metadata: fixtures.preferredWorkspaceMetadata.candidate,
      })
    ).toBe('candidate')
  })

  it('reads recruiter from preferredWorkspace metadata', () => {
    expect(
      preferredWorkspaceFromSessionClaims({
        metadata: fixtures.preferredWorkspaceMetadata.recruiter,
      })
    ).toBe('recruiter')
  })

  it('ignores legacy persona-only metadata', () => {
    const claims = fixtures.jwtClaimFixtures.candidateOnly
    expect(preferredWorkspaceFromSessionClaims(claims)).toBeNull()
  })

  it('prefers preferredWorkspace over other metadata', () => {
    expect(
      preferredWorkspaceFromSessionClaims({
        metadata: {
          preferredWorkspace: 'candidate',
          persona: 'recruiter',
        },
      })
    ).toBe('candidate')
  })
})

describe('resolveRecruiterAccess', () => {
  it('denies access without org', () => {
    expect(
      resolveRecruiterAccess({
        orgId: null,
        has: () => true,
      })
    ).toEqual({ canAccessRecruiter: false, isOrgAdmin: false })
  })

  it('grants admin access via org:admin role', () => {
    expect(
      resolveRecruiterAccess({
        orgId: 'org_1',
        has: (check) => check.role === 'org:admin',
      })
    ).toEqual({ canAccessRecruiter: true, isOrgAdmin: true })
  })

  it('grants member access via recruiter:access permission', () => {
    expect(
      resolveRecruiterAccess({
        orgId: 'org_1',
        has: (check) => check.permission === 'org:recruiter:access',
      })
    ).toEqual({ canAccessRecruiter: true, isOrgAdmin: false })
  })
})
