import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  RECRUITER_PERMISSION_MAP,
  clerkHasCapability,
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

describe('clerkHasCapability', () => {
  it('grants every recruiter capability to org admins', () => {
    expect(
      clerkHasCapability(
        (check) => check.role === 'org:admin',
        'recruiter:templates:write'
      )
    ).toBe(true)
  })

  it('requires exact custom permission for non-admin users', () => {
    expect(
      clerkHasCapability(
        (check) => check.permission === 'org:recruiter:candidates:write',
        'recruiter:candidates:write'
      )
    ).toBe(true)
    expect(
      clerkHasCapability(
        (check) => check.permission === 'org:recruiter:candidates:read',
        'recruiter:candidates:write'
      )
    ).toBe(false)
  })

  it('keeps the permission map aligned with Clerk custom permission names', () => {
    expect(RECRUITER_PERMISSION_MAP).toMatchObject({
      'recruiter:access': 'org:recruiter:access',
      'recruiter:candidates:read': 'org:recruiter:candidates:read',
      'recruiter:candidates:write': 'org:recruiter:candidates:write',
      'recruiter:screenings:write': 'org:recruiter:screenings:write',
      'recruiter:templates:write': 'org:recruiter:templates:write',
      'recruiter:settings:write': 'org:recruiter:settings:write',
      'recruiter:billing:write': 'org:recruiter:billing:write',
    })
  })
})
