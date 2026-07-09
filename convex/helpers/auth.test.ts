import { describe, expect, it } from 'vitest'

import { mustFailClosedWithoutClerk } from '../../lib/auth/clerk-fail-closed'
import { RECRUITER_PERMISSION_MAP } from './auth'

describe('Convex recruiter permission map', () => {
  it('uses exact Clerk custom permission names for capability guards', () => {
    expect(RECRUITER_PERMISSION_MAP).toStrictEqual({
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

describe('Convex recruiter auth fail-closed policy', () => {
  it('requires fail-closed when Clerk is unset in production', () => {
    // Mirrors requireIdentity in auth.ts: missing Clerk + production => throw.
    expect(
      mustFailClosedWithoutClerk({ hasClerk: false, isProduction: true })
    ).toBe(true)
  })

  it('allows null-identity bypass only outside production', () => {
    expect(
      mustFailClosedWithoutClerk({ hasClerk: false, isProduction: false })
    ).toBe(false)
  })
})
